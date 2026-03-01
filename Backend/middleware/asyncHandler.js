// ─── asyncHandler: wraps async route handlers to forward errors to next() ─────
// Eliminates repetitive try-catch in every controller function.
//
// Usage:
//   router.get("/rooms", asyncHandler(async (req, res) => {
//     const rooms = await roomService.getAllRooms();
//     res.json({ success: true, data: rooms });
//   }));

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
