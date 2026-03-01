const express = require("express");
const router  = express.Router();

const authRoutes        = require("./authRoutes");
const roomRoutes        = require("./roomRoutes");
const bookingRoutes     = require("./bookingRoutes");
const paymentRoutes     = require("./paymentRoutes");
const invoiceRoutes     = require("./invoiceRoutes");
const inventoryRoutes   = require("./inventoryRoutes");
const reviewRoutes      = require("./reviewRoutes");
const serviceRoutes     = require("./serviceRoutes");
const maintenanceRoutes = require("./maintenanceRoutes");
const staffRoutes       = require("./staffRoutes");

// ─── Mount all feature routers ────────────────────────────────────────────────
router.use("/auth",        authRoutes);
router.use("/rooms",       roomRoutes);
router.use("/bookings",    bookingRoutes);
router.use("/payments",    paymentRoutes);
router.use("/invoices",    invoiceRoutes);
router.use("/inventory",   inventoryRoutes);
router.use("/reviews",     reviewRoutes);
router.use("/services",    serviceRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/staff",       staffRoutes);

module.exports = router;
