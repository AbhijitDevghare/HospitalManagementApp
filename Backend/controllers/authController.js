const authService = require("../services/authService");
const asyncHandler = require("../middleware/asyncHandler");

// ─── Helper: send token response with cookie ──────────────────────────────────
const sendTokenResponse = (res, statusCode, user, token) => {
  const cookieOptions = {
    httpOnly: true,                                      // Prevents XSS access via JS
    secure:   process.env.NODE_ENV === "production",     // HTTPS only in production
    sameSite: "strict",                                  // CSRF protection
    maxAge:   7 * 24 * 60 * 60 * 1000,                  // 7 days in ms
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      token,
      data: { user },
    });
};

// ─── POST /api/auth/register ───────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const { user, token } = await authService.registerUser({
    name,
    email,
    password,
    phone,
    role,
  });

  sendTokenResponse(res, 201, user, token);
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser({ email, password });

  sendTokenResponse(res, 200, user, token);
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      httpOnly: true,
      expires:  new Date(0), // Immediately expire the cookie
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .json({
      success: true,
      message: "Logged out successfully.",
    });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by authenticate middleware
  const user = await authService.getUserById(req.user._id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// ─── PUT /api/auth/change-password ────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(req.user._id, {
    currentPassword,
    newPassword,
  });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
};
