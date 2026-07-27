const express = require('express');
const router = express.Router();
const { authenticateToken, requireAuth, isAdmin } = require('../middlewares/auth');
const ordersController = require('../controllers/ordersController');

// Cart routes
router.get('/cart/', authenticateToken, requireAuth, ordersController.listCart);
router.post('/cart/', authenticateToken, requireAuth, ordersController.addToCart);
router.delete('/cart/:id/', authenticateToken, requireAuth, ordersController.deleteCartItem);

// Wishlist routes
router.get('/wishlist/', authenticateToken, requireAuth, ordersController.listWishlist);
router.post('/wishlist/', authenticateToken, requireAuth, ordersController.addToWishlist);
router.delete('/wishlist/:id/', authenticateToken, requireAuth, ordersController.deleteWishlistItem);

// Orders routes
router.get('/', authenticateToken, requireAuth, ordersController.listOrders);
router.post('/', authenticateToken, requireAuth, ordersController.createOrder);
router.get('/:id/', authenticateToken, requireAuth, ordersController.getOrderDetail);
router.post('/:id/review/', authenticateToken, requireAuth, ordersController.reviewOrder);

// Admin management routes
router.get('/admin/manage/', authenticateToken, isAdmin, ordersController.adminListOrders);
router.put('/admin/manage/:id/', authenticateToken, isAdmin, ordersController.adminUpdateOrderStatus);
router.patch('/admin/manage/:id/', authenticateToken, isAdmin, ordersController.adminUpdateOrderStatus);

module.exports = router;
