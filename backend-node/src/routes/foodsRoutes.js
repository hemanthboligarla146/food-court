const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireAuth } = require('../middlewares/auth');
const foodsController = require('../controllers/foodsController');

// Multer storage configuration for food images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../media/foods'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Public routes
router.get('/categories/', foodsController.listCategories);
router.get('/menu/', foodsController.listFoods);
router.get('/menu/:id/', foodsController.getFoodDetail);
router.post('/menu/:id/review/', authenticateToken, requireAuth, foodsController.createReview);

// Admin Category Management routes
router.get('/admin/manage/categories/', authenticateToken, requireAuth, foodsController.adminListCategories);
router.post('/admin/manage/categories/', authenticateToken, requireAuth, foodsController.adminCreateCategory);
router.put('/admin/manage/categories/:id/', authenticateToken, requireAuth, foodsController.adminUpdateCategory);
router.delete('/admin/manage/categories/:id/', authenticateToken, requireAuth, foodsController.adminDeleteCategory);

// Admin Food Management routes
router.get('/admin/manage/foods/', authenticateToken, requireAuth, foodsController.adminListFoods);
router.post('/admin/manage/foods/', authenticateToken, requireAuth, upload.single('image'), foodsController.adminCreateFood);
router.put('/admin/manage/foods/:id/', authenticateToken, requireAuth, upload.single('image'), foodsController.adminUpdateFood);
router.delete('/admin/manage/foods/:id/', authenticateToken, requireAuth, foodsController.adminDeleteFood);

module.exports = router;
