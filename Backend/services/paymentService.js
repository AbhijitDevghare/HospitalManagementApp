const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const { generateInvoice } = require("./invoiceService");
const Invoice = require("../models/Invoice")

const processPayment = async ({
  bookingId,
  paymentAmount,
  paymentMethod,
  transactionId,
}) => {
  console.log(bookingId,
  paymentAmount,
  paymentMethod,
  transactionId)

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

  if (!paymentAmount || paymentAmount <= 0) {
    const error = new Error("Invalid payment amount");
    error.statusCode = 400;
    throw error;
  }

  if (paymentMethod !== "cash" && !transactionId) {
    const error = new Error(
      "Transaction ID is required for card and UPI payments"
    );
    error.statusCode = 400;
    throw error;
  }

  // Ensure invoice exists
  let invoice = await Invoice.findOne({ booking: bookingId });

  if (!invoice) {
    invoice = await generateInvoice(bookingId, 0);
  }

  // Get already paid amount
  const successfulPayments = await Payment.find({
    booking: bookingId,
    paymentStatus: "success",
  });

  const totalPaid = successfulPayments.reduce(
    (sum, p) => sum + p.paymentAmount,
    0
  );

  const remainingAmount = Number(
    (invoice.totalBill - totalPaid).toFixed(2)
  );

  if (remainingAmount <= 0) {
    const error = new Error("This booking is already fully paid");
    error.statusCode = 400;
    throw error;
  }

  if (paymentAmount > remainingAmount) {
    const error = new Error(
      `Payment exceeds remaining balance (${remainingAmount})`
    );
    error.statusCode = 400;
    throw error;
  }

  // Create payment
  const payment = await Payment.create({
    booking: bookingId,
    paymentAmount,
    paymentMethod,
    transactionId: transactionId || null,
    paymentStatus: "success",
    paymentDate: new Date(),
  });

  const newTotalPaid = totalPaid + paymentAmount;
  console.log(newTotalPaid," ",invoice.totalBill)

  // Update invoice status correctly
  invoice.isPaid = newTotalPaid >= invoice.totalBill;
  await invoice.save();

  return payment;
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
