const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room reference is required"],
    },

    checkInDate: {
      type: Date,
      required: [true, "Check-in date is required"],
      validate: {
        validator: function (value) {
          // Check-in date must not be in the past
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        },
        message: "Check-in date cannot be in the past",
      },
    },

    checkOutDate: {
      type: Date,
      required: [true, "Check-out date is required"],
      validate: {
        validator: function (value) {
          // Check-out date must be strictly after check-in date
          return value > this.checkInDate;
        },
        message: "Check-out date must be after the check-in date",
      },
    },

    numberOfGuests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "At least 1 guest is required"],
      max: [20, "Number of guests cannot exceed 20"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    status: {
      type: String,
      enum: {
        values: ["confirmed", "cancelled", "completed"],
        message: "Status must be 'confirmed', 'cancelled', or 'completed'",
      },
      default: "confirmed",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// ─── Virtual: Number of nights ────────────────────────────────────────────────
bookingSchema.virtual("numberOfNights").get(function () {
  if (this.checkInDate && this.checkOutDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.ceil((this.checkOutDate - this.checkInDate) / msPerDay);
  }
  return 0;
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
