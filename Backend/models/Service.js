const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      minlength: [3, "Service name must be at least 3 characters long"],
      maxlength: [100, "Service name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be a positive value greater than 0"],
    },

    category: {
      type: String,
      trim: true,
      enum: {
        values: [
          "spa",
          "laundry",
          "dining",
          "transport",
          "housekeeping",
          "concierge",
          "other",
        ],
        message:
          "Category must be one of: spa, laundry, dining, transport, housekeeping, concierge, or other",
      },
      default: "other",
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
