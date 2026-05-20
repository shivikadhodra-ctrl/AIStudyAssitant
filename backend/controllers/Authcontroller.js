const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Helper — generate signed JWT
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// ── POST /api/auth/register ────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  // express-validator result check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;

  // Check duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }

  // Hash password — saltRounds=10 is the production standard
  const passwordHash = await bcrypt.hash(password, 10);

  const user  = await User.create({ name, email, passwordHash });
  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    data: { token, user },
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  // Include passwordHash in query (excluded by toJSON transform by default)
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken(user._id);

  // Remove passwordHash before sending
  const userObj = user.toJSON();

  res.json({
    success: true,
    data: { token, user: userObj },
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  res.json({ success: true, data: req.user });
});

module.exports = { register, login, getMe };