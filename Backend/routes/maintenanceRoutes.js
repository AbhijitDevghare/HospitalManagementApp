const express = require("express");
const router  = express.Router();

const {
  reportIssue,
  getAllMaintenanceRecords,
  getMaintenanceSummary,
  getMaintenanceById,
  updateMaintenanceStatus,
  assignStaffToMaintenance,
  deleteMaintenanceRecord,
} = require("../controllers/maintenanceController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly, adminOrStaff }               = require("../middleware/roleMiddleware");
const { validateObjectIdParam }                 = require("../middleware/validationMiddleware");

// ─── All maintenance routes require authentication ─────────────────────────────
router.use(authenticate);

// ─── Admin + Staff read routes ─────────────────────────────────────────────────

// GET /api/maintenance/summary — counts grouped by status { pending, in-progress, completed }
router.get("/summary", adminOrStaff, getMaintenanceSummary);

// GET /api/maintenance — all records; ?maintenanceStatus=&priority=&roomId=&assignedStaff= filters
router.get("/", adminOrStaff, getAllMaintenanceRecords);

// GET /api/maintenance/:id — single record with populated room + staff
router.get("/:id", adminOrStaff, validateObjectIdParam("id"), getMaintenanceById);

// ─── Admin-only write routes ───────────────────────────────────────────────────

// POST /api/maintenance — report a new room issue (auto-flags room as maintenance)
router.post("/", adminOnly, reportIssue);

// PATCH /api/maintenance/:id/status — transition status (pending → in-progress → completed)
router.patch(
  "/:id/status",
  adminOnly,
  validateObjectIdParam("id"),
  updateMaintenanceStatus
);

// PATCH /api/maintenance/:id/assign — assign or reassign a staff member
router.patch(
  "/:id/assign",
  adminOnly,
  validateObjectIdParam("id"),
  assignStaffToMaintenance
);

// DELETE /api/maintenance/:id — only completed records can be deleted
router.delete("/:id", adminOnly, validateObjectIdParam("id"), deleteMaintenanceRecord);

module.exports = router;
