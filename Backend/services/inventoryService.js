const Inventory = require("../models/Inventory");

// ─── 1. Add a new inventory item ──────────────────────────────────────────────
const addInventoryItem = async (itemData) => {
  const existing = await Inventory.findOne({
    itemName: { $regex: new RegExp(`^${itemData.itemName}$`, "i") },
    category: itemData.category,
  });

  if (existing) {
    const error = new Error(
      `Item "${itemData.itemName}" already exists in category "${itemData.category}". Use updateStock instead.`
    );
    error.statusCode = 409;
    throw error;
  }

  const item = await Inventory.create(itemData);
  return item;
};

// ─── 2. Get all inventory items (with optional filters) ───────────────────────
const getAllInventoryItems = async (filters = {}) => {
  const query = {};

  if (filters.category) query.category = filters.category;

  if (filters.lowStock === "true" || filters.lowStock === true) {
    // Fetch items where quantity is at or below their individual threshold
    query.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  }

  const items = await Inventory.find(query).sort({ category: 1, itemName: 1 });
  return items;
};

// ─── 3. Get a single inventory item by ID ─────────────────────────────────────
const getInventoryItemById = async (itemId) => {
  const item = await Inventory.findById(itemId);
  if (!item) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }
  return item;
};

// ─── 4. Update stock quantity (add or remove) ─────────────────────────────────
const updateStock = async (itemId, { operation ,amount}) => {
  if (!["add", "remove"].includes(operation)) {
    const error = new Error("Operation must be 'add' or 'remove'");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("Amount must be a positive whole number");
    error.statusCode = 400;
    throw error;
  }

  const item = await Inventory.findById(itemId);
  if (!item) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }

  if (operation === "remove") {
    if (item.quantity - amount < 0) {
      const error = new Error(
        `Insufficient stock. Available: ${item.quantity} ${item.unit}, Requested: ${amount} ${item.unit}`
      );
      error.statusCode = 400;
      throw error;
    }
    item.quantity -= amount;
  } else {
    item.quantity += amount;
  }

  item.lastUpdatedDate = new Date();
  await item.save();

  // Return item with low stock alert flag
  return {
    item,
    lowStockAlert: item.quantity <= item.lowStockThreshold
      ? {
          triggered: true,
          message: `Low stock alert: "${item.itemName}" has only ${item.quantity} ${item.unit} remaining (threshold: ${item.lowStockThreshold})`,
        }
      : { triggered: false },
  };
};

// ─── 5. Update inventory item details ─────────────────────────────────────────
const updateInventoryItem = async (itemId, updateData) => {
  // Prevent quantity from going negative via direct update
  if (updateData.quantity !== undefined && updateData.quantity < 0) {
    const error = new Error("Quantity cannot be set to a negative value");
    error.statusCode = 400;
    throw error;
  }

  if (updateData.quantity !== undefined) {
    updateData.lastUpdatedDate = new Date();
  }

  const item = await Inventory.findByIdAndUpdate(
    itemId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!item) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }

  return item;
};

// ─── 6. Delete an inventory item ──────────────────────────────────────────────
const deleteInventoryItem = async (itemId) => {
  const item = await Inventory.findByIdAndDelete(itemId);
  if (!item) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }
  return { message: `Inventory item "${item.itemName}" deleted successfully` };
};

// ─── 7. Get all low stock alerts ──────────────────────────────────────────────
const getLowStockAlerts = async () => {
  const lowStockItems = await Inventory.find({
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
  }).sort({ quantity: 1 });

  return {
    count: lowStockItems.length,
    items: lowStockItems.map((item) => ({
      id:               item._id,
      itemName:         item.itemName,
      category:         item.category,
      currentQuantity:  item.quantity,
      unit:             item.unit,
      threshold:        item.lowStockThreshold,
      deficit:          item.lowStockThreshold - item.quantity,
    })),
  };
};

// ─── 8. Get inventory summary by category ─────────────────────────────────────
const getInventorySummaryByCategory = async () => {
  const summary = await Inventory.aggregate([
    {
      $group: {
        _id:            "$category",
        totalItems:     { $sum: 1 },
        totalQuantity:  { $sum: "$quantity" },
        lowStockCount:  {
          $sum: {
            $cond: [{ $lte: ["$quantity", "$lowStockThreshold"] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return summary;
};

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
