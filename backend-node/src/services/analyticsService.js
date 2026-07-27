const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getPeriodDates } = require('../utils/period');

function pct(val, base) {
  return base > 0 ? parseFloat((val / base * 100).toFixed(1)) : 0.0;
}

function capFunnelStages(stages) {
  if (stages.length === 0) return [];
  const result = [stages[0]];
  for (let i = 1; i < stages.length; i++) {
    result.push(Math.min(stages[i], result[result.length - 1]));
  }
  return result;
}

async function getDashboardStats(period = 'daily') {
  const { start_date, current_period_start, previous_period_start } = getPeriodDates(period);

  // 1. USER METRICS
  const total_users = await prisma.users_user.count({
    where: { is_staff: false, is_superuser: false }
  });

  const new_users = await prisma.users_user.count({
    where: {
      is_staff: false,
      is_superuser: false,
      date_joined: { gte: current_period_start }
    }
  });

  // Returning Users: Logged-in users who have more than 1 session overall and were active in this period
  const returningUsersRaw = await prisma.$queryRaw`
    SELECT "user_id", COUNT(id) as "cnt"
    FROM "analytics_session"
    WHERE "started_at" >= ${current_period_start} AND "user_id" IS NOT NULL
    GROUP BY "user_id"
    HAVING COUNT(id) > 1
  `;
  const returning_users = returningUsersRaw.length;

  // 2. ORDER METRICS
  const ordersInPeriod = await prisma.orders_order.findMany({
    where: { created_at: { gte: current_period_start } }
  });

  const completed_orders = ordersInPeriod.filter(o => o.status === 'Completed').length;
  const cancelled_orders = ordersInPeriod.filter(o => o.status === 'Cancelled').length;
  const processing_orders = ordersInPeriod.filter(o => o.status === 'Processing').length;
  const pending_orders = ordersInPeriod.filter(o => o.status === 'Pending').length;
  const total_orders = completed_orders + pending_orders + cancelled_orders + processing_orders;

  const revenue = ordersInPeriod
    .filter(o => o.status === 'Completed')
    .reduce((sum, o) => sum + Number(o.total_amount), 0.0);

  // 3. WEBSITE VISITORS (Unique Sessions in period)
  const visitors = await prisma.analytics_session.count({
    where: { started_at: { gte: current_period_start } }
  });

  // 4. FUNNEL ANALYSIS
  const eventsInPeriod = await prisma.analytics_event.findMany({
    where: { created_at: { gte: current_period_start } }
  });

  const getDistinctSessionCount = (evtType, customFilter = null) => {
    let filtered = eventsInPeriod.filter(e => e.event_type === evtType);
    if (customFilter) {
      filtered = filtered.filter(customFilter);
    }
    const sessionIds = new Set(filtered.map(e => e.session_id.toString()));
    return sessionIds.size;
  };

  const f1_visitors = visitors;
  const f2_logins = getDistinctSessionCount('user_login');
  const f3_homes = getDistinctSessionCount('page_view', e => e.page_path === '/');
  const f4_menus = getDistinctSessionCount('menu_visit') + getDistinctSessionCount('page_view', e => e.page_path === '/menu');
  const f5_cats = getDistinctSessionCount('category_click');
  const f6_details = getDistinctSessionCount('food_view');
  const f7_adds = getDistinctSessionCount('add_to_cart');
  const f8_checkouts = getDistinctSessionCount('checkout_start');
  const f9_payments = getDistinctSessionCount('payment_attempt') + getDistinctSessionCount('payment_success');
  const f10_completed = completed_orders;

  const funnelStages = capFunnelStages([
    f1_visitors,
    f2_logins,
    f3_homes,
    f4_menus,
    f5_cats,
    f6_details,
    f7_adds,
    f8_checkouts,
    f9_payments,
    f10_completed
  ]);

  const funnel_data = [
    { step: 'Website Visitor', users: funnelStages[0], conversion: 100.0 },
    { step: 'Login',           users: funnelStages[1], conversion: pct(funnelStages[1], funnelStages[0]) },
    { step: 'Home',            users: funnelStages[2], conversion: pct(funnelStages[2], funnelStages[0]) },
    { step: 'Menu',            users: funnelStages[3], conversion: pct(funnelStages[3], funnelStages[0]) },
    { step: 'Category',        users: funnelStages[4], conversion: pct(funnelStages[4], funnelStages[0]) },
    { step: 'Food Details',    users: funnelStages[5], conversion: pct(funnelStages[5], funnelStages[0]) },
    { step: 'Add To Cart',     users: funnelStages[6], conversion: pct(funnelStages[6], funnelStages[0]) },
    { step: 'Checkout',        users: funnelStages[7], conversion: pct(funnelStages[7], funnelStages[0]) },
    { step: 'Payment',         users: funnelStages[8], conversion: pct(funnelStages[8], funnelStages[0]) },
    { step: 'Completed Order', users: funnelStages[9], conversion: pct(funnelStages[9], funnelStages[0]) }
  ];

  // 5. PAGE ANALYTICS
  const pageEvents = eventsInPeriod.filter(e => e.event_type === 'page_view');
  const paths = [...new Set(pageEvents.map(e => e.page_path || '/'))];

  const page_visits_chart = [];
  for (const path of paths) {
    const visits = pageEvents.filter(e => e.page_path === path);
    const unique_visitors = new Set(visits.map(e => e.session_id.toString())).size;
    
    // Average time calculation
    const timeOnPageList = visits.map(e => e.time_on_page).filter(t => t !== null && t !== undefined);
    const avg_time_sec = timeOnPageList.length > 0 
      ? parseFloat((timeOnPageList.reduce((a, b) => a + b, 0) / timeOnPageList.length).toFixed(1))
      : 0.0;

    // Bounce rate: sessions that viewed ONLY this page / total sessions that viewed this page
    const sessionsOnPage = [...new Set(visits.map(e => e.session_id.toString()))];
    let singlePageSessionsCount = 0;

    if (sessionsOnPage.length > 0) {
      // Find all event counts for these sessions in this period
      const eventCountsBySession = {};
      eventsInPeriod.forEach(e => {
        const sid = e.session_id.toString();
        eventCountsBySession[sid] = (eventCountsBySession[sid] || 0) + 1;
      });

      sessionsOnPage.forEach(sid => {
        if (eventCountsBySession[sid] === 1) {
          singlePageSessionsCount++;
        }
      });
    }

    const bounce_rate = pct(singlePageSessionsCount, sessionsOnPage.length);

    page_visits_chart.append = page_visits_chart.push({
      page: path,
      visits: visits.length,
      unique_visitors,
      avg_time: `${avg_time_sec}s`,
      bounce_rate: `${bounce_rate}%`
    });
  }

  // Sort page visits chart by visits descending
  page_visits_chart.sort((a, b) => b.visits - a.visits);

  // 6. MENU ANALYTICS
  const menuViewsCount = eventsInPeriod.filter(e => e.event_type === 'menu_visit').length;
  const menuUniques = new Set(eventsInPeriod.filter(e => e.event_type === 'menu_visit').map(e => e.session_id.toString())).size;
  const menuTimes = eventsInPeriod.filter(e => e.event_type === 'menu_visit').map(e => e.time_on_page).filter(t => t !== null);
  const menuAvgTime = menuTimes.length > 0 ? menuTimes.reduce((a, b) => a + b, 0) / menuTimes.length : 0.0;

  const menu_analytics = {
    total_visits: menuViewsCount,
    unique_visitors: menuUniques,
    avg_time: `${menuAvgTime.toFixed(1)}s`,
    categories_opened: eventsInPeriod.filter(e => e.event_type === 'category_click').length,
    items_viewed: eventsInPeriod.filter(e => e.event_type === 'food_view').length,
    item_clicks: eventsInPeriod.filter(e => e.event_type === 'food_click').length,
    add_to_cart: eventsInPeriod.filter(e => e.event_type === 'add_to_cart').length
  };

  // 7. FOOD ANALYTICS
  const foodViewsMap = {};
  const foodClicksMap = {};
  const foodAddsMap = {};

  eventsInPeriod.forEach(e => {
    if (!e.food_id) return;
    const fid = e.food_id.toString();
    if (e.event_type === 'food_view') foodViewsMap[fid] = (foodViewsMap[fid] || 0) + 1;
    if (e.event_type === 'food_click') foodClicksMap[fid] = (foodClicksMap[fid] || 0) + 1;
    if (e.event_type === 'add_to_cart') foodAddsMap[fid] = (foodAddsMap[fid] || 0) + 1;
  });

  const orderItemsInPeriod = await prisma.orders_orderitem.findMany({
    where: {
      orders_order: {
        created_at: { gte: current_period_start },
        status: 'Completed'
      }
    }
  });

  const foodOrdersMap = {};
  const foodRevMap = {};
  orderItemsInPeriod.forEach(item => {
    if (!item.food_id) return;
    const fid = item.food_id.toString();
    foodOrdersMap[fid] = (foodOrdersMap[fid] || 0) + 1;
    foodRevMap[fid] = (foodRevMap[fid] || 0.0) + Number(item.price);
  });

  const allFoods = await prisma.foods_food.findMany();
  let food_item_table = allFoods.map(f => {
    const fid = f.id.toString();
    const views = foodViewsMap[fid] || 0;
    let clicks = foodClicksMap[fid] || 0;
    let adds = foodAddsMap[fid] || 0;
    let orders = foodOrdersMap[fid] || 0;
    const revenue = foodRevMap[fid] || 0.0;

    // Align logically: views >= clicks >= adds >= orders
    clicks = Math.min(clicks, views);
    adds = Math.min(adds, clicks);
    orders = Math.min(orders, adds);

    const conversion = pct(orders, views);

    return {
      food__name: f.name,
      views,
      clicks,
      adds,
      orders,
      revenue,
      conversion: `${conversion}%`
    };
  });

  food_item_table.sort((a, b) => b.clicks - a.clicks);

  const food_item_heatmap = food_item_table
    .slice(0, 10)
    .filter(f => f.clicks > 0)
    .map(f => ({ name: f.food__name, clicks: f.clicks, change: 0 }));

  // 8. CATEGORY ANALYTICS
  const catVisitsMap = {};
  eventsInPeriod.forEach(e => {
    if (e.event_type === 'category_click' && e.category_id) {
      const cid = e.category_id.toString();
      catVisitsMap[cid] = (catVisitsMap[cid] || 0) + 1;
    }
  });

  const catOrdersMap = {};
  orderItemsInPeriod.forEach(item => {
    // We need category of the food item
    const food = allFoods.find(f => f.id === item.food_id);
    if (food && food.category_id) {
      const cid = food.category_id.toString();
      catOrdersMap[cid] = (catOrdersMap[cid] || 0) + 1;
    }
  });

  const allCategories = await prisma.foods_category.findMany();
  const category_analytics = allCategories.map(c => {
    const cid = c.id.toString();
    return {
      name: c.name,
      visits: catVisitsMap[cid] || 0,
      orders: catOrdersMap[cid] || 0
    };
  });

  // 9. SEARCH ANALYTICS
  const searchEvents = eventsInPeriod.filter(e => e.event_type === 'search');
  const total_searches = searchEvents.length;

  const searchKeywordsMap = {};
  searchEvents.forEach(e => {
    if (e.search_term) {
      searchKeywordsMap[e.search_term] = (searchKeywordsMap[e.search_term] || 0) + 1;
    }
  });

  const top_searches = Object.entries(searchKeywordsMap)
    .map(([keyword, count]) => ({ search_keyword: keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let successful_searches = 0;
  let no_result_searches = 0;
  let search_conversions = 0;

  for (const s of searchEvents) {
    const extra = typeof s.extra === 'string' ? JSON.parse(s.extra) : s.extra;
    const hasResults = (extra && extra.resultCount ? Number(extra.resultCount) : 0) > 0;
    
    if (hasResults) {
      successful_searches++;
      // Check conversion: if same session had add_to_cart later
      const converted = eventsInPeriod.some(e => 
        e.session_id === s.session_id &&
        e.event_type === 'add_to_cart' &&
        new Date(e.created_at) > new Date(s.created_at)
      );
      if (converted) {
        search_conversions++;
      }
    } else {
      no_result_searches++;
    }
  }

  const searches = {
    total: total_searches,
    successful: successful_searches,
    no_result: no_result_searches,
    conversion: pct(search_conversions, total_searches)
  };

  // 10. REVENUE & ORDER TRENDS
  const trendsMap = {};
  ordersInPeriod.forEach(o => {
    const dateStr = o.created_at.toISOString().split('T')[0];
    trendsMap[dateStr] = (trendsMap[dateStr] || 0) + 1;
  });

  const orders_trend = Object.entries(trendsMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Peak hours matrix (7 days x 24 hours)
  const matrix = {};
  for (let d = 1; d <= 7; d++) {
    matrix[d] = Array(24).fill(0);
  }

  ordersInPeriod.forEach(o => {
    // Django Day of week: Sunday=1, Monday=2, ..., Saturday=7
    // JS getDay(): Sunday=0, Monday=1, ..., Saturday=6
    const jsDay = o.created_at.getDay();
    const djangoDay = jsDay === 0 ? 1 : jsDay + 1;
    const hour = o.created_at.getHours();
    matrix[djangoDay][hour]++;
  });

  const peak_hours_matrix = Object.entries(matrix).map(([day, hours]) => ({
    day: parseInt(day, 10),
    hours
  }));

  // 11. DEVICE ANALYTICS
  const deviceCounts = {};
  const sessionsInPeriod = await prisma.analytics_session.findMany({
    where: { started_at: { gte: current_period_start } }
  });
  sessionsInPeriod.forEach(s => {
    const device = s.device_type || 'desktop';
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
  });

  const top_devices = Object.entries(deviceCounts).map(([device, count]) => ({
    device: device.charAt(0).toUpperCase() + device.slice(1),
    count
  }));

  return {
    period,
    users: {
      total: total_users,
      today: new_users,
      returning: returning_users
    },
    orders: {
      total: total_orders,
      completed: completed_orders,
      revenue,
      cancelled: cancelled_orders,
      pending: pending_orders,
      processing: processing_orders
    },
    visitors,
    funnel_data,
    page_visits_chart,
    menu_analytics,
    food_item_table,
    food_item_heatmap,
    category_analytics,
    searches,
    top_searches,
    orders_trend,
    peak_hours_matrix,
    top_devices
  };
}

module.exports = {
  getDashboardStats
};
