const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { logAudit } = require('../services/automationService');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'tmt_operations_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRE || '1h',
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      data: null,
      error: 'Please provide email and password',
    });
  }

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        data: null,
        error: 'Invalid credentials',
      });
    }

    // Check password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        data: null,
        error: 'Invalid credentials',
      });
    }

    // Create token
    const token = generateToken(user._id);

    // Track Audit Log
    await logAudit({
      userId: user._id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      details: `${user.name} logged into the system.`,
    });

    res.json({
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (Restricted to Super Admin or HR Manager)
// @access  Private
router.post('/register', protect, authorize('Super Admin', 'HR Manager'), async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        data: null,
        error: 'User already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // Track Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE',
      entity: 'User',
      entityId: user._id.toString(),
      details: `Created new staff account for ${user.name} with role ${user.role}.`,
    });

    res.status(201).json({
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      data: req.user,
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users list (For selectors e.g. Assigning deals)
// @access  Private
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({}).select('name email role');
    res.json({
      data: users,
      error: null,
    });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

module.exports = router;
