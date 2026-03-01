const path = require("path");
const fs   = require("fs");

// ─── Load .env file based on NODE_ENV ─────────────────────────────────────────
const envFile = process.env.NODE_ENV === "production"
  ? ".env.production"
  : ".env.development";

const envPath = path.resolve(process.cwd(), envFile);

// Fall back to plain .env if environment-specific file not found
const fallbackPath = path.resolve(process.cwd(), ".env");
const resolvedPath = fs.existsSync(envPath) ? envPath : fallbackPath;

require("dotenv").config({ path: resolvedPath });

// ─── Validate required environment variables ───────────────────────────────────
const REQUIRED_VARS = [
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`✖  Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ─── Centralized config object ────────────────────────────────────────────────
const config = {
  // ── Server ──
  NODE_ENV:   process.env.NODE_ENV    || "development",
  PORT:       parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL  || "http://localhost:3000",

  // ── Database ──
  MONGO_URI:  process.env.MONGO_URI,

  // ── JWT ──
  JWT_SECRET:     process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_COOKIE_EXPIRE: parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 7, // days

  // ── Upload ──
  MAX_FILE_SIZE:  parseInt(process.env.MAX_FILE_SIZE, 10)  || 5 * 1024 * 1024, // 5 MB
  MAX_FILE_COUNT: parseInt(process.env.MAX_FILE_COUNT, 10) || 10,
  UPLOAD_PATH:    process.env.UPLOAD_PATH || "uploads/rooms",

  // ── Rate Limiting ──
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX:       parseInt(process.env.RATE_LIMIT_MAX, 10)       || 200,

  // ── Payment Gateway (Razorpay / Stripe) ──
  PAYMENT_GATEWAY:        process.env.PAYMENT_GATEWAY        || "razorpay",
  RAZORPAY_KEY_ID:        process.env.RAZORPAY_KEY_ID        || "",
  RAZORPAY_KEY_SECRET:    process.env.RAZORPAY_KEY_SECRET    || "",
  STRIPE_SECRET_KEY:      process.env.STRIPE_SECRET_KEY      || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_WEBHOOK_SECRET:  process.env.STRIPE_WEBHOOK_SECRET  || "",

  // ── Email / SMTP ──
  EMAIL_SERVICE:  process.env.EMAIL_SERVICE  || "gmail",
  EMAIL_HOST:     process.env.EMAIL_HOST     || "smtp.gmail.com",
  EMAIL_PORT:     parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_SECURE:   process.env.EMAIL_SECURE   === "true",
  EMAIL_USER:     process.env.EMAIL_USER     || "",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "",
  EMAIL_FROM:     process.env.EMAIL_FROM     || "Hotel Management <noreply@hotel.com>",

  // ── Tax ──
  TAX_RATE: parseFloat(process.env.TAX_RATE || "0.12"),
};

module.exports = config;
