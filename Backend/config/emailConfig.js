const nodemailer = require("nodemailer");
const config     = require("./env");
const { logger } = require("./logger");

// ─── Create reusable transporter ──────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host:   config.EMAIL_HOST,
    port:   config.EMAIL_PORT,
    secure: config.EMAIL_SECURE, // true for port 465, false for 587
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: config.NODE_ENV === "production",
    },
  });

// Singleton transporter
let _transporter = null;
const getTransporter = () => {
  if (!_transporter) _transporter = createTransporter();
  return _transporter;
};

// ─── Verify SMTP connection on startup ────────────────────────────────────────
const verifyEmailConnection = async () => {
  try {
    await getTransporter().verify();
    logger.info("✔  Email transporter ready.");
  } catch (err) {
    logger.warn(`⚠  Email transporter verification failed: ${err.message}`);
  }
};

// ─── Base send helper ─────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  const info = await getTransporter().sendMail({
    from:    config.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  logger.info(`✔  Email sent to ${to} [messageId: ${info.messageId}]`);
  return info;
};

// ─── 1. Booking confirmation email ────────────────────────────────────────────
const sendBookingConfirmation = async ({ to, guestName, roomNumber, checkInDate, checkOutDate, totalAmount, bookingId }) => {
  const subject = "🏨 Booking Confirmed – Hotel Management System";
  const html = `
    <h2>Booking Confirmation</h2>
    <p>Dear <strong>${guestName}</strong>,</p>
    <p>Your booking has been confirmed. Here are the details:</p>
    <table border="1" cellpadding="8" cellspacing="0">
      <tr><td><strong>Booking ID</strong></td><td>${bookingId}</td></tr>
      <tr><td><strong>Room</strong></td><td>${roomNumber}</td></tr>
      <tr><td><strong>Check-in</strong></td><td>${new Date(checkInDate).toDateString()}</td></tr>
      <tr><td><strong>Check-out</strong></td><td>${new Date(checkOutDate).toDateString()}</td></tr>
      <tr><td><strong>Total Amount</strong></td><td>₹${totalAmount}</td></tr>
    </table>
    <p>Thank you for choosing us. We look forward to your stay!</p>
  `;
  return sendEmail({ to, subject, html, text: `Booking confirmed. ID: ${bookingId}` });
};

// ─── 2. Invoice email ─────────────────────────────────────────────────────────
const sendInvoiceEmail = async ({ to, guestName, invoiceId, roomCharges, serviceCharges, taxes, totalBill }) => {
  const subject = "🧾 Your Invoice – Hotel Management System";
  const html = `
    <h2>Invoice</h2>
    <p>Dear <strong>${guestName}</strong>,</p>
    <p>Please find your invoice summary below:</p>
    <table border="1" cellpadding="8" cellspacing="0">
      <tr><td><strong>Invoice ID</strong></td><td>${invoiceId}</td></tr>
      <tr><td><strong>Room Charges</strong></td><td>₹${roomCharges}</td></tr>
      <tr><td><strong>Service Charges</strong></td><td>₹${serviceCharges}</td></tr>
      <tr><td><strong>Taxes (12%)</strong></td><td>₹${taxes}</td></tr>
      <tr><td><strong>Total Bill</strong></td><td>₹${totalBill}</td></tr>
    </table>
    <p>Thank you for staying with us!</p>
  `;
  return sendEmail({ to, subject, html, text: `Invoice total: ₹${totalBill}` });
};

// ─── 3. Low-stock alert email (admin notification) ────────────────────────────
const sendLowStockAlert = async ({ to, items }) => {
  const subject = "⚠️ Low Stock Alert – Hotel Inventory";
  const rows    = items.map((i) =>
    `<tr><td>${i.itemName}</td><td>${i.category}</td><td>${i.currentQuantity} ${i.unit}</td><td>${i.threshold}</td></tr>`
  ).join("");
  const html = `
    <h2>Low Stock Alert</h2>
    <p>The following inventory items are at or below their minimum threshold:</p>
    <table border="1" cellpadding="8" cellspacing="0">
      <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Threshold</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Please restock as soon as possible.</p>
  `;
  return sendEmail({ to, subject, html, text: `${items.length} item(s) are low on stock.` });
};

// ─── 4. Booking cancellation email ────────────────────────────────────────────
const sendBookingCancellation = async ({ to, guestName, bookingId }) => {
  const subject = "❌ Booking Cancelled – Hotel Management System";
  const html = `
    <h2>Booking Cancelled</h2>
    <p>Dear <strong>${guestName}</strong>,</p>
    <p>Your booking (<strong>${bookingId}</strong>) has been cancelled as requested.</p>
    <p>If this was a mistake, please contact us immediately.</p>
  `;
  return sendEmail({ to, subject, html, text: `Booking ${bookingId} has been cancelled.` });
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendInvoiceEmail,
  sendLowStockAlert,
  sendBookingCancellation,
  verifyEmailConnection,
  getTransporter,
};
