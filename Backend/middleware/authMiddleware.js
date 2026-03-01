const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// ─── Authenticate: verify JWT and attach user to req ─────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Token has expired. Please log in again."
          : "Invalid token. Authentication failed.";
      return res.status(401).json({ success: false, message });
    }

    // Fetch fresh user from DB to ensure account still exists / is not deactivated
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
    }

    req.user = user; // Attach to request for downstream middleware and controllers
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Optional auth: attach user if token present, continue either way ─────────
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user    = await User.findById(decoded.id).select("-password");
      if (user) req.user = user;
    } catch {
      // Token invalid — silently continue as unauthenticated
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, optionalAuthenticate };
