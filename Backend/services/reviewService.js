const Review = require("../models/Review");
const Booking = require("../models/Booking");

// ─── 1. Add a review ──────────────────────────────────────────────────────────
const addReview = async ({ userId, roomId, rating, comment }) => {
  // Ensure the user has a completed booking for this room
  const completedBooking = await Booking.findOne({
    user: userId,
    room: roomId,
    status: "completed",
  });

  if (!completedBooking) {
    const error = new Error(
      "You can only review a room after completing a stay in it"
    );
    error.statusCode = 403;
    throw error;
  }

  // Enforce one review per user per room (compound index handles DB level,
  // but we surface a friendly error here at the service level)
  const existingReview = await Review.findOne({ user: userId, room: roomId });
  if (existingReview) {
    const error = new Error("You have already submitted a review for this room");
    error.statusCode = 409;
    throw error;
  }

  const review = await Review.create({
    user:        userId,
    room:        roomId,
    rating,
    comment,
    createdDate: new Date(),
  });

  return review.populate([
    { path: "user", select: "name email" },
    { path: "room", select: "roomNumber roomType" },
  ]);
};

// ─── 2. Get all reviews for a room ────────────────────────────────────────────
const getReviewsByRoom = async (roomId, filters = {}) => {
  const query = { room: roomId };

  if (filters.rating) query.rating = Number(filters.rating);

  const reviews = await Review.find(query)
    .populate("user", "name")
    .sort({ createdDate: -1 });

  if (!reviews.length) {
    return { reviews: [], averageRating: 0, totalReviews: 0 };
  }

  const averageRating = calculateAverageRating(reviews);

  return {
    reviews,
    averageRating,
    totalReviews: reviews.length,
  };
};

// ─── 3. Get all reviews by a user ─────────────────────────────────────────────
const getReviewsByUser = async (userId) => {
  const reviews = await Review.find({ user: userId })
    .populate("room", "roomNumber roomType")
    .sort({ createdDate: -1 });

  return reviews;
};

// ─── 4. Get a single review by ID ─────────────────────────────────────────────
const getReviewById = async (reviewId) => {
  const review = await Review.findById(reviewId)
    .populate("user", "name email")
    .populate("room", "roomNumber roomType");

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  return review;
};

// ─── 5. Update a review ───────────────────────────────────────────────────────
const updateReview = async (reviewId, userId, userRole, { rating, comment }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  // Only the review author or an admin can update
  if (userRole !== "admin" && review.user.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to update this review");
    error.statusCode = 403;
    throw error;
  }

  if (rating !== undefined) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const error = new Error("Rating must be a whole number between 1 and 5");
      error.statusCode = 400;
      throw error;
    }
    review.rating = rating;
  }

  if (comment !== undefined) review.comment = comment;

  await review.save();

  return review.populate([
    { path: "user", select: "name email" },
    { path: "room", select: "roomNumber roomType" },
  ]);
};

// ─── 6. Delete a review ───────────────────────────────────────────────────────
const deleteReview = async (reviewId, userId, userRole) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  if (userRole !== "admin" && review.user.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to delete this review");
    error.statusCode = 403;
    throw error;
  }

  await Review.findByIdAndDelete(reviewId);
  return { message: "Review deleted successfully" };
};

// ─── 7. Calculate average rating for a room ───────────────────────────────────
const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return parseFloat((total / reviews.length).toFixed(1));
};

// ─── 8. Get average rating directly from DB (aggregation) ────────────────────
const getRoomRatingSummary = async (roomId) => {
  const result = await Review.aggregate([
    { $match: { room: require("mongoose").Types.ObjectId.createFromHexString(roomId) } },
    {
      $group: {
        _id:           "$room",
        averageRating: { $avg: "$rating" },
        totalReviews:  { $sum: 1 },
        ratingBreakdown: {
          $push: "$rating",
        },
      },
    },
  ]);

  if (!result.length) {
    return { averageRating: 0, totalReviews: 0, ratingBreakdown: {} };
  }

  const { averageRating, totalReviews, ratingBreakdown } = result[0];

  // Build a distribution map: { 1: count, 2: count, ... 5: count }
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingBreakdown.forEach((r) => { distribution[r] = (distribution[r] || 0) + 1; });

  return {
    averageRating: parseFloat(averageRating.toFixed(1)),
    totalReviews,
    ratingBreakdown: distribution,
  };
};

module.exports = {
  addReview,
  getReviewsByRoom,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
  calculateAverageRating,
  getRoomRatingSummary,
};
