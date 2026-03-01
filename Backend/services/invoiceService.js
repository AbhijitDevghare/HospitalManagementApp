const Invoice = require("../models/Invoice");
const Booking = require("../models/Booking");

// ─── Constants ─────────────────────────────────────────────────────────────────
const TAX_RATE = 0.12; // 12% tax applied on room + service charges
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── Helper: Round to 2 decimal places ────────────────────────────────────────
const round2 = (value) => parseFloat(value.toFixed(2));

// ─── Helper: Calculate room charges from booking ──────────────────────────────
const calcRoomCharges = (pricePerNight, checkInDate, checkOutDate) => {
  const nights = Math.ceil(
    (new Date(checkOutDate) - new Date(checkInDate)) / MS_PER_DAY
  );
  return round2(pricePerNight * nights);
};

// ─── 1. Generate invoice for a booking ────────────────────────────────────────
const generateInvoice = async (bookingId, serviceCharges = 0) => {
  const booking = await Booking.findById(bookingId).populate("room");
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Cannot generate an invoice for a cancelled booking");
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate invoices for the same booking
  const existingInvoice = await Invoice.findOne({ booking: bookingId });
  if (existingInvoice) {
    return existingInvoice; // Idempotent: return existing invoice silently
  }

  const roomCharges     = calcRoomCharges(
    booking.room.pricePerNight,
    booking.checkInDate,
    booking.checkOutDate
  );
  const normalizedServiceCharges = round2(serviceCharges);
  const taxes                    = round2((roomCharges + normalizedServiceCharges) * TAX_RATE);
  const totalBill                = round2(roomCharges + normalizedServiceCharges + taxes);

  const invoice = await Invoice.create({
    booking:        bookingId,
    roomCharges,
    serviceCharges: normalizedServiceCharges,
    taxes,
    totalBill,
    invoiceDate:    new Date(),
    isPaid:         false,
  });

  return invoice.populate({
    path: "booking",
    populate: [
      { path: "user", select: "name email phone" },
      { path: "room", select: "roomNumber roomType pricePerNight" },
    ],
  });
};

// ─── 2. Get invoice by booking ID ─────────────────────────────────────────────
const getInvoiceByBookingId = async (bookingId) => {
  const invoice = await Invoice.findOne({ booking: bookingId }).populate({
    path: "booking",
    populate: [
      { path: "user", select: "name email phone" },
      { path: "room", select: "roomNumber roomType pricePerNight" },
    ],
  });

  if (!invoice) {
    const error = new Error("Invoice not found for this booking");
    error.statusCode = 404;
    throw error;
  }

  return invoice;
};

// ─── 3. Get invoice by invoice ID ─────────────────────────────────────────────
const getInvoiceById = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId).populate({
    path: "booking",
    populate: [
      { path: "user", select: "name email phone" },
      { path: "room", select: "roomNumber roomType pricePerNight" },
    ],
  });

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  return invoice;
};

// ─── 4. Mark invoice as paid ──────────────────────────────────────────────────
const markInvoiceAsPaid = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  if (invoice.isPaid) {
    const error = new Error("Invoice is already marked as paid");
    error.statusCode = 400;
    throw error;
  }

  invoice.isPaid = true;
  await invoice.save();

  return invoice;
};

// ─── 5. Get all invoices (admin) ──────────────────────────────────────────────
const getAllInvoices = async (filters = {}) => {
  const query = {};
  if (typeof filters.isPaid === "boolean") query.isPaid = filters.isPaid;

  const invoices = await Invoice.find(query)
    .populate({
      path: "booking",
      populate: { path: "user", select: "name email" },
    })
    .sort({ invoiceDate: -1 });

  return invoices;
};

// ─── 6. Calculate invoice breakdown (preview, no DB write) ────────────────────
const previewInvoice = (pricePerNight, checkInDate, checkOutDate, serviceCharges = 0) => {
  const roomCharges              = calcRoomCharges(pricePerNight, checkInDate, checkOutDate);
  const normalizedServiceCharges = round2(serviceCharges);
  const taxes                    = round2((roomCharges + normalizedServiceCharges) * TAX_RATE);
  const totalBill                = round2(roomCharges + normalizedServiceCharges + taxes);

  return {
    roomCharges,
    serviceCharges: normalizedServiceCharges,
    taxes,
    totalBill,
    taxRate: `${TAX_RATE * 100}%`,
  };
};

module.exports = {
  generateInvoice,
  getInvoiceByBookingId,
  getInvoiceById,
  markInvoiceAsPaid,
  getAllInvoices,
  previewInvoice,
};
