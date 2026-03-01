const { body, query, param, validationResult } = require("express-validator");

// ─── Helper: collect validation errors and respond ────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};



// ─── 1. User registration ─────────────────────────────────────────────────────
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 3, max: 50 }).withMessage("Name must be 3–50 characters."),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),

  body("phone")
    .optional()
    .matches(/^\+?[1-9]\d{7,14}$/).withMessage("Please provide a valid phone number."),

  body("role")
    .optional()
    .isIn(["admin", "guest"]).withMessage("Role must be 'admin' or 'guest'."),

  validate,
];

// ─── 2. User login ────────────────────────────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),

  validate,
];

// ─── 3. Booking creation ──────────────────────────────────────────────────────
const validateBooking = [
  body("roomId")
    .notEmpty().withMessage("Room ID is required.")
    .isMongoId().withMessage("Room ID must be a valid MongoDB ObjectId."),

  body("checkInDate")
    .notEmpty().withMessage("Check-in date is required.")
    .isISO8601().withMessage("Check-in date must be a valid ISO 8601 date.")
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(value) < today) throw new Error("Check-in date cannot be in the past.");
      return true;
    }),

  body("checkOutDate")
    .notEmpty().withMessage("Check-out date is required.")
    .isISO8601().withMessage("Check-out date must be a valid ISO 8601 date.")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.checkInDate)) {
        throw new Error("Check-out date must be after check-in date.");
      }
      return true;
    }),

  body("numberOfGuests")
    .notEmpty().withMessage("Number of guests is required.")
    .isInt({ min: 1, max: 20 }).withMessage("Number of guests must be between 1 and 20."),

  body("serviceCharges")
    .optional()
    .isFloat({ min: 0 }).withMessage("Service charges cannot be negative."),

  validate,
];

// ─── 4. Room creation / update ────────────────────────────────────────────────
const validateRoom = [
  body("roomNumber").trim().notEmpty().withMessage("Room number required"),

  body("roomType")
    .notEmpty()
    .isIn(["single","double","suite","deluxe","penthouse","family"]),

  body("pricePerNight").notEmpty().toFloat().isFloat({ min: 0.01 }),

  body("maxOccupancy").notEmpty().toInt().isInt({ min: 1, max: 20 }),

  body("status").optional().isIn(["available","booked","maintenance"]),

  body("amenities").optional().customSanitizer(v => [].concat(v || [])),

  validate,
];

// ─── 5. Payment processing ────────────────────────────────────────────────────
const validatePayment = [
  body("bookingId")
    .notEmpty().withMessage("Booking ID is required.")
    .isMongoId().withMessage("Booking ID must be a valid MongoDB ObjectId."),

  body("paymentAmount")
    .notEmpty().withMessage("Payment amount is required.")
    .isFloat({ min: 0.01 }).withMessage("Payment amount must be greater than 0."),

  body("paymentMethod")
    .notEmpty().withMessage("Payment method is required.")
    .isIn(["card", "UPI", "cash"]).withMessage("Payment method must be 'card', 'UPI', or 'cash'."),

  body("transactionId")
    .if(body("paymentMethod").isIn(["card", "UPI"]))
    .notEmpty().withMessage("Transaction ID is required for card and UPI payments."),

  validate,
];

// ─── 6. Review submission ─────────────────────────────────────────────────────
const validateReview = [
  body("roomId")
    .notEmpty().withMessage("Room ID is required.")
    .isMongoId().withMessage("Room ID must be a valid MongoDB ObjectId."),

  body("rating")
    .notEmpty().withMessage("Rating is required.")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be a whole number between 1 and 5."),

  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters."),

  validate,
];

// ─── 7. MongoDB ObjectId param validation ─────────────────────────────────────
const validateObjectIdParam = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`"${paramName}" must be a valid MongoDB ObjectId.`),
  validate,
];

// ─── 8. Pagination query params ───────────────────────────────────────────────
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100."),

  validate,
];


const validateUpdateRoom = [
  body("roomNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Room number required"),

  body("roomType")
    .optional()
    .isIn(["single","double","suite","deluxe","penthouse","family"]),

  body("pricePerNight")
    .optional()
    .toFloat()
    .isFloat({ min: 0.01 }),

  body("maxOccupancy")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 20 }),

  body("status")
    .optional()
    .isIn(["available","booked","maintenance"]),

  body("amenities")
    .optional()
    .customSanitizer(v => [].concat(v || [])),

  validate,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateBooking,
  validateRoom,
  validatePayment,
  validateReview,
  validateObjectIdParam,
  validatePagination,
  validate,
  validateUpdateRoom
};
