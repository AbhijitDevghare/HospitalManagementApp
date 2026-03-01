const jwt    = require("jsonwebtoken");
const config = require("../config/env");

const JWT_OPTIONS = {
  issuer:   "hotel-management-system",
  audience: "hotel-management-client",
};

// ─── 1. Generate a signed JWT ─────────────────────────────────────────────────
const generateToken = (payload, expiresIn = config.JWT_EXPIRES_IN) =>
  jwt.sign(payload, config.JWT_SECRET, { ...JWT_OPTIONS, expiresIn });

// ─── 2. Verify a token and return decoded payload ─────────────────────────────
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET, JWT_OPTIONS);
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid or malformed token.";
    const error = new Error(message);
    error.statusCode = 401;
    throw error;
  }
};

// ─── 3. Decode without verification (logging / inspection only) ───────────────
const decodeToken = (token) => jwt.decode(token);

// ─── 4. Extract token from Authorization header ───────────────────────────────
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
};

// ─── 5. Check whether a token is expired (without throwing) ──────────────────
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
};

// ─── 6. Get remaining TTL in seconds ─────────────────────────────────────────
const getTokenTTL = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return 0;
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
};

// ─── 7. Build httpOnly cookie options ─────────────────────────────────────────
const getCookieOptions = (days = config.JWT_COOKIE_EXPIRE) => ({
  httpOnly: true,
  secure:   config.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   days * 24 * 60 * 60 * 1000,
});

// ─── 8. Expired cookie options (for logout) ───────────────────────────────────
const getExpiredCookieOptions = () => ({
  httpOnly: true,
  secure:   config.NODE_ENV === "production",
  sameSite: "strict",
  expires:  new Date(0),
});

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  extractBearerToken,
  isTokenExpired,
  getTokenTTL,
  getCookieOptions,
  getExpiredCookieOptions,
};
