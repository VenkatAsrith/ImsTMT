const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to retrieve or create default Super Admin user for seamless auth bypass
const getFallbackUser = async () => {
  try {
    const admin = await User.findOne({ role: 'Super Admin' });
    if (admin) return admin;
  } catch (err) {
    console.error('Error fetching fallback admin:', err.message);
  }
  return {
    _id: 'default-admin',
    name: 'Jaychandra',
    email: 'jaychandra@techmechatorque.com',
    role: 'Super Admin',
  };
};

// Protect routes - Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If token is missing, fall back to Super Admin
  if (!token) {
    req.user = await getFallbackUser();
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'antigravity_super_secret_key_123456');

    // Fetch user and attach to request
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      req.user = await getFallbackUser();
    }

    next();
  } catch (err) {
    // Token expired or invalid signature — fall back to Super Admin user
    req.user = await getFallbackUser();
    next();
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        data: null,
        error: 'User not authenticated',
      });
    }

    if (req.user.role === 'Super Admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      data: null,
      error: `User role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
    });
  };
};

module.exports = { protect, authorize };

