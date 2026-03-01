const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Constants ─────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// ─── Helper: Generate JWT Token ────────────────────────────────────────────────
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// ─── Helper: Strip sensitive fields from user object ──────────────────────────
const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

// ─── 1. Register a new user ────────────────────────────────────────────────────
const registerUser = async ({ name, email, password, phone, role }) => {
  // Check if email is already in use
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    phone,
    role,
  });

  const token = generateToken({ id: newUser._id, role: newUser.role });

  return { user: sanitizeUser(newUser), token };
};

// ─── 2. Login user ─────────────────────────────────────────────────────────────
const loginUser = async ({ email, password }) => {
  // Fetch user and explicitly select password (excluded by default in production)
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Compare provided password with hashed password in DB
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({ id: user._id, role: user.role });

  return { user: sanitizeUser(user), token };
};

// ─── 3. Get user profile by ID ─────────────────────────────────────────────────
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return sanitizeUser(user);
};

// ─── 4. Change password ────────────────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error("New password must differ from the current password");
    error.statusCode = 400;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  return { message: "Password updated successfully" };
};

// ─── 5. Verify JWT token ───────────────────────────────────────────────────────
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const error = new Error("Invalid or expired token");
    error.statusCode = 401;
    throw error;
  }
};

// ─── 6. Role-based authorization check ────────────────────────────────────────
const authorizeRoles = (...allowedRoles) => {
  return (userRole) => {
    if (!allowedRoles.includes(userRole)) {
      const error = new Error(
        `Access denied. Allowed roles: ${allowedRoles.join(", ")}`
      );
      error.statusCode = 403;
      throw error;
    }
    return true;
  };
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  changePassword,
  verifyToken,
  authorizeRoles,
};
