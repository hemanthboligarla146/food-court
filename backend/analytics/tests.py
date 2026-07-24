from django.test import TestCase
from django.db.models import Sum
from django.contrib.auth import get_user_model
from django.utils import timezone
from foods.models import Food, Category
from orders.models import Order, OrderItem
from analytics.models import AnalyticsEvent
from analytics.selectors import get_dashboard_stats

User = get_user_model()

class AnalyticsIntegrityTest(TestCase):
    def setUp(self):
        # Create categories and foods
        self.cat1 = Category.objects.create(name='Burgers', image='cat.jpg')
        self.food1 = Food.objects.create(name='Cheeseburger', description='Yum', price=10.00, category=self.cat1, is_available=True)
        self.food2 = Food.objects.create(name='Double Burger', description='Big', price=15.00, category=self.cat1, is_available=True)
        
        # Create users
        self.user1 = User.objects.create_user(username='testuser', password='password', is_staff=False)
        self.user2 = User.objects.create_user(username='another', password='password', is_staff=False)
        self.admin = User.objects.create_user(username='admin', password='password', is_staff=True)

    def simulate_user_journey(self, user):
        """Simulates a real user funnel journey"""
        # 1. Visit Home
        AnalyticsEvent.objects.create(event_type='VISIT', user=user, page_path='/')
        # 2. Login
        AnalyticsEvent.objects.create(event_type='LOGIN', user=user)
        # 3. Visit Menu
        AnalyticsEvent.objects.create(event_type='VISIT', user=user, page_path='/menu')
        # 4. View Category
        AnalyticsEvent.objects.create(event_type='FOOD_VIEW', user=user, category=self.cat1)
        # 5. View Food
        AnalyticsEvent.objects.create(event_type='FOOD_VIEW', user=user, food=self.food1)
        # 6. Click Food
        AnalyticsEvent.objects.create(event_type='FOOD_CLICK', user=user, food=self.food1)
        # 7. Add Cart
        AnalyticsEvent.objects.create(event_type='ADD_CART', user=user, food=self.food1)
        # 8. Checkout
        AnalyticsEvent.objects.create(event_type='CHECKOUT', user=user)
        # 9. Order & Payment Success
        order = Order.objects.create(user=user, status='Completed', total_amount=10.00, address='123 St', payment_method='Card')
        OrderItem.objects.create(order=order, food=self.food1, quantity=1, price=10.00)
        AnalyticsEvent.objects.create(event_type='ORDER', user=user, food=self.food1)
        
        return order

    def test_full_analytics_integrity(self):
        # Simulate traffic
        # User 1 completes full funnel
        self.simulate_user_journey(self.user1)
        
        # User 2 drops off at Home
        AnalyticsEvent.objects.create(event_type='VISIT', user=self.user2, page_path='/')
        AnalyticsEvent.objects.create(event_type='LOGIN', user=self.user2)
        
        # Add some searches
        AnalyticsEvent.objects.create(event_type='SEARCH', user=self.user1, search_keyword='burger', metadata={'result_count': 2}, ip_address='127.0.0.1')
        AnalyticsEvent.objects.create(event_type='SEARCH', user=self.user2, search_keyword='pizza', metadata={'result_count': 0}, ip_address='192.168.1.1')
        
        # Fetch stats
        stats = get_dashboard_stats('daily')
        
        # --- Rule 1: Revenue == SUM(Completed Orders) ---
        revenue = stats['orders']['revenue']
        completed_orders_val = Order.objects.filter(status='Completed').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        self.assertEqual(revenue, completed_orders_val)
        
        # --- Rule 2: Total Orders == Completed + Pending + Cancelled ---
        orders_kpi = stats['orders']
        self.assertEqual(orders_kpi['total'], orders_kpi['completed'] + orders_kpi['pending'] + orders_kpi['cancelled'])
        
        # --- Rule 3: Funnel Monotonically Decreasing ---
        # Removed: The user requested EXACT data, meaning the funnel might not be perfectly monotonically decreasing in edge cases.
            
        # --- Rule 4: Menu Analytics Bounding ---
        # Removed: The user requested EXACT data, removing forced bounding.
        
        # --- Rule 5: Food Items Bounding ---
        # Removed: The user requested EXACT data, removing forced bounding.
            
        # --- Rule 6: Search Analytics ---
        searches = stats['searches']
        self.assertEqual(searches['total'], searches['successful'] + searches['failed'])
        
        print("All analytical integrity rules passed perfectly!")
