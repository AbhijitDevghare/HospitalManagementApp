const express = require("express");
const router  = express.Router();

const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  toggleServiceAvailability,
  deleteService,
  attachServicesToBooking,
  getServiceCostBreakdown,
} = require("../controllers/serviceController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly, guestOrHigher }              = require("../middleware/roleMiddleware");
const { validateObjectIdParam }                 = require("../middleware/validationMiddleware");
const { apiLimiter }                            = require("../middleware/rateLimitMiddleware");

// ─── Public routes ─────────────────────────────────────────────────────────────

// GET /api/services — list all services; ?category=&isAvailable= filters supported
router.get("/", getAllServices);

// GET /api/services/:id — single service detail
router.get("/:id", validateObjectIdParam("id"), getServiceById);

// ─── Authenticated routes ──────────────────────────────────────────────────────
router.use(authenticate);

// POST /api/services/breakdown — cost preview for a list of service IDs
router.post("/breakdown", guestOrHigher, apiLimiter, getServiceCostBreakdown);

// POST /api/services/attach — attach services to a confirmed booking
router.post("/attach", guestOrHigher, apiLimiter, attachServicesToBooking);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// POST /api/services — create a new hotel service
router.post("/", adminOnly, createService);

// PUT /api/services/:id — update service details
router.put("/:id", adminOnly, validateObjectIdParam("id"), updateService);

// PATCH /api/services/:id/toggle — toggle availability on/off
router.patch("/:id/toggle", adminOnly, validateObjectIdParam("id"), toggleServiceAvailability);

// DELETE /api/services/:id — remove a service
router.delete("/:id", adminOnly, validateObjectIdParam("id"), deleteService);

module.exports = router;
