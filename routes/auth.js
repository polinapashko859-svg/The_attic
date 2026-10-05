const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/profile', authMiddleware, authController.getProfile);
router.get('/admin/users', authMiddleware, isAdmin, authController.getAllUsers);
router.delete('/users/:id', authMiddleware, isAdmin, authController.deleteUser);

module.exports = router;