const maintenanceService = require("../services/maintenanceService");
const asyncHandler       = require("../middleware/asyncHandler");

// ─── POST /api/maintenance ─── admin only ─────────────────────────────────────
const reportIssue = asyncHandler(async (req, res, next) => {
  try {
    const { roomId, issueDescription, priority, assignedStaff } = req.body;

    if (!roomId || !issueDescription) {
      return res.status(400).json({
        success: false,
        message: "roomId and issueDescription are required.",
      });
    }

    const record = await maintenanceService.reportIssue({
      roomId,
      issueDescription,
      priority,
      assignedStaff,
    });

    res.status(201).json({
      success: true,
      message: "Maintenance issue reported. Room is now flagged as under maintenance.",
      data: { record },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/maintenance ─── admin only ──────────────────────────────────────
const getAllMaintenanceRecords = asyncHandler(async (req, res, next) => {
  try {
    const { maintenanceStatus, priority, roomId, assignedStaff } = req.query;
    console.log("ROOOMS ID ", roomId);
    const records = await maintenanceService.getAllMaintenanceRecords({
      maintenanceStatus,
      priority,
      roomId,
      assignedStaff,
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: { records },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/maintenance/summary ─── admin only ─────────────────────────────
const getMaintenanceSummary = asyncHandler(async (req, res, next) => {
  try {
    const summary = await maintenanceService.getMaintenanceSummary();

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/maintenance/:id ─────────────────────────────────────────────────
const getMaintenanceById = asyncHandler(async (req, res, next) => {
  try {
    console.log(req.params.id);
    const record = await maintenanceService.getMaintenanceById(req.params.id);

    res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/maintenance/:id/status ─── admin only ────────────────────────
const updateMaintenanceStatus = asyncHandler(async (req, res, next) => {
  try {
    const { maintenanceStatus, assignedStaff } = req.body;

    if (!maintenanceStatus) {
      return res.status(400).json({
        success: false,
        message: "maintenanceStatus is required.",
      });
    }

    const record = await maintenanceService.updateMaintenanceStatus(
      req.params.id,
      { maintenanceStatus, assignedStaff }
    );

    // Build a contextual message based on the new status
    const statusMessages = {
      "in-progress": "Maintenance is now in progress.",
      completed:     "Maintenance completed. Room is now available.",
      pending:       "Maintenance status reverted to pending.",
    };

    res.status(200).json({
      success: true,
      message: statusMessages[maintenanceStatus] ?? "Maintenance status updated.",
      data: { record },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/maintenance/:id/assign ─── admin only ────────────────────────
const assignStaffToMaintenance = asyncHandler(async (req, res, next) => {
  try {
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId is required.",
      });
    }

    const record = await maintenanceService.assignStaffToMaintenance(
      req.params.id,
      staffId
    );

    res.status(200).json({
      success: true,
      message: "Staff assigned to maintenance record successfully.",
      data: { record },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/maintenance/:id ─── admin only ───────────────────────────────
const deleteMaintenanceRecord = asyncHandler(async (req, res, next) => {
  try {
    const result = await maintenanceService.deleteMaintenanceRecord(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  reportIssue,
  getAllMaintenanceRecords,
  getMaintenanceSummary,
  getMaintenanceById,
  updateMaintenanceStatus,
  assignStaffToMaintenance,
  deleteMaintenanceRecord,
};
