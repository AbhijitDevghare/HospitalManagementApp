// ─── Authorize: restrict access to specific roles ─────────────────────────────
// Usage: router.delete("/rooms/:id", authenticate, authorizeRoles("admin"), handler)

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role check.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

// ─── Convenience guards ───────────────────────────────────────────────────────
const adminOnly      = authorizeRoles("admin");
const adminOrStaff   = authorizeRoles("admin", "staff");
const guestOrHigher  = authorizeRoles("admin", "staff", "guest");

// ─── Owner or admin: allow if user owns the resource OR is admin ───────────────
// Usage: authorizeOwnerOrAdmin(req => req.params.userId)
const authorizeOwnerOrAdmin = (getUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const resourceOwnerId = getUserId(req)?.toString();
    const requesterId     = req.user._id.toString();

    if (req.user.role === "admin" || requesterId === resourceOwnerId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You can only access your own resources.",
    });
  };
};

module.exports = {
  authorizeRoles,
  adminOnly,
  adminOrStaff,
  guestOrHigher,
  authorizeOwnerOrAdmin,
};
