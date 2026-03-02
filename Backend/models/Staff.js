const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please provide a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      match: [
        /^\+?[1-9]\d{7,14}$/,
        "Please provide a valid phone number (8–15 digits, optional leading +)",
      ],
    },

    role: {
      type: String,
      required: [true, "Staff role is required"],
      enum: {
        values: ["manager", "receptionist", "housekeeping","maintenance","security","chef","waiter","concierge","other"],
        message:
          "Role must be 'manager', 'receptionist', 'housekeeping' 'maintenance' security chef waiter concierge",
      },
    },

    salary: {
      type: Number,
      min: [0, "Salary cannot be negative"],
      validate: {
        validator: function (value) {
          // Salary must be a finite number if provided
          return value === undefined || isFinite(value);
        },
        message: "Salary must be a valid finite number",
      },
    },

    shiftTiming: {
      startTime: {
        type: String,
        trim: true,
        match: [
          /^([01]\d|2[0-3]):([0-5]\d)$/,
          "Start time must be in HH:MM (24-hour) format",
        ],
      },
      endTime: {
        type: String,
        trim: true,
        match: [
          /^([01]\d|2[0-3]):([0-5]\d)$/,
          "End time must be in HH:MM (24-hour) format",
        ],
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Staff = mongoose.model("Staff", staffSchema);

module.exports = Staff;
