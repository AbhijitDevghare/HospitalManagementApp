const winston = require("winston");
const morgan  = require("morgan");
const path    = require("path");
const fs      = require("fs");
const config  = require("./env");

const { combine, timestamp, printf, colorize, errors, json } = winston.format;
const isDev = config.NODE_ENV !== "production";

// ─── Ensure log directory exists ──────────────────────────────────────────────
const LOG_DIR = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ─── Console format (development) ─────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack }) =>
    stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`
  )
);

// ─── JSON format (production — structured for log aggregators) ────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ─── Winston logger instance ──────────────────────────────────────────────────
const logger = winston.createLogger({
  level:      isDev ? "debug" : "info",
  format:     isDev ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),

    // Rotating file: all info+ logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, "app.log"),
      level:    "info",
      maxsize:  10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),

    // Rotating file: errors only
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level:    "error",
      maxsize:  10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// ─── Morgan HTTP request logger (streams into Winston) ────────────────────────
const morganStream = {
  write: (message) => logger.http(message.trim()),
};

const morganFormat = isDev ? "dev" : "combined";
const httpLogger   = morgan(morganFormat, { stream: morganStream });

module.exports = { logger, httpLogger };
