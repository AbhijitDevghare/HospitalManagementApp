const staffService = require("../services/staffService");
const asyncHandler = require("../middleware/asyncHandler");

// ─── POST /api/staff ─── admin only ───────────────────────────────────────────
const addStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.addStaff(req.body);

  res.status(201).json({
    success: true,
    message: "Staff member added successfully.",
    data: { staff },
  });
});

// ─── GET /api/staff ─── admin only ────────────────────────────────────────────
const getAllStaff = asyncHandler(async (req, res) => {
  const { role, isActive } = req.query;

  const staffList = await staffService.getAllStaff({ role, isActive });

  res.status(200).json({
    success: true,
    count: staffList.length,
    data: { staff: staffList },
  });
});

// ─── GET /api/staff/salary-summary ─── admin only ────────────────────────────
const getSalarySummaryByRole = asyncHandler(async (req, res) => {
  const summary = await staffService.getSalarySummaryByRole();

  res.status(200).json({
    success: true,
    count: summary.length,
    data: { summary },
  });
});

// ─── GET /api/staff/:id ────────────────────────────────────────────────────────
const getStaffById = asyncHandler(async (req, res) => {
  const staff = await staffService.getStaffById(req.params.id);

  res.status(200).json({
    success: true,
    data: { staff },
  });
});

// ─── PUT /api/staff/:id ─── admin only ────────────────────────────────────────
const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: "Staff details updated successfully.",
    data: { staff },
  });
});

// ─── PATCH /api/staff/:id/shift ─── admin only ───────────────────────────────
const updateShiftTiming = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "Both startTime and endTime are required (HH:MM 24-hour format).",
    });
  }

  const staff = await staffService.updateShiftTiming(req.params.id, {
    startTime,
    endTime,
  });

  res.status(200).json({
    success: true,
    message: `Shift timing updated to ${startTime} – ${endTime}.`,
    data: { staff },
  });
});

// ─── PATCH /api/staff/:id/deactivate ─── admin only ──────────────────────────
const deactivateStaff = asyncHandler(async (req, res) => {
  const result = await staffService.deactivateStaff(req.params.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: { staff: result.staff },
  });
});

// ─── PATCH /api/staff/:id/reactivate ─── admin only ──────────────────────────
const reactivateStaff = asyncHandler(async (req, res) => {
  const result = await staffService.reactivateStaff(req.params.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: { staff: result.staff },
  });
});

// ─── DELETE /api/staff/:id ─── admin only ─────────────────────────────────────
const deleteStaff = asyncHandler(async (req, res) => {
  const result = await staffService.deleteStaff(req.params.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  addStaff,
  getAllStaff,
  getSalarySummaryByRole,
  getStaffById,
  updateStaff,
  updateShiftTiming,
  deactivateStaff,
  reactivateStaff,
  deleteStaff,
};
