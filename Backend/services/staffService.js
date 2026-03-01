const Staff = require("../models/Staff");

// ─── Helper: Validate shift timing logic ──────────────────────────────────────
const validateShiftTiming = (startTime, endTime) => {
  if (!startTime || !endTime) return; // Both must be present to validate

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH,   endM]   = endTime.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins   = endH   * 60 + endM;

  // Allow overnight shifts (e.g. 22:00 → 06:00)
  if (startMins === endMins) {
    const error = new Error("Shift start time and end time cannot be the same");
    error.statusCode = 400;
    throw error;
  }
};

// ─── 1. Add a new staff member ────────────────────────────────────────────────
const addStaff = async (staffData) => {
  const existing = await Staff.findOne({
    email: staffData.email.toLowerCase(),
  });

  if (existing) {
    const error = new Error(
      `A staff member with email "${staffData.email}" already exists`
    );
    error.statusCode = 409;
    throw error;
  }

  if (staffData.shiftTiming) {
    validateShiftTiming(
      staffData.shiftTiming.startTime,
      staffData.shiftTiming.endTime
    );
  }

  const staff = await Staff.create(staffData);
  return staff;
};

// ─── 2. Get all staff (with optional filters) ─────────────────────────────────
const getAllStaff = async (filters = {}) => {
  const query = {};

  if (filters.role)     query.role     = filters.role;
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === "true" || filters.isActive === true;
  }

  const staffList = await Staff.find(query).sort({ role: 1, name: 1 });
  return staffList;
};

// ─── 3. Get a single staff member by ID ───────────────────────────────────────
const getStaffById = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }
  return staff;
};

// ─── 4. Update staff details ──────────────────────────────────────────────────
const updateStaff = async (staffId, updateData) => {
  // Guard against email collision
  if (updateData.email) {
    const duplicate = await Staff.findOne({
      email: updateData.email.toLowerCase(),
      _id: { $ne: staffId },
    });
    if (duplicate) {
      const error = new Error(
        `Email "${updateData.email}" is already in use by another staff member`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // Validate shift timing if being updated
  if (updateData.shiftTiming) {
    validateShiftTiming(
      updateData.shiftTiming.startTime,
      updateData.shiftTiming.endTime
    );
  }

  // Salary cannot be negative
  if (updateData.salary !== undefined && updateData.salary < 0) {
    const error = new Error("Salary cannot be negative");
    error.statusCode = 400;
    throw error;
  }

  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  return staff;
};

// ─── 5. Deactivate a staff member (soft delete) ───────────────────────────────
const deactivateStaff = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  if (!staff.isActive) {
    const error = new Error("Staff member is already deactivated");
    error.statusCode = 400;
    throw error;
  }

  staff.isActive = false;
  await staff.save();

  return { message: `Staff member "${staff.name}" has been deactivated`, staff };
};

// ─── 6. Reactivate a staff member ─────────────────────────────────────────────
const reactivateStaff = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  if (staff.isActive) {
    const error = new Error("Staff member is already active");
    error.statusCode = 400;
    throw error;
  }

  staff.isActive = true;
  await staff.save();

  return { message: `Staff member "${staff.name}" has been reactivated`, staff };
};

// ─── 7. Hard delete a staff member ────────────────────────────────────────────
const deleteStaff = async (staffId) => {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  if (staff.isActive) {
    const error = new Error(
      "Deactivate the staff member before deleting their record"
    );
    error.statusCode = 400;
    throw error;
  }

  await Staff.findByIdAndDelete(staffId);
  return { message: `Staff record for "${staff.name}" permanently deleted` };
};

// ─── 8. Update shift timing ───────────────────────────────────────────────────
const updateShiftTiming = async (staffId, { startTime, endTime }) => {
  validateShiftTiming(startTime, endTime);

  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { $set: { "shiftTiming.startTime": startTime, "shiftTiming.endTime": endTime } },
    { new: true, runValidators: true }
  );

  if (!staff) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  return staff;
};

// ─── 9. Get salary summary by role ────────────────────────────────────────────
const getSalarySummaryByRole = async () => {
  const summary = await Staff.aggregate([
    { $match: { isActive: true, salary: { $exists: true, $ne: null } } },
    {
      $group: {
        _id:           "$role",
        headCount:     { $sum: 1 },
        totalSalary:   { $sum: "$salary" },
        averageSalary: { $avg: "$salary" },
        minSalary:     { $min: "$salary" },
        maxSalary:     { $max: "$salary" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return summary.map((r) => ({
    role:          r._id,
    headCount:     r.headCount,
    totalSalary:   parseFloat(r.totalSalary.toFixed(2)),
    averageSalary: parseFloat(r.averageSalary.toFixed(2)),
    minSalary:     r.minSalary,
    maxSalary:     r.maxSalary,
  }));
};

module.exports = {
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
  deleteStaff,
  updateShiftTiming,
  getSalarySummaryByRole,
};
