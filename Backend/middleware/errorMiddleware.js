const { NODE_ENV } = process.env;

// ─── Map Mongoose / MongoDB error names to clean messages ─────────────────────
const handleCastError = (err) => ({
  statusCode: 400,
  message: `Invalid value "${err.value}" for field "${err.path}".`,
});

const handleValidationError = (err) => ({
  statusCode: 422,
  message: "Validation failed.",
  errors: Object.values(err.errors).map((e) => ({
    field:   e.path,
    message: e.message,
  })),
});

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue?.[field];
  return {
    statusCode: 409,
    message: `Duplicate value: "${value}" for field "${field}" already exists.`,
  };
};

const handleJWTError = () => ({
  statusCode: 401,
  message: "Invalid token. Please log in again.",
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: "Token has expired. Please log in again.",
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Must be registered LAST in Express: app.use(errorHandler)
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";
  let errors     = undefined;

  // ── Mongoose: bad ObjectId cast ──
  if (err.name === "CastError") {
    ({ statusCode, message } = handleCastError(err));
  }

  // ── Mongoose: schema validation failure ──
  else if (err.name === "ValidationError") {
    ({ statusCode, message, errors } = handleValidationError(err));
  }

  // ── MongoDB: duplicate unique key (code 11000) ──
  else if (err.code === 11000) {
    ({ statusCode, message } = handleDuplicateKeyError(err));
  }

  // ── JWT: malformed token ──
  else if (err.name === "JsonWebTokenError") {
    ({ statusCode, message } = handleJWTError());
  }

  // ── JWT: expired token ──
  else if (err.name === "TokenExpiredError") {
    ({ statusCode, message } = handleJWTExpiredError());
  }

  const response = {
    success: false,
    statusCode,
    message,
    ...(errors && { errors }),
    // Include stack trace only in development
    ...(NODE_ENV === "development" && { stack: err.stack }),
  };

  // Log 5xx errors to console for server-side visibility
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
    if (NODE_ENV === "development") console.error(err.stack);
  }

  res.status(statusCode).json(response);
};

// ─── 404 Not Found handler ────────────────────────────────────────────────────
// Register BEFORE errorHandler: app.use(notFound) then app.use(errorHandler)
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
