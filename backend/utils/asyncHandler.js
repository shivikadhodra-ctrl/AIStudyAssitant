// Wraps async route handlers so you never need try/catch in controllers.
// Any thrown error is forwarded to the centralized errorHandler middleware.
//
// Usage:
//   router.get('/me', protect, asyncHandler(async (req, res) => {
//     const user = await User.findById(req.user.id);
//     res.json({ success: true, data: user });
//   }));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;