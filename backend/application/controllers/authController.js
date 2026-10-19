const authService = require('../../services/authService');

class AuthController {
  /**
   * POST /auth/login – Login with email & password
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (err) {
      console.error('AuthController.login error:', err.message);
      const status = err.statusCode || 401;
      return res.status(status).json({
        error: err.message || 'Login failed',
      });
    }
  }

  /**
   * GET /auth/profile – Get current user profile
   */
  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const profile = await authService.getProfile(req.user.id);
      return res.status(200).json({ profile });
    } catch (err) {
      console.error('AuthController.getProfile error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch profile',
      });
    }
  }

  /**
   * PUT /auth/profile – Update current user profile
   */
  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { full_name, avatar_url } = req.body;
      const updated = await authService.updateProfile(req.user.id, { full_name, avatar_url });

      return res.status(200).json({
        message: 'Profile updated successfully',
        profile: updated,
      });
    } catch (err) {
      console.error('AuthController.updateProfile error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to update profile',
      });
    }
  }
}

module.exports = new AuthController();
