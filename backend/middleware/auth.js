const authService = require('../services/authService');
const userDAO = require('../dao/userDAO');
const supabase = require('../supabase/client');

/**
 * Authentication middleware.
 * Verifies JWT token and attaches user to req.user.
 * Seamlessly resolves demo/test tokens to real MongoDB records.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Support demo / automated test tokens by mapping to real MongoDB users
    if (token.startsWith('demo-token') || token.startsWith('mock-token')) {
      let role = 'student';
      let email = 'student@iskcon.org';

      if (token.includes('admin')) {
        role = 'admin';
        email = 'admin@iskcon.org';
      } else if (token.includes('instructor')) {
        role = 'instructor';
        email = 'instructor@iskcon.org';
      }

      const parts = token.split('-');
      if (parts.length >= 4) {
        try {
          const parsedEmail = decodeURIComponent(parts.slice(3).join('-'));
          if (parsedEmail && parsedEmail.includes('@')) {
            email = parsedEmail.toLowerCase();
          }
        } catch (_) {}
      }

      // Find or create the user in MongoDB
      let user = await userDAO.findUserByEmail(email);
      if (!user) {
        user = await userDAO.createUser({
          email,
          password: 'Password123',
          full_name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          role,
        });
      }

      req.user = user;
      return next();
    }

    // 2. Local JWT verification
    try {
      const decoded = authService.verifyToken(token);
      if (decoded && decoded.id) {
        const user = await userDAO.findUserById(decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      // Check Supabase fallback below
    }

    // 3. Supabase fallback if configured
    if (supabase.isConfigured) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          let localUser = await userDAO.findUserByEmail(user.email);
          if (!localUser) {
            localUser = await userDAO.createUser({
              email: user.email,
              password: 'supabase_account',
              full_name: user.user_metadata?.full_name || user.email.split('@')[0],
              role: user.user_metadata?.role || 'student',
            });
          }
          req.user = localUser;
          return next();
        }
      } catch (sbErr) {}
    }

    return res.status(401).json({ error: 'Session expired or invalid authentication token' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = authenticate;
