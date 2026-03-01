const reviewService = require("../services/reviewService");
const asyncHandler  = require("../middleware/asyncHandler");

// ─── POST /api/reviews ─────────────────────────────────────────────────────────
const addReview = asyncHandler(async (req, res) => {
  const { roomId, rating, comment } = req.body;

  const review = await reviewService.addReview({
    userId:  req.user._id,
    roomId,
    rating,
    comment,
  });

  res.status(201).json({
    success: true,
    message: "Review submitted successfully.",
    data: { review },
  });
});

// ─── GET /api/reviews/room/:roomId ─────────────────────────────────────────────
const getReviewsByRoom = asyncHandler(async (req, res) => {
  const { rating } = req.query;

  const result = await reviewService.getReviewsByRoom(req.params.roomId, {
    rating,
  });

  res.status(200).json({
    success:      true,
    totalReviews: result.totalReviews,
    averageRating: result.averageRating,
    data: { reviews: result.reviews },
  });
});

// ─── GET /api/reviews/room/:roomId/summary ─────────────────────────────────────
const getRoomRatingSummary = asyncHandler(async (req, res) => {
  const summary = await reviewService.getRoomRatingSummary(req.params.roomId);

  res.status(200).json({
    success: true,
    data: { summary },
  });
});

// ─── GET /api/reviews/my ──────────────────────────────────────────────────────
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getReviewsByUser(req.user._id);

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: { reviews },
  });
});

// ─── GET /api/reviews/user/:userId ─── admin only ────────────────────────────
const getReviewsByUser = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getReviewsByUser(req.params.userId);

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: { reviews },
  });
});

// ─── GET /api/reviews/:id ──────────────────────────────────────────────────────
const getReviewById = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewById(req.params.id);

  res.status(200).json({
    success: true,
    data: { review },
  });
});

// ─── PUT /api/reviews/:id ─────────────────────────────────────────────────────
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const review = await reviewService.updateReview(
    req.params.id,
    req.user._id,
    req.user.role,
    { rating, comment }
  );

  res.status(200).json({
    success: true,
    message: "Review updated successfully.",
    data: { review },
  });
});

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────────
const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReview(
    req.params.id,
    req.user._id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  addReview,
  getReviewsByRoom,
  getRoomRatingSummary,
  getMyReviews,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
};
