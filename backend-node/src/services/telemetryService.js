const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');

const VALID_EVENT_TYPES = new Set([
  'page_view', 'session_start', 'user_register', 'user_login', 'user_logout',
  'menu_visit', 'category_click', 'food_view', 'food_click', 'add_to_cart',
  'remove_from_cart', 'cart_view', 'checkout_start', 'payment_attempt',
  'payment_success', 'payment_failure', 'search'
]);

function parseDeviceType(userAgentStr) {
  if (!userAgentStr) return 'desktop';
  const ua = userAgentStr.toLowerCase();
  
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile')) || ua.includes('tablet')) {
    return 'tablet';
  }
  if (ua.includes('iphone') || ua.includes('android') || ua.includes('phone') || ua.includes('ipod') || ua.includes('mobile') || ua.includes('blackberry') || ua.includes('webos')) {
    return 'mobile';
  }
  return 'desktop';
}

async function getOrCreateSession(sessionKey, user = null, userAgent = '') {
  if (user && (user.is_staff || user.is_superuser)) {
    return null;
  }

  let session = await prisma.analytics_session.findUnique({
    where: { session_key: sessionKey }
  });

  const now = new Date();

  if (!session) {
    session = await prisma.analytics_session.create({
      data: {
        session_key: sessionKey,
        user_id: user ? user.id : null,
        device_type: parseDeviceType(userAgent),
        user_agent: userAgent ? userAgent.substring(0, 512) : '',
        started_at: now,
        last_seen_at: now
      }
    });
  } else {
    // If session was anonymous but now we have authenticated user, merge it
    const dataToUpdate = { last_seen_at: now };
    if (!session.user_id && user) {
      dataToUpdate.user_id = user.id;
    }
    session = await prisma.analytics_session.update({
      where: { id: session.id },
      data: dataToUpdate
    });
  }

  return session;
}

async function mergeSession(sessionKey, user) {
  if (user && (user.is_staff || user.is_superuser)) {
    return null;
  }

  const session = await prisma.analytics_session.findUnique({
    where: { session_key: sessionKey }
  });

  if (session && !session.user_id) {
    return await prisma.analytics_session.update({
      where: { id: session.id },
      data: {
        user_id: user.id,
        last_seen_at: new Date()
      }
    });
  }
  return null;
}

async function recordEvent({
  session_key,
  event_type,
  user = null,
  page_path = '',
  food_id = null,
  category_id = null,
  search_term = '',
  time_on_page = null,
  extra = null,
  user_agent = ''
}) {
  if (user && (user.is_staff || user.is_superuser)) {
    return null;
  }

  if (!VALID_EVENT_TYPES.has(event_type)) {
    logger.warn(`Invalid event type: ${event_type}`);
    return null;
  }

  const session = await getOrCreateSession(session_key, user, user_agent);
  if (!session) return null;

  // Resolve Food if food_id is present
  let resolvedFoodId = null;
  if (food_id) {
    const food = await prisma.foods_food.findUnique({
      where: { id: BigInt(food_id) }
    });
    if (food) resolvedFoodId = food.id;
  }

  // Resolve Category if category_id is present
  let resolvedCategoryId = null;
  if (category_id) {
    const category = await prisma.foods_category.findUnique({
      where: { id: BigInt(category_id) }
    });
    if (category) resolvedCategoryId = category.id;
  }

  return await prisma.analytics_event.create({
    data: {
      session_id: session.id,
      user_id: user ? user.id : null,
      event_type,
      page_path: page_path ? page_path.substring(0, 255) : '',
      food_id: resolvedFoodId,
      category_id: resolvedCategoryId,
      search_term: search_term ? search_term.substring(0, 255) : '',
      time_on_page: time_on_page ? parseInt(time_on_page, 10) : null,
      extra: extra || {},
      created_at: new Date()
    }
  });
}

module.exports = {
  getOrCreateSession,
  mergeSession,
  recordEvent
};
