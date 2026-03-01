const express = require("express");
const router  = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  changePassword,
} = require("../controllers/authController");

const { authenticate }                    = require("../middleware/authMiddleware");
const { validateRegister, validateLogin } = require("../middleware/validationMiddleware");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimitMiddleware");

// ─── Public routes ─────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post("/register", authLimiter, validateRegister, register);

// POST /api/auth/login
router.post("/login", authLimiter, validateLogin, login);

// ─── Protected routes (JWT required) ──────────────────────────────────────────

// POST /api/auth/logout
router.post("/logout", authenticate, logout);

// GET /api/auth/me
router.get("/me", authenticate, getMe);

// PUT /api/auth/change-password
router.put("/change-password", authenticate, passwordResetLimiter, changePassword);

module.exports = router;
