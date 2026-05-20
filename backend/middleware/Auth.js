const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Attach req.user on every protected route.
// Usage: router.get('/me', protect, getMe)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Accept token from Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized — no token' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  next();
});

module.exports = protect;