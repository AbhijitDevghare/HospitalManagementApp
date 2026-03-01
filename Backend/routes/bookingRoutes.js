const express = require("express");
const router  = express.Router();

const {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBookingById,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
} = require("../controllers/bookingController");

const { authenticate }                      = require("../middleware/authMiddleware");
const { adminOnly, guestOrHigher }          = require("../middleware/roleMiddleware");
const { validateBooking, validateObjectIdParam, validatePagination } = require("../middleware/validationMiddleware");
const { maintenanceGuard }                  = require("../middleware/maintenanceGuard");

// ─── All booking routes require authentication ─────────────────────────────────
router.use(authenticate);

// ─── Guest + Admin routes ──────────────────────────────────────────────────────

// POST /api/bookings — maintenanceGuard blocks booking if room is under maintenance
router.post("/", guestOrHigher, validateBooking, maintenanceGuard, createBooking);

// GET /api/bookings/my — current user's own bookings
router.get("/my", guestOrHigher, validatePagination, getMyBookings);

// GET /api/bookings/:id — owner or admin
router.get("/:id", guestOrHigher, validateObjectIdParam("id"), getBookingById);

// PATCH /api/bookings/:id/cancel — owner or admin
router.patch("/:id/cancel", guestOrHigher, validateObjectIdParam("id"), cancelBooking);

// PATCH /api/bookings/:id/reschedule — owner or admin
router.patch("/:id/reschedule", guestOrHigher, validateObjectIdParam("id"), rescheduleBooking);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// GET /api/bookings — all bookings dashboard
router.get("/", adminOnly, validatePagination, getAllBookings);

// PATCH /api/bookings/:id/complete
router.patch("/:id/complete", adminOnly, validateObjectIdParam("id"), completeBooking);

module.exports = router;
