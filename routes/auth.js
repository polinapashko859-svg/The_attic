const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/profile', authMiddleware, authController.getProfile);
router.patch('/profile', authMiddleware, authController.updateProfile);
router.get('/users/:id', authController.getPublicProfile);
router.get('/contacts', authMiddleware, authController.getContacts);
router.post('/contacts/:id/restore', authMiddleware, authController.restoreContact);
router.delete('/contacts/:id', authMiddleware, authController.removeContact);
router.get('/admin/users', authMiddleware, isAdmin, authController.getAllUsers);
router.delete('/users/:id', authMiddleware, isAdmin, authController.deleteUser);

module.exports = router;