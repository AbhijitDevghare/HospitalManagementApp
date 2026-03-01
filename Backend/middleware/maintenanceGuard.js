const Room = require("../models/Room");

// ─── maintenanceGuard: block booking requests for rooms under maintenance ─────
// Expects req.body.roomId OR req.params.roomId to identify the room.
// Usage: router.post("/bookings", authenticate, maintenanceGuard, asyncHandler(createBooking))

const maintenanceGuard = async (req, res, next) => {
  try {
    const roomId = req.body.roomId || req.params.roomId;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required to check maintenance status.",
      });
    }

    const room = await Room.findById(roomId).select("roomNumber status");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    if (room.status === "maintenance") {
      return res.status(403).json({
        success: false,
        message: `Room ${room.roomNumber} is currently under maintenance and cannot be booked.`,
        roomStatus: room.status,
      });
    }

    // Attach room to request so downstream service can reuse it without re-querying
    req.room = room;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── roomStatusGuard: generic guard for any set of blocked statuses ────────────
// Usage: roomStatusGuard("booked", "maintenance") blocks those statuses
const roomStatusGuard = (...blockedStatuses) => {
  return async (req, res, next) => {
    try {
      const roomId = req.body.roomId || req.params.roomId;

      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: "Room ID is required.",
        });
      }

      const room = await Room.findById(roomId).select("roomNumber status");

      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Room not found.",
        });
      }

      if (blockedStatuses.includes(room.status)) {
        return res.status(403).json({
          success: false,
          message: `Room ${room.roomNumber} has status "${room.status}" and cannot be used for this operation.`,
          roomStatus: room.status,
        });
      }

      req.room = room;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { maintenanceGuard, roomStatusGuard };
