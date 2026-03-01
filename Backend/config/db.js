const mongoose = require("mongoose");

// ─── Connection state tracker ──────────────────────────────────────────────────
let isConnected = false;

// ─── Connection options ────────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,   // Fail fast if no server found within 5s
  socketTimeoutMS:          45000,  // Close sockets after 45s of inactivity
  maxPoolSize:              10,     // Max concurrent connections in the pool
};

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
const connectDB = async () => {
  if (isConnected) {
    console.log("ℹ️  MongoDB: Reusing existing connection.");
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("✖  MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    isConnected = true;
    console.log(`✔  MongoDB connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (err) {
    console.error(`✖  MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

// ─── Mongoose event listeners ──────────────────────────────────────────────────
mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("⚠  MongoDB disconnected. Attempting to reconnect…");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("✔  MongoDB reconnected successfully.");
});

mongoose.connection.on("error", (err) => {
  console.error(`✖  MongoDB runtime error: ${err.message}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  console.log("✔  MongoDB connection closed gracefully.");
};

// Close on process termination signals
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((signal) => {
  process.once(signal, async () => {
    await disconnectDB();
    process.exit(0);
  });
});

module.exports = { connectDB, disconnectDB };
