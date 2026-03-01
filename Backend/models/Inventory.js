const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      minlength: [2, "Item name must be at least 2 characters long"],
      maxlength: [100, "Item name cannot exceed 100 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "linen",
          "toiletries",
          "food",
          "beverages",
          "cleaning",
          "electronics",
          "furniture",
          "other",
        ],
        message:
          "Category must be one of: linen, toiletries, food, beverages, cleaning, electronics, furniture, or other",
      },
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },

    unit: {
      type: String,
      trim: true,
      default: "units",
      maxlength: [20, "Unit label cannot exceed 20 characters"],
    },

    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Low stock threshold must be a whole number",
      },
    },

    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// ─── Virtual: Low stock flag ───────────────────────────────────────────────────
inventorySchema.virtual("isLowStock").get(function () {
  return this.quantity <= this.lowStockThreshold;
});

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
