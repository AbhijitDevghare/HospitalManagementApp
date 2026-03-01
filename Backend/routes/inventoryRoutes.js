const express = require("express");
const router  = express.Router();

const {
  addInventoryItem,
  getAllInventoryItems,
  getLowStockAlerts,
  getInventorySummaryByCategory,
  getInventoryItemById,
  updateInventoryItem,
  updateStock,
  deleteInventoryItem,
} = require("../controllers/inventoryController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly, adminOrStaff }               = require("../middleware/roleMiddleware");
const { validateObjectIdParam }                 = require("../middleware/validationMiddleware");

// ─── All inventory routes require authentication ───────────────────────────────
router.use(authenticate);

// ─── Admin + Staff read routes ─────────────────────────────────────────────────

// GET /api/inventory/alerts — items at or below low-stock threshold
router.get("/alerts", adminOrStaff, getLowStockAlerts);

// GET /api/inventory/summary — aggregated stats grouped by category
router.get("/summary", adminOrStaff, getInventorySummaryByCategory);

// GET /api/inventory — full inventory list with optional ?category=&lowStock= filters
router.get("/", adminOrStaff, getAllInventoryItems);

// GET /api/inventory/:id — single item detail
router.get("/:id", adminOrStaff, validateObjectIdParam("id"), getInventoryItemById);

// ─── Admin-only write routes ───────────────────────────────────────────────────

// POST /api/inventory — add a new item
router.post("/", adminOnly, addInventoryItem);

// PUT /api/inventory/:id — update item details (name, category, threshold, etc.)
router.put("/:id", adminOnly, validateObjectIdParam("id"), updateInventoryItem);

// PATCH /api/inventory/:id/stock — add or remove stock units
router.patch("/:id/stock", adminOnly, validateObjectIdParam("id"), updateStock);

// DELETE /api/inventory/:id — remove an inventory item
router.delete("/:id", adminOnly, validateObjectIdParam("id"), deleteInventoryItem);

module.exports = router;
