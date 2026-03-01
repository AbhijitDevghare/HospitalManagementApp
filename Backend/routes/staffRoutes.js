const express = require("express");
const router  = express.Router();

const {
  addStaff,
  getAllStaff,
  getSalarySummaryByRole,
  getStaffById,
  updateStaff,
  updateShiftTiming,
  deactivateStaff,
  reactivateStaff,
  deleteStaff,
} = require("../controllers/staffController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly }                             = require("../middleware/roleMiddleware");
const { validateObjectIdParam }                 = require("../middleware/validationMiddleware");

// ─── All staff routes are admin-only ──────────────────────────────────────────
router.use(authenticate, adminOnly);

// ─── Aggregate / list routes (declared before /:id to avoid param conflicts) ───

// GET /api/staff/salary-summary — headcount + salary stats grouped by role
router.get("/salary-summary", getSalarySummaryByRole);

// GET /api/staff — full staff list; ?role=&isActive= filters supported
router.get("/", getAllStaff);

// ─── Single resource routes ────────────────────────────────────────────────────

// POST /api/staff — create a new staff member
router.post("/", addStaff);

// GET /api/staff/:id — single staff member detail
router.get("/:id", validateObjectIdParam("id"), getStaffById);

// PUT /api/staff/:id — update staff details (name, email, role, salary, etc.)
router.put("/:id", validateObjectIdParam("id"), updateStaff);

// PATCH /api/staff/:id/shift — update shift start and end times only
router.patch("/:id/shift", validateObjectIdParam("id"), updateShiftTiming);

// PATCH /api/staff/:id/deactivate — soft delete (sets isActive: false)
router.patch("/:id/deactivate", validateObjectIdParam("id"), deactivateStaff);

// PATCH /api/staff/:id/reactivate — reverse a deactivation
router.patch("/:id/reactivate", validateObjectIdParam("id"), reactivateStaff);

// DELETE /api/staff/:id — hard delete (requires prior deactivation)
router.delete("/:id", validateObjectIdParam("id"), deleteStaff);

module.exports = router;
