const Booking = require("../models/Booking");
const Room = require("../models/Room");

// ─── Constants ─────────────────────────────────────────────────────────────────
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── Helper: Calculate number of nights ───────────────────────────────────────
const calculateNights = (checkInDate, checkOutDate) => {
  const diff = new Date(checkOutDate) - new Date(checkInDate);
  return Math.ceil(diff / MS_PER_DAY);
};

// ─── Helper: Calculate total booking cost ─────────────────────────────────────
const calculateTotalCost = (pricePerNight, nights, serviceCharges = 0) => {
  if (nights <= 0) {
    const error = new Error("Check-out date must be after check-in date");
    error.statusCode = 400;
    throw error;
  }
  return parseFloat((pricePerNight * nights + serviceCharges).toFixed(2));
};

// ─── Helper: Check for overlapping bookings ────────────────────────────────────
const hasDateConflict = async (roomId, checkInDate, checkOutDate, excludeBookingId = null) => {
  const query = {
    room: roomId,
    status: "confirmed",
    $or: [
      { checkInDate:  { $lt: new Date(checkOutDate), $gte: new Date(checkInDate) } },
      { checkOutDate: { $gt: new Date(checkInDate),  $lte: new Date(checkOutDate) } },
      {
        checkInDate:  { $lte: new Date(checkInDate) },
        checkOutDate: { $gte: new Date(checkOutDate) },
      },
    ],
  };

  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const conflict = await Booking.findOne(query);
  return !!conflict;
};

// ─── 1. Create a new booking ───────────────────────────────────────────────────
const createBooking = async ({ userId, roomId, checkInDate, checkOutDate, numberOfGuests, serviceCharges = 0 }) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  if (room.status === "maintenance") {
    const error = new Error("Room is currently under maintenance and cannot be booked");
    error.statusCode = 400;
    throw error;
  }

  if (numberOfGuests > room.maxOccupancy) {
    const error = new Error(
      `Number of guests (${numberOfGuests}) exceeds room max occupancy (${room.maxOccupancy})`
    );
    error.statusCode = 400;
    throw error;
  }

  const conflict = await hasDateConflict(roomId, checkInDate, checkOutDate);
  if (conflict) {
    const error = new Error("Room is already booked for the selected dates");
    error.statusCode = 409;
    throw error;
  }

  const nights = calculateNights(checkInDate, checkOutDate);
  const totalAmount = calculateTotalCost(room.pricePerNight, nights, serviceCharges);

  const booking = await Booking.create({
    user: userId,
    room: roomId,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    totalAmount,
    status: "confirmed",
  });

  // Mark room as booked
  await Room.findByIdAndUpdate(roomId, { status: "booked" });

  return booking.populate(["user", "room"]);
};

// ─── 2. Get all bookings (with optional filters) ───────────────────────────────
const getAllBookings = async (filters = {}) => {
  const query = {};

  if (filters.status)  query.status  = filters.status;
  if (filters.userId)  query.user    = filters.userId;
  if (filters.roomId)  query.room    = filters.roomId;

  const bookings = await Booking.find(query)
    .populate("user", "name email phone")
    .populate("room", "roomNumber roomType pricePerNight")
    .sort({ createdAt: -1 });

  return bookings;
};

// ─── 3. Get a single booking by ID ────────────────────────────────────────────
const getBookingById = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate("user", "name email phone")
    .populate("room", "roomNumber roomType pricePerNight amenities");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  return booking;
};

// ─── 4. Cancel a booking ──────────────────────────────────────────────────────
const cancelBooking = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  // Only the booking owner or an admin can cancel
  if (userRole !== "admin" && booking.user.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to cancel this booking");
    error.statusCode = 403;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Booking is already cancelled");
    error.statusCode = 400;
    throw error;
  }

  if (booking.status === "completed") {
    const error = new Error("Completed bookings cannot be cancelled");
    error.statusCode = 400;
    throw error;
  }

  booking.status = "cancelled";
  await booking.save();

  // Free up the room only if no other active booking exists for it
  const otherActiveBooking = await Booking.findOne({
    room: booking.room,
    status: "confirmed",
    _id: { $ne: bookingId },
  });

  if (!otherActiveBooking) {
    await Room.findByIdAndUpdate(booking.room, { status: "available" });
  }

  return booking;
};

// ─── 5. Complete a booking ────────────────────────────────────────────────────
const completeBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== "confirmed") {
    const error = new Error(`Only confirmed bookings can be completed. Current status: "${booking.status}"`);
    error.statusCode = 400;
    throw error;
  }

  booking.status = "completed";
  await booking.save();

  // Set room back to available after check-out
  await Room.findByIdAndUpdate(booking.room, { status: "available" });

  return booking;
};

// ─── 6. Update booking dates (rescheduling) ────────────────────────────────────
const rescheduleBooking = async (bookingId, { checkInDate, checkOutDate }) => {
  const booking = await Booking.findById(bookingId).populate("room");
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== "confirmed") {
    const error = new Error("Only confirmed bookings can be rescheduled");
    error.statusCode = 400;
    throw error;
  }

  const conflict = await hasDateConflict(booking.room._id, checkInDate, checkOutDate, bookingId);
  if (conflict) {
    const error = new Error("Room is already booked for the new selected dates");
    error.statusCode = 409;
    throw error;
  }

  const nights = calculateNights(checkInDate, checkOutDate);
  const totalAmount = calculateTotalCost(booking.room.pricePerNight, nights);

  booking.checkInDate  = checkInDate;
  booking.checkOutDate = checkOutDate;
  booking.totalAmount  = totalAmount;
  await booking.save();

  return booking;
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
  calculateNights,
  calculateTotalCost,
};
