const { sendEmail } = require("../config/emailConfig");
const { formatDate, formatStayDuration } = require("./dateUtils");
const { formatCurrency }                 = require("./priceUtils");

// ─── 1. Booking confirmation ──────────────────────────────────────────────────
const sendBookingConfirmationEmail = async (booking) => {
  const { user, room, checkInDate, checkOutDate, numberOfGuests, totalAmount, _id } = booking;

  await sendEmail({
    to:      user.email,
    subject: "🏨 Booking Confirmed – Hotel Management System",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2c3e50;">Booking Confirmed ✔</h2>
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
          <tr><td><strong>Booking ID</strong></td><td>${_id}</td></tr>
          <tr><td><strong>Room</strong></td><td>${room.roomNumber} (${room.roomType})</td></tr>
          <tr><td><strong>Stay</strong></td><td>${formatStayDuration(checkInDate, checkOutDate)}</td></tr>
          <tr><td><strong>Check-in</strong></td><td>${formatDate(checkInDate)}</td></tr>
          <tr><td><strong>Check-out</strong></td><td>${formatDate(checkOutDate)}</td></tr>
          <tr><td><strong>Guests</strong></td><td>${numberOfGuests}</td></tr>
          <tr><td><strong>Total Amount</strong></td><td>${formatCurrency(totalAmount)}</td></tr>
        </table>
        <p style="margin-top:16px;">We look forward to your stay!</p>
      </div>`,
    text: `Booking confirmed. ID: ${_id}. Total: ${formatCurrency(totalAmount)}.`,
  });
};

// ─── 2. Payment success ───────────────────────────────────────────────────────
const sendPaymentSuccessEmail = async (payment, user) => {
  const { _id, paymentAmount, paymentMethod, paymentDate, transactionId } = payment;

  await sendEmail({
    to:      user.email,
    subject: "💳 Payment Successful – Hotel Management System",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#27ae60;">Payment Successful ✔</h2>
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>We have received your payment. Details:</p>
        <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
          <tr><td><strong>Payment ID</strong></td><td>${_id}</td></tr>
          <tr><td><strong>Amount</strong></td><td>${formatCurrency(paymentAmount)}</td></tr>
          <tr><td><strong>Method</strong></td><td>${paymentMethod}</td></tr>
          <tr><td><strong>Date</strong></td><td>${formatDate(paymentDate)}</td></tr>
          ${transactionId ? `<tr><td><strong>Transaction ID</strong></td><td>${transactionId}</td></tr>` : ""}
        </table>
      </div>`,
    text: `Payment of ${formatCurrency(paymentAmount)} received. Transaction ID: ${transactionId || "N/A"}.`,
  });
};

// ─── 3. Invoice delivery ──────────────────────────────────────────────────────
const sendInvoiceEmail = async (invoice) => {
  const { _id, booking, roomCharges, serviceCharges, taxes, totalBill } = invoice;
  const user = booking.user;

  await sendEmail({
    to:      user.email,
    subject: "🧾 Your Invoice – Hotel Management System",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#2c3e50;">Invoice Summary</h2>
        <p>Dear <strong>${user.name}</strong>,</p>
        <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
          <tr><td><strong>Invoice ID</strong></td><td>${_id}</td></tr>
          <tr><td><strong>Room Charges</strong></td><td>${formatCurrency(roomCharges)}</td></tr>
          <tr><td><strong>Service Charges</strong></td><td>${formatCurrency(serviceCharges)}</td></tr>
          <tr><td><strong>Taxes (12%)</strong></td><td>${formatCurrency(taxes)}</td></tr>
          <tr style="background:#f0f0f0;"><td><strong>Total Bill</strong></td><td><strong>${formatCurrency(totalBill)}</strong></td></tr>
        </table>
        <p style="margin-top:16px;">Thank you for your stay!</p>
      </div>`,
    text: `Invoice total: ${formatCurrency(totalBill)}.`,
  });
};

// ─── 4. Booking cancellation ──────────────────────────────────────────────────
const sendCancellationEmail = async (booking) => {
  const { _id, user, room, checkInDate } = booking;

  await sendEmail({
    to:      user.email,
    subject: "❌ Booking Cancelled – Hotel Management System",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#e74c3c;">Booking Cancelled</h2>
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Your booking for room <strong>${room.roomNumber}</strong> on
           <strong>${formatDate(checkInDate)}</strong> (ID: <strong>${_id}</strong>)
           has been cancelled.</p>
        <p>If this was unintentional, please contact us immediately.</p>
      </div>`,
    text: `Booking ${_id} has been cancelled.`,
  });
};

// ─── 5. Low-stock admin alert ─────────────────────────────────────────────────
const sendLowStockAlertEmail = async (adminEmail, items = []) => {
  const rows = items
    .map((i) => `<tr><td>${i.itemName}</td><td>${i.category}</td><td>${i.currentQuantity} ${i.unit}</td><td>${i.threshold}</td><td>${i.deficit}</td></tr>`)
    .join("");

  await sendEmail({
    to:      adminEmail,
    subject: "⚠️ Low Stock Alert – Inventory Management",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;">
        <h2 style="color:#e67e22;">Low Stock Alert ⚠</h2>
        <p>${items.length} item(s) are at or below their minimum stock threshold:</p>
        <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
          <thead style="background:#f39c12;color:#fff;">
            <tr><th>Item</th><th>Category</th><th>Current Qty</th><th>Threshold</th><th>Deficit</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Please restock as soon as possible.</p>
      </div>`,
    text: `${items.length} inventory items need restocking.`,
  });
};

module.exports = {
  sendBookingConfirmationEmail,
  sendPaymentSuccessEmail,
  sendInvoiceEmail,
  sendCancellationEmail,
  sendLowStockAlertEmail,
};
