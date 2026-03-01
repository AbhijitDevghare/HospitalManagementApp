const inventoryService = require("../services/inventoryService");
const asyncHandler     = require("../middleware/asyncHandler");

// ─── POST /api/inventory ──────────────────────────────────────────────────────
const addInventoryItem = asyncHandler(async (req, res, next) => {
  try {
    const item = await inventoryService.addInventoryItem(req.body);

    res.status(201).json({
      success: true,
      message: "Inventory item added successfully.",
      data: { item },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory ───────────────────────────────────────────────────────
const getAllInventoryItems = asyncHandler(async (req, res, next) => {
  try {
    const { category, lowStock } = req.query;

    const items = await inventoryService.getAllInventoryItems({
      category,
      lowStock,
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: { items },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory/:id ───────────────────────────────────────────────────
const getInventoryItemById = asyncHandler(async (req, res, next) => {
  try {
    const item = await inventoryService.getInventoryItemById(req.params.id);

    res.status(200).json({
      success: true,
      data: { item },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/inventory/:id/stock ──────────────────────────────────────────
const updateStock = asyncHandler(async (req, res, next) => {
  try {
    const { operation, amount } = req.body;
    console.log(operation,amount)

    const result = await inventoryService.updateStock(req.params.id, {
      operation,
      amount,
    });

    res.status(200).json({
      success: true,
      message: `Stock ${operation === "add" ? "added" : "removed"} successfully.`,
      data: result,
    });
  } catch (err) {
    console.log("EROOR UPDATE INVENORY : ",err.message)
    next(err);
  }
});

// ─── PUT /api/inventory/:id ───────────────────────────────────────────────────
const updateInventoryItem = asyncHandler(async (req, res, next) => {
  try {
    const item = await inventoryService.updateInventoryItem(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully.",
      data: { item },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/inventory/:id ────────────────────────────────────────────────
const deleteInventoryItem = asyncHandler(async (req, res, next) => {
  try {
    const result = await inventoryService.deleteInventoryItem(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory/alerts/low-stock ─────────────────────────────────────
const getLowStockAlerts = asyncHandler(async (req, res, next) => {
  try {
    const result = await inventoryService.getLowStockAlerts();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory/summary/category ─────────────────────────────────────
const getInventorySummaryByCategory = asyncHandler(async (req, res, next) => {
  try {
    const summary = await inventoryService.getInventorySummaryByCategory();

    res.status(200).json({
      success: true,
      count: summary.length,
      data: { summary },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  addInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateStock,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockAlerts,
  getInventorySummaryByCategory,
};
