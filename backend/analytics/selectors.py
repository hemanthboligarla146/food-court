from django.db.models import Count, Sum, Q, Avg
from django.db.models.functions import ExtractHour, ExtractWeekDay, TruncDate
from django.contrib.auth import get_user_model
from django.utils import timezone

from orders.models import Order, OrderItem
from foods.models import Food, Category
from .models import AnalyticsSession, AnalyticsEvent
from .utils import filter_by_period, get_period_dates

User = get_user_model()


def get_dashboard_stats(period='daily'):
    now = timezone.now()
    start_date, current_start, prev_start = get_period_dates(period)

    # ------------------------------------------------------------------
    # 1. USER METRICS (PostgreSQL)
    # ------------------------------------------------------------------
    # Total customers registered overall (excluding admins/staff)
    total_users = User.objects.filter(is_staff=False, is_superuser=False).count()
    
    # New users registered in this period
    new_users_qs = filter_by_period(User.objects.filter(is_staff=False, is_superuser=False), 'date_joined', period, True)
    new_users = new_users_qs.count()

    # Returning Users: Logged-in users who have more than 1 session overall and were active in this period
    returning_users = (
        AnalyticsSession.objects
        .filter(started_at__gte=current_start, user__isnull=False)
        .values('user')
        .annotate(session_count=Count('id'))
        .filter(session_count__gt=1)
        .count()
    )

    # ------------------------------------------------------------------
    # 2. ORDER METRICS (PostgreSQL)
    # ------------------------------------------------------------------
    current_orders_qs = filter_by_period(Order.objects.all(), 'created_at', period, True)

    completed_orders  = current_orders_qs.filter(status='Completed').count()
    cancelled_orders  = current_orders_qs.filter(status='Cancelled').count()
    processing_orders = current_orders_qs.filter(status='Processing').count()
    pending_orders    = current_orders_qs.filter(status='Pending').count()
    total_orders      = current_orders_qs.count()

    # Enforce Completed + Pending + Cancelled + Processing = Total Orders
    # If there's any discrepancy, adjust total
    total_orders = completed_orders + pending_orders + cancelled_orders + processing_orders

    # Revenue: sum of Completed orders
    revenue = current_orders_qs.filter(status='Completed').aggregate(
        s=Sum('total_amount')
    )['s'] or 0.0

    # ------------------------------------------------------------------
    # 3. WEBSITE VISITORS (Unique Sessions in period)
    # ------------------------------------------------------------------
    visitors = AnalyticsSession.objects.filter(started_at__gte=current_start).count()

    # ------------------------------------------------------------------
    # 4. FUNNEL ANALYSIS (Naturally Decreasing Step Count)
    # ------------------------------------------------------------------
    # Funnel Definition:
    # 1. Website Visitor (session_start)
    # 2. Login (user_login)
    # 3. Home (page_view with path='/')
    # 4. Menu (menu_visit / page_view with path='/menu')
    # 5. Category (category_click)
    # 6. Food Details (food_view)
    # 7. Add To Cart (add_to_cart)
    # 8. Checkout (checkout_start)
    # 9. Payment (payment_success / payment_attempt)
    # 10. Completed Order (Postgres orders)

    ev_qs = AnalyticsEvent.objects.filter(created_at__gte=current_start)

    # Step 1: Website Visitor
    f1_visitors = AnalyticsSession.objects.filter(started_at__gte=current_start).count()
    # Step 2: Login
    f2_logins = ev_qs.filter(event_type=AnalyticsEvent.EV_USER_LOGIN).values('session_id').distinct().count()
    # Step 3: Home
    f3_homes = ev_qs.filter(event_type=AnalyticsEvent.EV_PAGE_VIEW, page_path='/').values('session_id').distinct().count()
    # Step 4: Menu
    f4_menus = ev_qs.filter(Q(event_type=AnalyticsEvent.EV_MENU_VISIT) | Q(event_type=AnalyticsEvent.EV_PAGE_VIEW, page_path='/menu')).values('session_id').distinct().count()
    # Step 5: Category
    f5_cats = ev_qs.filter(event_type=AnalyticsEvent.EV_CATEGORY_CLICK).values('session_id').distinct().count()
    # Step 6: Food Details
    f6_details = ev_qs.filter(event_type=AnalyticsEvent.EV_FOOD_VIEW).values('session_id').distinct().count()
    # Step 7: Add to Cart
    f7_adds = ev_qs.filter(event_type=AnalyticsEvent.EV_ADD_TO_CART).values('session_id').distinct().count()
    # Step 8: Checkout
    f8_checkouts = ev_qs.filter(event_type=AnalyticsEvent.EV_CHECKOUT_START).values('session_id').distinct().count()
    # Step 9: Payment
    f9_payments = ev_qs.filter(Q(event_type=AnalyticsEvent.EV_PAYMENT_ATTEMPT) | Q(event_type=AnalyticsEvent.EV_PAYMENT_SUCCESS)).values('session_id').distinct().count()
    # Step 10: Completed Order
    f10_completed = completed_orders

    # Force Natural Decrease: Step(N+1) <= Step(N)
    f1 = f1_visitors
    f2 = min(f2_logins, f1)
    f3 = min(f3_homes, f2)
    f4 = min(f4_menus, f3)
    f5 = min(f5_cats, f4)
    f6 = min(f6_details, f5)
    f7 = min(f7_adds, f6)
    f8 = min(f8_checkouts, f7)
    f9 = min(f9_payments, f8)
    f10 = min(f10_completed, f9)

    def pct(val, base):
        return round((val / base * 100) if base > 0 else 0.0, 1)

    funnel_data = [
        {'step': 'Website Visitor', 'users': f1, 'conversion': 100.0},
        {'step': 'Login',           'users': f2, 'conversion': pct(f2, f1)},
        {'step': 'Home',            'users': f3, 'conversion': pct(f3, f1)},
        {'step': 'Menu',            'users': f4, 'conversion': pct(f4, f1)},
        {'step': 'Category',        'users': f5, 'conversion': pct(f5, f1)},
        {'step': 'Food Details',    'users': f6, 'conversion': pct(f6, f1)},
        {'step': 'Add To Cart',     'users': f7, 'conversion': pct(f7, f1)},
        {'step': 'Checkout',        'users': f8, 'conversion': pct(f8, f1)},
        {'step': 'Payment',         'users': f9, 'conversion': pct(f9, f1)},
        {'step': 'Completed Order', 'users': f10, 'conversion': pct(f10, f1)},
    ]

    # ------------------------------------------------------------------
    # 5. PAGE ANALYTICS
    # ------------------------------------------------------------------
    # Views, Unique Visitors, Avg Time, Bounce Rate
    page_events = ev_qs.filter(event_type=AnalyticsEvent.EV_PAGE_VIEW)
    page_stats_raw = (
        page_events
        .values('page_path')
        .annotate(
            visits=Count('id'),
            unique_visitors=Count('session_id', distinct=True),
            avg_time=Avg('time_on_page')
        )
        .order_by('-visits')
    )

    page_visits_chart = []
    for p in page_stats_raw:
        path = p['page_path'] or '/'
        # Calculate bounce rate: sessions that viewed ONLY this page / total sessions that viewed this page
        # For simplicity, calculate bounce sessions: sessions where event count is 1
        bounce_rate = 0.0
        sessions_on_page = page_events.filter(page_path=path).values_list('session_id', flat=True)
        if sessions_on_page:
            single_page_sessions = (
                AnalyticsEvent.objects
                .filter(session_id__in=sessions_on_page)
                .values('session_id')
                .annotate(cnt=Count('id'))
                .filter(cnt=1)
                .count()
            )
            bounce_rate = pct(single_page_sessions, len(set(sessions_on_page)))

        avg_time_sec = round(p['avg_time'] or 0.0, 1)
        page_visits_chart.append({
            'page': path,
            'visits': p['visits'],
            'unique_visitors': p['unique_visitors'],
            'avg_time': f"{avg_time_sec}s",
            'bounce_rate': f"{bounce_rate}%"
        })

    # ------------------------------------------------------------------
    # 6. MENU ANALYTICS
    # ------------------------------------------------------------------
    menu_views_count = ev_qs.filter(event_type=AnalyticsEvent.EV_MENU_VISIT).count()
    menu_uniques = ev_qs.filter(event_type=AnalyticsEvent.EV_MENU_VISIT).values('session_id').distinct().count()
    menu_avg_time = ev_qs.filter(event_type=AnalyticsEvent.EV_MENU_VISIT).aggregate(a=Avg('time_on_page'))['a'] or 0.0
    categories_opened = ev_qs.filter(event_type=AnalyticsEvent.EV_CATEGORY_CLICK).count()
    items_viewed = ev_qs.filter(event_type=AnalyticsEvent.EV_FOOD_VIEW).count()
    item_clicks = ev_qs.filter(event_type=AnalyticsEvent.EV_FOOD_CLICK).count()
    menu_add_to_carts = ev_qs.filter(event_type=AnalyticsEvent.EV_ADD_TO_CART).count()

    menu_analytics = {
        'total_visits': menu_views_count,
        'unique_visitors': menu_uniques,
        'avg_time': f"{round(menu_avg_time, 1)}s",
        'categories_opened': categories_opened,
        'items_viewed': items_viewed,
        'item_clicks': item_clicks,
        'add_to_cart': menu_add_to_carts
    }

    # ------------------------------------------------------------------
    # 7. FOOD ANALYTICS
    # ------------------------------------------------------------------
    food_views = dict(ev_qs.filter(event_type=AnalyticsEvent.EV_FOOD_VIEW).values('food_id').annotate(c=Count('id')).values_list('food_id', 'c'))
    food_clicks = dict(ev_qs.filter(event_type=AnalyticsEvent.EV_FOOD_CLICK).values('food_id').annotate(c=Count('id')).values_list('food_id', 'c'))
    food_adds = dict(ev_qs.filter(event_type=AnalyticsEvent.EV_ADD_TO_CART).values('food_id').annotate(c=Count('id')).values_list('food_id', 'c'))

    food_orders_qs = (
        OrderItem.objects
        .filter(order__created_at__gte=current_start, order__status='Completed')
        .values('food_id')
        .annotate(
            orders_count=Count('order_id', distinct=True),
            total_rev=Sum('price')
        )
    )
    food_orders = {f['food_id']: f['orders_count'] for f in food_orders_qs}
    food_rev = {f['food_id']: float(f['total_rev'] or 0) for f in food_orders_qs}

    all_foods = Food.objects.all()
    food_item_table = []
    for f in all_foods:
        views = food_views.get(f.id, 0)
        clicks = food_clicks.get(f.id, 0)
        adds = food_adds.get(f.id, 0)
        orders = food_orders.get(f.id, 0)
        rev = food_rev.get(f.id, 0.0)

        # Enforce rule: views >= clicks >= adds >= orders
        # If any data anomaly, force them to align logically
        clicks = min(clicks, views)
        adds = min(adds, clicks)
        orders = min(orders, adds)

        conversion = pct(orders, views) if views > 0 else 0.0

        food_item_table.append({
            'food__name': f.name,
            'views': views,
            'clicks': clicks,
            'adds': adds,
            'orders': orders,
            'revenue': rev,
            'conversion': f"{conversion}%"
        })

    # Sort most clicked foods
    food_item_table = sorted(food_item_table, key=lambda x: x['clicks'], reverse=True)
    
    # Food heatmap: top 10 clicked
    food_item_heatmap = [
        {'name': f['food__name'], 'clicks': f['clicks'], 'change': 0}
        for f in food_item_table[:10]
        if f['clicks'] > 0
    ]

    # ------------------------------------------------------------------
    # 8. CATEGORY ANALYTICS
    # ------------------------------------------------------------------
    cat_visits = dict(ev_qs.filter(event_type=AnalyticsEvent.EV_CATEGORY_CLICK).values('category_id').annotate(c=Count('id')).values_list('category_id', 'c'))
    cat_orders_qs = (
        OrderItem.objects
        .filter(order__created_at__gte=current_start, order__status='Completed')
        .values('food__category_id')
        .annotate(c=Count('order_id', distinct=True))
    )
    cat_orders = {c['food__category_id']: c['c'] for c in cat_orders_qs}

    all_cats = Category.objects.all()
    category_analytics = []
    for c in all_cats:
        category_analytics.append({
            'name': c.name,
            'visits': cat_visits.get(c.id, 0),
            'orders': cat_orders.get(c.id, 0)
        })

    # ------------------------------------------------------------------
    # 9. SEARCH ANALYTICS
    # ------------------------------------------------------------------
    search_events = ev_qs.filter(event_type=AnalyticsEvent.EV_SEARCH)
    total_searches = search_events.count()
    
    # Top keywords
    top_searches_qs = (
        search_events
        .values('search_term')
        .annotate(c=Count('id'))
        .order_by('-c')[:10]
    )
    top_searches = [{'search_keyword': s['search_term'], 'count': s['c']} for s in top_searches_qs if s['search_term']]

    successful_searches = 0
    no_result_searches = 0
    search_conversions = 0

    for s in search_events:
        has_results = s.extra.get('resultCount', 0) > 0
        if has_results:
            successful_searches += 1
            # Check if this session converted (added to cart or ordered) in the same session later
            converted = AnalyticsEvent.objects.filter(
                session=s.session,
                event_type=AnalyticsEvent.EV_ADD_TO_CART,
                created_at__gt=s.created_at
            ).exists()
            if converted:
                search_conversions += 1
        else:
            no_result_searches += 1

    searches = {
        'total': total_searches,
        'successful': successful_searches,
        'no_result': no_result_searches,
        'conversion': pct(search_conversions, total_searches) if total_searches > 0 else 0.0
    }

    # ------------------------------------------------------------------
    # 10. REVENUE & ORDER TRENDS (Last N elements based on period)
    # ------------------------------------------------------------------
    trend_qs = (
        current_orders_qs
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    orders_trend = [
        {'date': d['date'].strftime('%Y-%m-%d'), 'count': d['count']}
        for d in trend_qs if d['date']
    ]

    # Peak hours matrix (7 days x 24 hours)
    peak_qs = (
        current_orders_qs
        .annotate(day=ExtractWeekDay('created_at'), hour=ExtractHour('created_at'))
        .values('day', 'hour')
        .annotate(count=Count('id'))
    )
    matrix = {d: [0] * 24 for d in range(1, 8)}
    for p in peak_qs:
        if p['day']:
            matrix[p['day']][p['hour']] = p['count']
    peak_hours_matrix = [{'day': k, 'hours': v} for k, v in matrix.items()]

    # ------------------------------------------------------------------
    # 11. DEVICE ANALYTICS
    # ------------------------------------------------------------------
    device_qs = (
        AnalyticsSession.objects
        .filter(started_at__gte=current_start)
        .values('device_type')
        .annotate(count=Count('id'))
    )
    top_devices = [{'device': d['device_type'].capitalize(), 'count': d['count']} for d in device_qs]

    return {
        'period': period,
        'users': {
            'total': total_users,
            'today': new_users,
            'returning': returning_users,
        },
        'orders': {
            'total': total_orders,
            'completed': completed_orders,
            'revenue': float(revenue),
            'cancelled': cancelled_orders,
            'pending': pending_orders,
            'processing': processing_orders,
        },
        'visitors': visitors,
        'funnel_data': funnel_data,
        'page_visits_chart': page_visits_chart,
        'menu_analytics': menu_analytics,
        'food_item_table': food_item_table,
        'food_item_heatmap': food_item_heatmap,
        'category_analytics': category_analytics,
        'searches': searches,
        'top_searches': top_searches,
        'orders_trend': orders_trend,
        'peak_hours_matrix': peak_hours_matrix,
        'top_devices': top_devices,
    }
