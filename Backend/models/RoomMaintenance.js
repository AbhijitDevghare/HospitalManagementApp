const mongoose = require("mongoose");

const roomMaintenanceSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room reference is required"],
    },

    issueDescription: {
      type: String,
      required: [true, "Issue description is required"],
      trim: true,
      minlength: [10, "Issue description must be at least 10 characters long"],
      maxlength: [500, "Issue description cannot exceed 500 characters"],
    },

    maintenanceStatus: {
      type: String,
      enum: {
        values: ["pending", "in-progress", "completed"],
        message:
          "Maintenance status must be 'pending', 'in-progress', or 'completed'",
      },
      default: "pending",
    },

    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message:
          "Priority must be 'low', 'medium', 'high', or 'critical'",
      },
      default: "medium",
    },

    reportedDate: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (value) {
          // Reported date must not be in the future
          return value <= new Date();
        },
        message: "Reported date cannot be in the future",
      },
    },

    resolvedDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (value) {
          // resolvedDate must be after reportedDate (if provided)
          if (!value) return true;
          return value >= this.reportedDate;
        },
        message: "Resolved date must be on or after the reported date",
      },
    },

    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// ─── Pre-save hook: auto-set resolvedDate when status becomes completed ────────
roomMaintenanceSchema.pre("save", function (next) {
  if (
    this.isModified("maintenanceStatus") &&
    this.maintenanceStatus === "completed" &&
    !this.resolvedDate
  ) {
    this.resolvedDate = new Date();
  }
  next();
});

const RoomMaintenance = mongoose.model("RoomMaintenance", roomMaintenanceSchema);

module.exports = RoomMaintenance;
