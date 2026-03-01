const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
    },

    paymentAmount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
    },

    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["card", "UPI", "cash"],
        message: "Payment method must be 'card', 'UPI', or 'cash'",
      },
    },

    transactionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values (e.g., cash payments may lack a transaction ID)
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "success", "failed"],
        message: "Payment status must be 'pending', 'success', or 'failed'",
      },
      default: "pending",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (value) {
          // Payment date must not be set in the future
          return value <= new Date();
        },
        message: "Payment date cannot be in the future",
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
