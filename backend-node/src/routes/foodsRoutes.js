const express = require('express');
const router = express.Router();
const { authenticateToken, requireAuth } = require('../middlewares/auth');
const foodsController = require('../controllers/foodsController');

router.get('/categories/', foodsController.listCategories);
router.get('/menu/', foodsController.listFoods);
router.get('/menu/:id/', foodsController.getFoodDetail);
router.post('/menu/:id/review/', authenticateToken, requireAuth, foodsController.createReview);

module.exports = router;
