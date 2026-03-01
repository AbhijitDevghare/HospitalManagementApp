const express = require("express");
const router  = express.Router();

const {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  checkRoomAvailability,
  getAvailableRooms,
} = require("../controllers/roomController");

const { authenticate }                    = require("../middleware/authMiddleware");
const { adminOnly }                       = require("../middleware/roleMiddleware");
const { validateRoom, validateObjectIdParam, validatePagination,validateUpdateRoom } = require("../middleware/validationMiddleware");
const { uploadMultiple }                  = require("../middleware/uploadMiddleware");
const { uploadLimiter }                   = require("../middleware/rateLimitMiddleware");
const { maintenanceGuard }                = require("../middleware/maintenanceGuard");

// ─── Public routes ─────────────────────────────────────────────────────────────

// GET /api/rooms/available?checkInDate=&checkOutDate=&roomType=&minPrice=&maxPrice=&maxOccupancy=
router.get("/available", getAvailableRooms);

// GET /api/rooms?roomType=&status=&minPrice=&maxPrice=&maxOccupancy=
router.get("/", validatePagination, getAllRooms);

// GET /api/rooms/:id
router.get("/:id", validateObjectIdParam("id"), getRoomById);

// GET /api/rooms/:id/availability?checkInDate=&checkOutDate=
router.get("/:id/availability", validateObjectIdParam("id"), checkRoomAvailability);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// POST /api/rooms
router.post(
  "/",
  authenticate,
  adminOnly,
  uploadMultiple, 
  uploadLimiter, 
  validateRoom, 
  createRoom
);

// PUT /api/rooms/:id
router.put(
  "/:id",
  authenticate,
  adminOnly,
  validateObjectIdParam("id"),
  uploadMultiple,
  uploadLimiter,
  validateUpdateRoom,     
  updateRoom
);
// PATCH /api/rooms/:id/status
router.patch(
  "/:id/status",
  authenticate,
  adminOnly,
  validateObjectIdParam("id"),
  updateRoomStatus
);

// DELETE /api/rooms/:id
router.delete(
  "/:id",
  authenticate,
  adminOnly,
  validateObjectIdParam("id"),
  deleteRoom
);

module.exports = router;
