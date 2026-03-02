const authService = require("../services/authService");
const asyncHandler = require("../middleware/asyncHandler");

// Helper: send token response with cookie
const sendTokenResponse = (res, statusCode, user, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({ success: true, token, data: { user } });
};

// POST /api/auth/register
const register = asyncHandler(async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const { user, token } = await authService.registerUser({ name, email, password, phone, role });
    return sendTokenResponse(res, 201, user, token);
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
const login = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser({ email, password });
    return sendTokenResponse(res, 200, user, token);
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res, next) => {
  try {
    res
      .status(200)
      .cookie("token", "", {
        httpOnly: true,
        expires:  new Date(0),
        secure:   process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user._id);
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user._id, { currentPassword, newPassword });
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    return next(err);
  }
});

module.exports = { register, login, logout, getMe, changePassword };
