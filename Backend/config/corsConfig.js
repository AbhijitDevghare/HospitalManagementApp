const config = require("./env");

// ─── Allowed origins list ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  config.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173", // Vite default
].filter(Boolean);

// ─── Origin validator ─────────────────────────────────────────────────────────
const originValidator = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, Postman)
  if (!origin) return callback(null, true);

  if (ALLOWED_ORIGINS.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS: Origin "${origin}" is not allowed.`));
  }
};

// ─── CORS options object ──────────────────────────────────────────────────────
const corsOptions = {
  origin:               originValidator,
  methods:              ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders:       ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders:       ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  credentials:          true,   // Allow cookies and Authorization headers
  optionsSuccessStatus: 200,    // IE11 compatibility (204 breaks some clients)
  maxAge:               86400,  // Cache preflight for 24 hours (seconds)
};

module.exports = corsOptions;
