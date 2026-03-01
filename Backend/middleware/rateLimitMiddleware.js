const rateLimit = require("express-rate-limit");

// ─── Helper: build a consistent rate-limit response ───────────────────────────
const rateLimitResponse = (message) => ({
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message,
      retryAfter: res.getHeader("Retry-After"),
    });
  },
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders:   false, // Disable deprecated X-RateLimit-* headers
});

// ─── 1. Global limiter — applied to all routes ────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      200,
  message:  "Too many requests from this IP. Please try again after 15 minutes.",
  ...rateLimitResponse("Too many requests. Please slow down."),
});

// ─── 2. Auth limiter — strict limit for login / register ─────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,              // Max 10 attempts per window
  skipSuccessfulRequests: true, // Only count failed/non-2xx responses
  ...rateLimitResponse(
    "Too many authentication attempts. Please try again after 15 minutes."
  ),
});

// ─── 3. API limiter — standard for general API endpoints ──────────────────────
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max:      100,
  ...rateLimitResponse(
    "Too many API requests from this IP. Please try again after 10 minutes."
  ),
});

// ─── 4. Upload limiter — restrict file upload frequency ───────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      30,
  ...rateLimitResponse(
    "Upload limit reached. You can upload at most 30 files per hour."
  ),
});

// ─── 5. Password reset limiter ────────────────────────────────────────────────
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      5,
  ...rateLimitResponse(
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
