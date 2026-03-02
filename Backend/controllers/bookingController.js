const bookingService = require("../services/bookingService");
const asyncHandler   = require("../middleware/asyncHandler");

// ─── POST /api/bookings ────────────────────────────────────────────────────────
const createBooking = asyncHandler(async (req, res, next) => {
  try {
    const { roomId, checkInDate, checkOutDate, numberOfGuests, serviceCharges } =
      req.body;

    console.log(req.body);
    const booking = await bookingService.createBooking({
      userId: req.user._id,
      roomId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      serviceCharges: serviceCharges || 0,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings ─── admin: all bookings ────────────────────────────────
const getAllBookings = asyncHandler(async (req, res, next) => {
  try {
    const { status, userId, roomId } = req.query;

    const bookings = await bookingService.getAllBookings({ status, userId, roomId });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings/my ─── current user's bookings ────────────────────────
const getMyBookings = asyncHandler(async (req, res, next) => {
  try {
    const { status } = req.query;

    const bookings = await bookingService.getAllBookings({
      userId: req.user._id,
      status,
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: { bookings },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/bookings/:id ─────────────────────────────────────────────────────
const getBookingById = asyncHandler(async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);

    // Guests may only view their own bookings; admins can view any
    if (
      req.user.role !== "admin" &&
      booking.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own bookings.",
      });
    }

    res.status(200).json({
      success: true,
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
const cancelBooking = asyncHandler(async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id,
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/bookings/:id/complete ─── admin only ──────────────────────────
const completeBooking = asyncHandler(async (req, res, next) => {
  try {
    const booking = await bookingService.completeBooking(req.params.id);

    res.status(200).json({
      success: true,
      message: "Booking marked as completed.",
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/bookings/:id/reschedule ──────────────────────────────────────
const rescheduleBooking = asyncHandler(async (req, res) => {
  const { checkInDate, checkOutDate } = req.body;

  if (!checkInDate || !checkOutDate) {
    return res.status(400).json({
      success: false,
      message: "Both checkInDate and checkOutDate are required for rescheduling.",
    });
  }

  // Verify requester owns the booking before rescheduling
  const existing = await bookingService.getBookingById(req.params.id);
  if (
    req.user.role !== "admin" &&
    existing.user._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only reschedule your own bookings.",
    });
  }

  const booking = await bookingService.rescheduleBooking(req.params.id, {
    checkInDate,
    checkOutDate,
  });

  res.status(200).json({
    success: true,
    message: "Booking rescheduled successfully.",
    data: { booking },
  });
});

module.exports = {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBookingById,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
};
