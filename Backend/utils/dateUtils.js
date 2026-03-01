const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── 1. Format a date to a readable string ────────────────────────────────────
const formatDate = (date, locale = "en-IN", options = {}) => {
  const defaults = { year: "numeric", month: "long", day: "numeric" };
  return new Date(date).toLocaleDateString(locale, { ...defaults, ...options });
};

// ─── 2. Format date to ISO date-only string (YYYY-MM-DD) ──────────────────────
const toISODate = (date) => new Date(date).toISOString().split("T")[0];

// ─── 3. Calculate number of nights between two dates ─────────────────────────
const calculateNights = (checkInDate, checkOutDate) => {
  const diff = new Date(checkOutDate) - new Date(checkInDate);
  return Math.ceil(diff / MS_PER_DAY);
};

// ─── 4. Validate check-in is not in the past ──────────────────────────────────
const isCheckInValid = (checkInDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(checkInDate) >= today;
};

// ─── 5. Validate check-out is strictly after check-in ────────────────────────
const isCheckOutValid = (checkInDate, checkOutDate) =>
  new Date(checkOutDate) > new Date(checkInDate);

// ─── 6. Validate both booking dates together ──────────────────────────────────
const validateBookingDates = (checkInDate, checkOutDate) => {
  const errors = [];
  if (!isCheckInValid(checkInDate))
    errors.push("Check-in date cannot be in the past.");
  if (!isCheckOutValid(checkInDate, checkOutDate))
    errors.push("Check-out date must be after check-in date.");
  return { valid: errors.length === 0, errors };
};

// ─── 7. Check if a date range overlaps with another ──────────────────────────
const doRangesOverlap = (startA, endA, startB, endB) => {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
};

// ─── 8. Add N days to a date ─────────────────────────────────────────────────
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ─── 9. Check if a date is today ─────────────────────────────────────────────
const isToday = (date) => toISODate(date) === toISODate(new Date());

// ─── 10. Get a human-readable stay duration string ────────────────────────────
const formatStayDuration = (checkInDate, checkOutDate) => {
  const nights = calculateNights(checkInDate, checkOutDate);
  return `${nights} night${nights !== 1 ? "s" : ""} (${toISODate(checkInDate)} → ${toISODate(checkOutDate)})`;
};

module.exports = {
  formatDate,
  toISODate,
  calculateNights,
  isCheckInValid,
  isCheckOutValid,
  validateBookingDates,
  doRangesOverlap,
  addDays,
  isToday,
  formatStayDuration,
};
