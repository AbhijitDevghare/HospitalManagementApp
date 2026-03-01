const { calculateNights } = require("./dateUtils");
const config = require("../config/env");

// ─── Helper ───────────────────────────────────────────────────────────────────
const round2 = (n) => parseFloat(n.toFixed(2));

// ─── 1. Calculate room charges ────────────────────────────────────────────────
const calcRoomCharges = (pricePerNight, checkInDate, checkOutDate) => {
  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights <= 0) {
    const err = new Error("Check-out must be after check-in.");
    err.statusCode = 400;
    throw err;
  }
  return round2(pricePerNight * nights);
};

// ─── 2. Calculate total service charges from an array of service objects ──────
const calcServiceCharges = (services = []) =>
  round2(services.reduce((sum, s) => sum + (s.price || 0), 0));

// ─── 3. Calculate tax amount ──────────────────────────────────────────────────
const calcTax = (subtotal, taxRate = config.TAX_RATE) =>
  round2(subtotal * taxRate);

// ─── 4. Full booking cost breakdown ──────────────────────────────────────────
const calcBookingTotal = ({
  pricePerNight,
  checkInDate,
  checkOutDate,
  services  = [],
  taxRate   = config.TAX_RATE,
  discount  = 0,
}) => {
  const nights         = calculateNights(checkInDate, checkOutDate);
  const roomCharges    = calcRoomCharges(pricePerNight, checkInDate, checkOutDate);
  const serviceCharges = calcServiceCharges(services);
  const subtotal       = round2(roomCharges + serviceCharges);
  const discountAmt    = round2(subtotal * Math.min(Math.max(discount, 0), 1));
  const taxableAmount  = round2(subtotal - discountAmt);
  const taxes          = calcTax(taxableAmount, taxRate);
  const totalAmount    = round2(taxableAmount + taxes);

  return {
    nights,
    pricePerNight,
    roomCharges,
    serviceCharges,
    subtotal,
    discountRate: discount,
    discountAmount: discountAmt,
    taxRate,
    taxes,
    totalAmount,
  };
};

// ─── 5. Apply a percentage discount ──────────────────────────────────────────
const applyDiscount = (amount, discountPercent) => {
  const rate = Math.min(Math.max(discountPercent, 0), 100) / 100;
  return round2(amount * (1 - rate));
};

// ─── 6. Format a number as a currency string ──────────────────────────────────
const formatCurrency = (amount, currency = "INR", locale = "en-IN") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

module.exports = {
  round2,
  calcRoomCharges,
  calcServiceCharges,
  calcTax,
  calcBookingTotal,
  applyDiscount,
  formatCurrency,
};
