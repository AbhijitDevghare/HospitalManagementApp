const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
    },

    roomType: {
      type: String,
      required: [true, "Room type is required"],
      enum: {
        values: ["single","double","suite","deluxe","penthouse","family"],
        message: "Room type must be 'single', 'double', or 'deluxe'",
      },
    },

    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price per night cannot be negative"],
    },

    maxOccupancy: {
      type: Number,
      required: [true, "Maximum occupancy is required"],
      min: [1, "Maximum occupancy must be at least 1"],
      max: [20, "Maximum occupancy cannot exceed 20"],
    },

    amenities: {
      type: [String],
      default: [],
    },

    images: {
      type: [
        {
          url: {
            type: String,
            required: [true, "Image URL is required"],
            trim: true,
          },
          altText: {
            type: String,
            trim: true,
            default: "Room Image",
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: ["available", "booked", "maintenance"],
        message: "Status must be 'available', 'booked', or 'maintenance'",
      },
      default: "available",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
