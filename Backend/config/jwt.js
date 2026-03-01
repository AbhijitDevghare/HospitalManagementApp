const jwt    = require("jsonwebtoken");
const config = require("./env");

// ─── Generate a signed JWT ─────────────────────────────────────────────────────
const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    issuer:    "hotel-management-system",
    audience:  "hotel-management-client",
  });
};

// ─── Verify a JWT and return decoded payload ──────────────────────────────────
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET, {
      issuer:   "hotel-management-system",
      audience: "hotel-management-client",
    });
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token. Authentication failed.";
    const error = new Error(message);
    error.statusCode = 401;
    throw error;
  }
};

// ─── Decode without verification (for logging / inspection only) ───────────────
const decodeToken = (token) => jwt.decode(token);

// ─── Build cookie options from config ─────────────────────────────────────────
const getCookieOptions = () => ({
  httpOnly: true,
  secure:   config.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   config.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000, // convert days → ms
});

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  getCookieOptions,
};
