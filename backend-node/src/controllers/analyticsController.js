const analyticsService = require('../services/analyticsService');
const telemetryService = require('../services/telemetryService');
const serializeData = require('../utils/serialize');

async function getDashboard(req, res, next) {
  try {
    const { period } = req.query;
    const stats = await analyticsService.getDashboardStats(period || 'daily');
    res.status(200).json(serializeData(stats));
  } catch (err) {
    next(err);
  }
}

async function recordEvent(req, res, next) {
  try {
    const { session_key, event_type, page_path, food_id, category_id, search_term, time_on_page, extra } = req.body;

    if (!session_key || !event_type) {
      return res.status(400).json({ detail: 'session_key and event_type are required.' });
    }

    const event = await telemetryService.recordEvent({
      session_key,
      event_type,
      user: req.user,
      page_path,
      food_id,
      category_id,
      search_term,
      time_on_page,
      extra,
      user_agent: req.headers['user-agent'] || ''
    });

    res.status(201).json(serializeData(event));
  } catch (err) {
    next(err);
  }
}

async function startSession(req, res, next) {
  try {
    const { session_key } = req.body;
    if (!session_key) {
      return res.status(400).json({ detail: 'session_key is required.' });
    }

    const session = await telemetryService.getOrCreateSession(
      session_key,
      req.user,
      req.headers['user-agent'] || ''
    );

    res.status(200).json(serializeData(session));
  } catch (err) {
    next(err);
  }
}

async function mergeSession(req, res, next) {
  try {
    const { session_key } = req.body;
    if (!session_key) {
      return res.status(400).json({ detail: 'session_key is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ detail: 'Authentication required to merge sessions.' });
    }

    const session = await telemetryService.mergeSession(session_key, req.user);
    res.status(200).json(serializeData(session || { detail: 'Session already merged or admin user.' }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  recordEvent,
  startSession,
  mergeSession
};
