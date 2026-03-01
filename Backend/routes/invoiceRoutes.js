const express = require("express");
const router  = express.Router();

const {
  generateInvoice,
  getAllInvoices,
  getInvoiceById,
  getInvoiceByBookingId,
  markInvoiceAsPaid,
  previewInvoice,
} = require("../controllers/invoiceController");

const { authenticate }                          = require("../middleware/authMiddleware");
const { adminOnly, guestOrHigher }              = require("../middleware/roleMiddleware");
const { validateObjectIdParam }                 = require("../middleware/validationMiddleware");

// ─── Public route (no auth required) ──────────────────────────────────────────

// GET /api/invoices/preview?pricePerNight=&checkInDate=&checkOutDate=&serviceCharges=
router.get("/preview", previewInvoice);

// ─── All remaining invoice routes require authentication ───────────────────────
router.use(authenticate);

// ─── Guest + Admin routes ──────────────────────────────────────────────────────

// GET /api/invoices/:id — ownership enforced in controller
router.get("/:id", guestOrHigher, validateObjectIdParam("id"), getInvoiceById);

// GET /api/invoices/booking/:bookingId — ownership enforced in controller
router.get(
  "/booking/:bookingId",
  guestOrHigher,
  validateObjectIdParam("bookingId"),
  getInvoiceByBookingId
);

// ─── Admin-only routes ─────────────────────────────────────────────────────────

// POST /api/invoices/generate — manually trigger invoice generation
router.post("/generate", adminOnly, generateInvoice);

// GET /api/invoices — list all invoices with optional ?isPaid= filter
router.get("/", adminOnly, getAllInvoices);

// PATCH /api/invoices/:id/pay — mark invoice as paid
router.patch("/:id/pay", adminOnly, validateObjectIdParam("id"), markInvoiceAsPaid);

module.exports = router;
