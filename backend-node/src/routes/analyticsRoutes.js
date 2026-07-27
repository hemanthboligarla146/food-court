const express = require('express');
const router = express.Router();
const { authenticateToken, requireAuth, isAdmin } = require('../middlewares/auth');
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard/', authenticateToken, isAdmin, analyticsController.getDashboard);
router.post('/event/', authenticateToken, analyticsController.recordEvent);
router.post('/session/start/', authenticateToken, analyticsController.startSession);
router.post('/session/merge/', authenticateToken, requireAuth, analyticsController.mergeSession);

module.exports = router;
