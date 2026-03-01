const express = require("express");
const router  = express.Router();

const {
  processPayment,
  getAllPayments,
  getPaymentById,
  getPaymentByBookingId,
  confirmPayment,
  failPayment,
} = require("../controllers/paymentController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly, guestOrHigher }              = require("../middleware/roleMiddleware");
const { validatePayment, validateObjectIdParam } = require("../middleware/validationMiddleware");
const { apiLimiter }                            = require("../middleware/rateLimitMiddleware");

// ─── All payment routes require authentication ─────────────────────────────────
router.use(authenticate);

// ─── Guest + Admin routes ──────────────────────────────────────────────────────

// POST /api/payments — initiate a new payment
router.post("/", guestOrHigher, apiLimiter, processPayment);

// GET /api/payments/:id — fetch single payment (ownership enforced in controller)
router.get("/:id", guestOrHigher, validateObjectIdParam("id"), getPaymentById);

// GET /api/payments/booking/:bookingId — fetch payment by booking (ownership enforced in controller)
router.get(
  "/booking/:bookingId",
  guestOrHigher,
  validateObjectIdParam("bookingId"),
  getPaymentByBookingId
);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// GET /api/payments — list all payments with optional filters
router.get("/", adminOnly, getAllPayments);

// PATCH /api/payments/:id/confirm — manually confirm a pending payment
router.patch("/:id/confirm", adminOnly, validateObjectIdParam("id"), confirmPayment);

// PATCH /api/payments/:id/fail — mark a pending payment as failed
router.patch("/:id/fail", adminOnly, validateObjectIdParam("id"), failPayment);

module.exports = router;
