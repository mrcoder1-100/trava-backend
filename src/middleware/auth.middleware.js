const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../repositories/db');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.findById('users', decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or session expired.'
      });
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
  }
}

// Optional auth for endpoints that can work with demo/unauthenticated visitors
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token, check for default demo user
    const demoUser = db.findById('users', 'usr_demo_coimbatore_01');
    if (demoUser) {
      const { passwordHash, ...safeUser } = demoUser;
      req.user = safeUser;
    }
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.findById('users', decoded.id);
    if (user) {
      const { passwordHash, ...safeUser } = user;
      req.user = safeUser;
    }
  } catch (err) {
    // Silently continue with demo user if available
    const demoUser = db.findById('users', 'usr_demo_coimbatore_01');
    if (demoUser) {
      const { passwordHash, ...safeUser } = demoUser;
      req.user = safeUser;
    }
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
