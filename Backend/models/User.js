const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
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

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
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
      enum: {
        values: ["admin", "guest"],
        message: "Role must be either 'admin' or 'guest'",
      },
      default: "guest",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
