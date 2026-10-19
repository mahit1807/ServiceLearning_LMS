const jwt = require('jsonwebtoken');
const userDAO = require('../dao/userDAO');

const JWT_SECRET = process.env.JWT_SECRET || 'iskcon_lms_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(email, password) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const userDoc = await userDAO.findUserByEmailWithPassword(email);
    if (!userDoc) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await userDoc.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const profile = userDoc.toJSON();

    const token = jwt.sign(
      {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: { id: profile.id, email: profile.email },
      session: { access_token: token },
      profile,
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await userDAO.findUserById(userId);
    if (!user) {
      const err = new Error('User profile not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  /**
   * Update profile
   */
  async updateProfile(userId, { full_name, avatar_url }) {
    const updates = {};
    if (full_name) updates.full_name = full_name.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const updated = await userDAO.updateUser(userId, updates);
    if (!updated) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }
}

module.exports = new AuthService();
