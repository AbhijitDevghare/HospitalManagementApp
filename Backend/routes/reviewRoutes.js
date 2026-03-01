const express = require("express");
const router  = express.Router();

const {
  addReview,
  getReviewsByRoom,
  getRoomRatingSummary,
  getMyReviews,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

const { authenticate, optionalAuthenticate }    = require("../middleware/authMiddleware");
const { adminOnly, guestOrHigher }              = require("../middleware/roleMiddleware");
const { validateReview, validateObjectIdParam } = require("../middleware/validationMiddleware");
const { apiLimiter }                            = require("../middleware/rateLimitMiddleware");

// ─── Public routes (auth optional — richer response when logged in) ────────────

// GET /api/reviews/room/:roomId — all reviews for a room with average rating
router.get(
  "/room/:roomId",
  optionalAuthenticate,
  validateObjectIdParam("roomId"),
  getReviewsByRoom
);

// GET /api/reviews/room/:roomId/summary — aggregated rating breakdown
router.get(
  "/room/:roomId/summary",
  validateObjectIdParam("roomId"),
  getRoomRatingSummary
);

// GET /api/reviews/:id — single review detail (public)
router.get("/:id", validateObjectIdParam("id"), getReviewById);

// ─── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

// POST /api/reviews — submit a review (requires completed stay, enforced in service)
router.post("/", guestOrHigher, apiLimiter, validateReview, addReview);

// GET /api/reviews/my — current user's own reviews
router.get("/my", guestOrHigher, getMyReviews);

// PUT /api/reviews/:id — update own review (ownership enforced in service)
router.put("/:id", guestOrHigher, validateObjectIdParam("id"), validateReview, updateReview);

// DELETE /api/reviews/:id — delete own review (ownership enforced in service)
router.delete("/:id", guestOrHigher, validateObjectIdParam("id"), deleteReview);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// GET /api/reviews/user/:userId — fetch any user's reviews
router.get(
  "/user/:userId",
  adminOnly,
  validateObjectIdParam("userId"),
  getReviewsByUser
);

module.exports = router;
