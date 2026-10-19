const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const userDAO = require('../dao/userDAO');

router.use(authenticate);

// GET /users/profile – Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await userDAO.findUserById(req.user.id);
    res.json({ profile: user || req.user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /users/profile – Update current user profile
router.put('/profile', async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;
    const updates = {};
    if (full_name) updates.full_name = full_name.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updated = await userDAO.updateUser(req.user.id, updates);
    res.json({ profile: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /users/dashboard-stats – Get dashboard stats for current user
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === 'student') {
      const stats = await userDAO.getStudentStats(id);
      return res.json(stats);
    }

    if (role === 'instructor') {
      const stats = await userDAO.getInstructorStats(id);
      return res.json(stats);
    }

    if (role === 'admin') {
      const stats = await userDAO.getAdminStats();
      return res.json(stats);
    }

    res.json({});
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
