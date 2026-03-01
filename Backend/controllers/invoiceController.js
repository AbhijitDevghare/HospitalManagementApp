const invoiceService = require("../services/invoiceService");
const asyncHandler   = require("../middleware/asyncHandler");

// ─── POST /api/invoices/generate ─── admin only ───────────────────────────────
const generateInvoice = asyncHandler(async (req, res) => {
  const { bookingId, serviceCharges } = req.body;

  if (!bookingId) {
    return res.status(400).json({
      success: false,
      message: "bookingId is required to generate an invoice.",
    });
  }

  const invoice = await invoiceService.generateInvoice(
    bookingId,
    serviceCharges || 0
  );

  res.status(201).json({
    success: true,
    message: "Invoice generated successfully.",
    data: { invoice },
  });
});

// ─── GET /api/invoices ─── admin: all invoices ────────────────────────────────
const getAllInvoices = asyncHandler(async (req, res) => {
  const filters = {};

  // Convert query string "true"/"false" to boolean for isPaid filter
  if (req.query.isPaid !== undefined) {
    filters.isPaid = req.query.isPaid === "true";
  }

  const invoices = await invoiceService.getAllInvoices(filters);

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: { invoices },
  });
});

// ─── GET /api/invoices/:id ─────────────────────────────────────────────────────
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);

  // Guests may only view invoices tied to their own bookings
  if (
    req.user.role !== "admin" &&
    invoice.booking?.user?._id?.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own invoices.",
    });
  }

  res.status(200).json({
    success: true,
    data: { invoice },
  });
});

// ─── GET /api/invoices/booking/:bookingId ─────────────────────────────────────
const getInvoiceByBookingId = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByBookingId(
    req.params.bookingId
  );

  // Guests may only view invoices for their own bookings
  if (
    req.user.role !== "admin" &&
    invoice.booking?.user?._id?.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own invoices.",
    });
  }

  res.status(200).json({
    success: true,
    data: { invoice },
  });
});

// ─── PATCH /api/invoices/:id/pay ─── admin only ───────────────────────────────
const markInvoiceAsPaid = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.markInvoiceAsPaid(req.params.id);

  res.status(200).json({
    success: true,
    message: "Invoice marked as paid.",
    data: { invoice },
  });
});

// ─── GET /api/invoices/preview ─────────────────────────────────────────────────
const previewInvoice = asyncHandler(async (req, res) => {
  const { pricePerNight, checkInDate, checkOutDate, serviceCharges } = req.query;

  if (!pricePerNight || !checkInDate || !checkOutDate) {
    return res.status(400).json({
      success: false,
      message: "pricePerNight, checkInDate, and checkOutDate are required.",
    });
  }

  const breakdown = invoiceService.previewInvoice(
    parseFloat(pricePerNight),
    checkInDate,
    checkOutDate,
    parseFloat(serviceCharges || 0)
  );

  res.status(200).json({
    success: true,
    data: { breakdown },
  });
});

module.exports = {
  generateInvoice,
  getAllInvoices,
  getInvoiceById,
  getInvoiceByBookingId,
  markInvoiceAsPaid,
  previewInvoice,
};
