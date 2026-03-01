const mongoose = require("mongoose");

// ─── 1. Email format ──────────────────────────────────────────────────────────
const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(String(email).trim());

// ─── 2. Phone number (international format, 8–15 digits) ─────────────────────
const isValidPhone = (phone) =>
  /^\+?[1-9]\d{7,14}$/.test(String(phone).trim());

// ─── 3. MongoDB ObjectId ──────────────────────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── 4. Positive number (> 0) ────────────────────────────────────────────────
const isPositiveNumber = (value) =>
  typeof value === "number" && isFinite(value) && value > 0;

// ─── 5. Non-negative number (>= 0) ───────────────────────────────────────────
const isNonNegative = (value) =>
  typeof value === "number" && isFinite(value) && value >= 0;

// ─── 6. Positive integer ──────────────────────────────────────────────────────
const isPositiveInteger = (value) =>
  Number.isInteger(value) && value > 0;

// ─── 7. Value is within a numeric range (inclusive) ──────────────────────────
const isInRange = (value, min, max) =>
  typeof value === "number" && value >= min && value <= max;

// ─── 8. Rating (1–5 integer) ─────────────────────────────────────────────────
const isValidRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

// ─── 9. Non-empty string ──────────────────────────────────────────────────────
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// ─── 10. String length within bounds ─────────────────────────────────────────
const isStringInLength = (value, min = 0, max = Infinity) => {
  const len = String(value).trim().length;
  return len >= min && len <= max;
};

// ─── 11. Check required fields are present and non-empty on an object ─────────
const checkRequiredFields = (obj, requiredKeys = []) => {
  const missing = requiredKeys.filter(
    (key) => obj[key] === undefined || obj[key] === null || obj[key] === ""
  );
  return {
    valid:   missing.length === 0,
    missing,
    message: missing.length > 0 ? `Missing required fields: ${missing.join(", ")}.` : null,
  };
};

// ─── 12. Validate enum value ──────────────────────────────────────────────────
const isValidEnum = (value, allowedValues = []) => allowedValues.includes(value);

// ─── 13. ISO 8601 date string ─────────────────────────────────────────────────
const isValidISODate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && typeof value === "string" && value.includes("T") === false
    ? /^\d{4}-\d{2}-\d{2}$/.test(value)
    : !isNaN(date.getTime());
};

// ─── 14. Password strength ────────────────────────────────────────────────────
const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[0-9]/.test(password);

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  isPositiveNumber,
  isNonNegative,
  isPositiveInteger,
  isInRange,
  isValidRating,
  isNonEmptyString,
  isStringInLength,
  checkRequiredFields,
  isValidEnum,
  isValidISODate,
  isStrongPassword,
};
