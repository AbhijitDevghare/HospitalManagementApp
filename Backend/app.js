const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const compression  = require("compression");
const path         = require("path");

// ─── Config imports ────────────────────────────────────────────────────────────
const corsOptions              = require("./config/corsConfig");
const { globalLimiter }        = require("./config/rateLimiter");
const { httpLogger }           = require("./config/logger");

// ─── Middleware imports ────────────────────────────────────────────────────────
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { setupSwagger }           = require("./docs/swaggerConfig");

// ─── Route index ──────────────────────────────────────────────────────────────
const apiRoutes = require("./routes/index");

// ─── Initialise Express app ────────────────────────────────────────────────────
const app = express();

// ════════════════════════════════════════════════════════════════════════════════
// 1. Security middleware
// ════════════════════════════════════════════════════════════════════════════════

// Set secure HTTP response headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow image serving
}));

// Enable CORS with configured whitelist and credential support
app.use(cors(corsOptions));

// Handle pre-flight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

// Sanitize req.body / req.query to prevent MongoDB operator injection
app.use(mongoSanitize());

// daily booking status change
require("./jobs/bookingStatus");

// ════════════════════════════════════════════════════════════════════════════════
// 2. Request parsing
// ════════════════════════════════════════════════════════════════════════════════

// Parse JSON bodies (limit prevents large payload attacks)
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ════════════════════════════════════════════════════════════════════════════════
// 3. Performance middleware
// ════════════════════════════════════════════════════════════════════════════════

// Compress all responses to reduce payload size
app.use(compression());

// ════════════════════════════════════════════════════════════════════════════════
// 4. Logging middleware
// ════════════════════════════════════════════════════════════════════════════════

// Morgan HTTP request logger piped into Winston
app.use(httpLogger);

// ════════════════════════════════════════════════════════════════════════════════
// 5. Global rate limiter
// ════════════════════════════════════════════════════════════════════════════════

// Applied before routes — protects every endpoint
app.use(globalLimiter);

// ════════════════════════════════════════════════════════════════════════════════
// 6. Static file serving — uploaded room images
// ════════════════════════════════════════════════════════════════════════════════

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge:  "1d",           // Cache images in browser for 1 day
    etag:    true,
    dotfiles: "deny",
  })
);

// ════════════════════════════════════════════════════════════════════════════════
// 7. API routes — all features mounted under /api
// ════════════════════════════════════════════════════════════════════════════════

app.use("/api", apiRoutes);

// ════════════════════════════════════════════════════════════════════════════════
// 8. Interactive API documentation (disabled in test env to avoid port conflicts)
// ════════════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV !== "test") {
  setupSwagger(app);
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. Health-check endpoint (no auth required)
// ════════════════════════════════════════════════════════════════════════════════

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Hotel Management API is running.",
    environment: process.env.NODE_ENV || "development",
    timestamp:   new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// 9. 404 handler — must come AFTER all routes
// ════════════════════════════════════════════════════════════════════════════════

app.use(notFound);

// ════════════════════════════════════════════════════════════════════════════════
// 10. Global error handler — must be LAST, after notFound
// ════════════════════════════════════════════════════════════════════════════════

app.use(errorHandler);

module.exports = app;
