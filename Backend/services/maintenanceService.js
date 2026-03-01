const RoomMaintenance = require("../models/RoomMaintenance");
const Room = require("../models/Room");
const Booking = require("../models/Booking");

// ─── 1. Report a new maintenance issue ───────────────────────────────────────
const reportIssue = async ({ roomId, issueDescription, priority, assignedStaff }) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  // Block reporting on a room with active confirmed bookings
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: "confirmed",
  });

  if (activeBooking) {
    const error = new Error(
      "Cannot flag a room for maintenance while it has an active confirmed booking. Cancel or complete the booking first."
    );
    error.statusCode = 400;
    throw error;
  }

  const maintenance = await RoomMaintenance.create({
    room:             roomId,
    issueDescription,
    priority:         priority || "medium",
    maintenanceStatus: "pending",
    reportedDate:     new Date(),
    assignedStaff:    assignedStaff || null,
  });

  // Automatically set the room status to maintenance
  await Room.findByIdAndUpdate(roomId, { status: "maintenance" });

  return maintenance.populate([
    { path: "room",          select: "roomNumber roomType" },
    { path: "assignedStaff", select: "name role" },
  ]);
};

// ─── 2. Get all maintenance records (with optional filters) ───────────────────
const getAllMaintenanceRecords = async (filters = {}) => {
  const query = {};

  if (filters.maintenanceStatus) query.maintenanceStatus = filters.maintenanceStatus;
  if (filters.priority)          query.priority          = filters.priority;
  if (filters.roomId)            query.room              = filters.roomNumber;
  // roomId Slightly changes to roomNumber
  if (filters.assignedStaff)     query.assignedStaff     = filters.assignedStaff;

  const records = await RoomMaintenance.find(query)
    .populate("room",          "roomNumber roomType status")
    .populate("assignedStaff", "name role phone")
    .sort({ createdAt: -1 });

  return records;
};

// ─── 3. Get a single maintenance record by ID ─────────────────────────────────
const getMaintenanceById = async (maintenanceId) => {
  const record = await RoomMaintenance.findById(maintenanceId)
    .populate("room",          "roomNumber roomType status")
    .populate("assignedStaff", "name role phone");

  if (!record) {
    const error = new Error("Maintenance record not found");
    error.statusCode = 404;
    throw error;
  }

  return record;
};

// ─── 4. Update maintenance status ─────────────────────────────────────────────
const updateMaintenanceStatus = async (maintenanceId, { maintenanceStatus, assignedStaff }) => {
  const record = await RoomMaintenance.findById(maintenanceId);
  if (!record) {
    const error = new Error("Maintenance record not found");
    error.statusCode = 404;
    throw error;
  }

  // Enforce valid status transitions
  const validTransitions = {
    pending:     ["in-progress"],
    "in-progress": ["completed", "pending"],
    completed:   [], // terminal state
  };

  if (
    maintenanceStatus &&
    maintenanceStatus !== record.maintenanceStatus &&
    !validTransitions[record.maintenanceStatus].includes(maintenanceStatus)
  ) {
    const error = new Error(
      `Invalid status transition: "${record.maintenanceStatus}" → "${maintenanceStatus}". ` +
      `Allowed: ${validTransitions[record.maintenanceStatus].join(", ") || "none (terminal state)"}`
    );
    error.statusCode = 400;
    throw error;
  }

  if (maintenanceStatus) record.maintenanceStatus = maintenanceStatus;
  if (assignedStaff)     record.assignedStaff     = assignedStaff;

  // Auto-set resolvedDate and restore room to available when completed
  if (maintenanceStatus === "completed") {
    record.resolvedDate = new Date();
    await Room.findByIdAndUpdate(record.room, { status: "available" });
  }

  // If reverted back to pending, re-flag room as under maintenance
  if (maintenanceStatus === "pending") {
    await Room.findByIdAndUpdate(record.room, { status: "maintenance" });
  }

  await record.save();

  return record.populate([
    { path: "room",          select: "roomNumber roomType status" },
    { path: "assignedStaff", select: "name role" },
  ]);
};

// ─── 5. Assign staff to a maintenance record ──────────────────────────────────
const assignStaffToMaintenance = async (maintenanceId, staffId) => {
  const record = await RoomMaintenance.findById(maintenanceId);
  if (!record) {
    const error = new Error("Maintenance record not found");
    error.statusCode = 404;
    throw error;
  }

  if (record.maintenanceStatus === "completed") {
    const error = new Error("Cannot reassign staff on a completed maintenance record");
    error.statusCode = 400;
    throw error;
  }

  record.assignedStaff = staffId;
  await record.save();

  return record.populate([
    { path: "room",          select: "roomNumber roomType" },
    { path: "assignedStaff", select: "name role phone" },
  ]);
};

// ─── 6. Delete a maintenance record ──────────────────────────────────────────
const deleteMaintenanceRecord = async (maintenanceId) => {
  const record = await RoomMaintenance.findById(maintenanceId);
  if (!record) {
    const error = new Error("Maintenance record not found");
    error.statusCode = 404;
    throw error;
  }

  if (record.maintenanceStatus !== "completed") {
    const error = new Error(
      "Only completed maintenance records can be deleted"
    );
    error.statusCode = 400;
    throw error;
  }

  await RoomMaintenance.findByIdAndDelete(maintenanceId);
  return { message: "Maintenance record deleted successfully" };
};

// ─── 7. Get maintenance summary stats ─────────────────────────────────────────
const getMaintenanceSummary = async () => {
  const summary = await RoomMaintenance.aggregate([
    {
      $group: {
        _id:   "$maintenanceStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { pending: 0, "in-progress": 0, completed: 0 };
  summary.forEach(({ _id, count }) => { result[_id] = count; });

  return result;
};

module.exports = {
  reportIssue,
  getAllMaintenanceRecords,
  getMaintenanceById,
  updateMaintenanceStatus,
  assignStaffToMaintenance,
  deleteMaintenanceRecord,
  getMaintenanceSummary,
};
