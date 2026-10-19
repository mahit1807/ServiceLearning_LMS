const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');

// POST /auth/login – Public login endpoint
router.post('/login', (req, res) => authController.login(req, res));

// Authenticated routes
router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));

module.exports = router;
