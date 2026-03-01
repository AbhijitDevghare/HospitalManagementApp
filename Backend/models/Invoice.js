const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking reference is required"],
    },

    roomCharges: {
      type: Number,
      required: [true, "Room charges are required"],
      min: [0, "Room charges cannot be negative"],
    },

    serviceCharges: {
      type: Number,
      required: [true, "Service charges are required"],
      min: [0, "Service charges cannot be negative"],
      default: 0,
    },

    taxes: {
      type: Number,
      required: [true, "Tax amount is required"],
      min: [0, "Tax amount cannot be negative"],
      default: 0,
    },

    totalBill: {
      type: Number,
      required: [true, "Total bill is required"],
      min: [0, "Total bill cannot be negative"],
      validate: {
        validator: function (value) {
          // totalBill must equal the sum of all charges and taxes
          const expected = this.roomCharges + this.serviceCharges + this.taxes;
          return Math.abs(value - expected) < 0.01; // float-safe tolerance
        },
        message:
          "Total bill must equal the sum of room charges, service charges, and taxes",
      },
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
