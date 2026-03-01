const rateLimit = require("express-rate-limit");
const config    = require("./env");

// ─── Helper: consistent JSON rate-limit response ──────────────────────────────
const buildHandler = (message) => ({
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) =>
    res.status(429).json({
      success:    false,
      statusCode: 429,
      message,
    }),
});

// ─── 1. Global limiter ────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max:      config.RATE_LIMIT_MAX,
  ...buildHandler("Too many requests. Please try again later."),
});

// ─── 2. Auth limiter (login / register) ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000, // 15 min
  max:                    100,
  skipSuccessfulRequests: true,
  ...buildHandler(
    "Too many authentication attempts. Please try again after 15 minutes."
  ),
});

// ─── 3. General API limiter ───────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max:      1000,
  ...buildHandler(
    "Too many API requests. Please try again after 10 minutes."
  ),
});

// ─── 4. Upload limiter ────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      300,
  ...buildHandler("Upload limit reached. Maximum 30 uploads per hour."),
});

// ─── 5. Password reset limiter ────────────────────────────────────────────────
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      100,
  ...buildHandler(
    "Too many password reset attempts. Please try again after 1 hour."
  ),
});

module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  passwordResetLimiter,
};
