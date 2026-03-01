// ─── Load environment config first — before any other import ──────────────────
require("./config/env");

const app                    = require("./app");
const { connectDB }          = require("./config/db");
const { logger }             = require("./config/logger");
const { verifyEmailConnection } = require("./config/emailConfig");
const config                 = require("./config/env");

const PORT = config.PORT || 5000;

// ════════════════════════════════════════════════════════════════════════════════
// Boot sequence
// ════════════════════════════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Verify email transporter (warn only — does not block startup)
    await verifyEmailConnection();

    // 3. Start Express HTTP server
    const server = app.listen(PORT, () => {
      logger.info("─────────────────────────────────────────────");
      logger.info(`  🏨  Hotel Management API`);
      logger.info(`  🌍  Environment : ${config.NODE_ENV}`);
      logger.info(`  🚀  Server      : http://localhost:${PORT}`);
      logger.info(`  📡  API Base    : http://localhost:${PORT}/api`);
      logger.info(`  ❤️   Health      : http://localhost:${PORT}/health`);
      logger.info("─────────────────────────────────────────────");
    });

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const gracefulShutdown = (signal) => {
      logger.warn(`\n⚠  ${signal} received. Shutting down gracefully…`);
      server.close(async () => {
        logger.info("✔  HTTP server closed.");
        // connectDB's process listeners handle mongoose.connection.close()
        process.exit(0);
      });

      // Force-kill if server hasn't closed within 10 seconds
      setTimeout(() => {
        logger.error("✖  Forced shutdown after timeout.");
        process.exit(1);
      }, 10_000).unref(); // .unref() prevents this timer from keeping the loop alive
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

    return server;

  } catch (err) {
    logger.error(`✖  Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// Global safety nets — catch anything that slipped through
// ════════════════════════════════════════════════════════════════════════════════

// Unhandled promise rejections (e.g. a forgotten await in a service)
process.on("unhandledRejection", (reason) => {
  logger.error(`✖  Unhandled Promise Rejection: ${reason?.message || reason}`);
  if (reason?.stack) logger.error(reason.stack);
  // Exit so the process manager (PM2 / Docker) can restart cleanly
  process.exit(1);
});

// Synchronous thrown errors that were never caught
process.on("uncaughtException", (err) => {
  logger.error(`✖  Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

// ─── Start ────────────────────────────────────────────────────────────────────
startServer();
