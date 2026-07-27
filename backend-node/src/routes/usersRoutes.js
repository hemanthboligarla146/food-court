const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireAuth } = require('../middlewares/auth');
const usersController = require('../controllers/usersController');

// Multer storage configuration for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../media/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/register/', upload.single('profile_picture'), usersController.register);
router.post('/login/', usersController.login);
router.post('/login/refresh/', usersController.refresh);

router.get('/profile/', authenticateToken, requireAuth, usersController.getProfile);
router.put('/profile/', authenticateToken, requireAuth, upload.single('profile_picture'), usersController.updateProfile);

// Addresses routes
router.get('/addresses/', authenticateToken, requireAuth, usersController.listAddresses);
router.post('/addresses/', authenticateToken, requireAuth, usersController.createAddress);
router.put('/addresses/:id/', authenticateToken, requireAuth, usersController.updateAddress);
router.delete('/addresses/:id/', authenticateToken, requireAuth, usersController.deleteAddress);

// Payment Methods routes
router.get('/payments/', authenticateToken, requireAuth, usersController.listPayments);
router.post('/payments/', authenticateToken, requireAuth, usersController.createPayment);
router.put('/payments/:id/', authenticateToken, requireAuth, usersController.updatePayment);
router.delete('/payments/:id/', authenticateToken, requireAuth, usersController.deletePayment);

module.exports = router;
