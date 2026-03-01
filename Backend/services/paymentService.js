const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const { generateInvoice } = require("./invoiceService");

// ─── 1. Process a new payment ─────────────────────────────────────────────────
const processPayment = async ({ bookingId, paymentAmount, paymentMethod, transactionId }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Cannot process payment for a cancelled booking");
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate payments for the same booking
  const existingPayment = await Payment.findOne({
    booking: bookingId,
    paymentStatus: "success",
  });

  if (existingPayment) {
    const error = new Error("A successful payment already exists for this booking");
    error.statusCode = 409;
    throw error;
  }

  // Validate amount matches booking total
  if (parseFloat(paymentAmount.toFixed(2)) !== parseFloat(booking.totalAmount.toFixed(2))) {
    const error = new Error(
      `Payment amount (${paymentAmount}) does not match booking total (${booking.totalAmount})`
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate transactionId for non-cash payments
  if (paymentMethod !== "cash" && !transactionId) {
    const error = new Error("Transaction ID is required for card and UPI payments");
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.create({
    booking:       bookingId,
    paymentAmount,
    paymentMethod,
    transactionId: transactionId || null,
    paymentStatus: "pending",
    paymentDate:   new Date(),
  });

  // Simulate payment gateway processing
  const processedPayment = await confirmPayment(payment._id);

  // Trigger invoice generation after successful payment
  if (processedPayment.paymentStatus === "success") {
    await generateInvoice(bookingId);
  }

  return processedPayment;
};

// ─── 2. Confirm (finalize) a payment ─────────────────────────────────────────
const confirmPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  if (payment.paymentStatus !== "pending") {
    const error = new Error(`Payment is already "${payment.paymentStatus}"`);
    error.statusCode = 400;
    throw error;
  }

  // In production, integrate real gateway response here
  payment.paymentStatus = "success";
  await payment.save();

  return payment.populate("booking");
};

// ─── 3. Mark a payment as failed ─────────────────────────────────────────────
const failPayment = async (paymentId, reason = "Payment failed") => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  if (payment.paymentStatus !== "pending") {
    const error = new Error(`Cannot fail a payment with status "${payment.paymentStatus}"`);
    error.statusCode = 400;
    throw error;
  }

  payment.paymentStatus = "failed";
  await payment.save();

  return { payment, reason };
};

// ─── 4. Get payment by booking ID ─────────────────────────────────────────────
const getPaymentByBookingId = async (bookingId) => {
  const payment = await Payment.findOne({ booking: bookingId })
    .populate({
      path: "booking",
      populate: [
        { path: "user", select: "name email" },
        { path: "room", select: "roomNumber roomType" },
      ],
    });

  if (!payment) {
    const error = new Error("No payment found for this booking");
    error.statusCode = 404;
    throw error;
  }

  return payment;
};

// ─── 5. Get payment by ID ─────────────────────────────────────────────────────
const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId).populate("booking");
  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }
  return payment;
};

// ─── 6. Get all payments (admin) ──────────────────────────────────────────────
const getAllPayments = async (filters = {}) => {
  const query = {};
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  const payments = await Payment.find(query)
    .populate({
      path: "booking",
      populate: { path: "user", select: "name email" },
    })
    .sort({ paymentDate: -1 });

  return payments;
};

module.exports = {
  processPayment,
  confirmPayment,
  failPayment,
  getPaymentByBookingId,
  getPaymentById,
  getAllPayments,
};
