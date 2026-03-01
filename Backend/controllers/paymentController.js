const paymentService = require("../services/paymentService");
const asyncHandler   = require("../middleware/asyncHandler");

// ─── POST /api/payments ────────────────────────────────────────────────────────
const processPayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentAmount, paymentMethod, transactionId } = req.body;

  const payment = await paymentService.processPayment({
    bookingId,
    paymentAmount,
    paymentMethod,
    transactionId,
  });

  res.status(201).json({
    success: true,
    message: "Payment processed successfully.",
    data: { payment },
  });
});

// ─── GET /api/payments ─── admin: all payments ────────────────────────────────
const getAllPayments = asyncHandler(async (req, res) => {
  const { paymentStatus, paymentMethod } = req.query;

  const payments = await paymentService.getAllPayments({
    paymentStatus,
    paymentMethod,
  });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: { payments },
  });
});

// ─── GET /api/payments/:id ─────────────────────────────────────────────────────
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);

  // Guests may only view payments linked to their own bookings
  if (
    req.user.role !== "admin" &&
    payment.booking?.user?.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own payment records.",
    });
  }

  res.status(200).json({
    success: true,
    data: { payment },
  });
});

// ─── GET /api/payments/booking/:bookingId ─────────────────────────────────────
const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentByBookingId(
    req.params.bookingId
  );

  // Guests may only view payments for their own bookings
  if (
    req.user.role !== "admin" &&
    payment.booking?.user?._id?.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own payment records.",
    });
  }

  res.status(200).json({
    success: true,
    data: { payment },
  });
});

// ─── PATCH /api/payments/:id/confirm ─── admin only ──────────────────────────
const confirmPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.confirmPayment(req.params.id);

  res.status(200).json({
    success: true,
    message: "Payment confirmed successfully.",
    data: { payment },
  });
});

// ─── PATCH /api/payments/:id/fail ─── admin only ─────────────────────────────
const failPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const result = await paymentService.failPayment(req.params.id, reason);

  res.status(200).json({
    success: true,
    message: "Payment marked as failed.",
    data: { payment: result.payment, reason: result.reason },
  });
});

module.exports = {
  processPayment,
  getAllPayments,
  getPaymentById,
  getPaymentByBookingId,
  confirmPayment,
  failPayment,
};
