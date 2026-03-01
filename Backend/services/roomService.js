const Room = require("../models/Room");
const Booking = require("../models/Booking");

// ─── 1. Create a new room ──────────────────────────────────────────────────────
const createRoom = async (roomData) => {
  const existingRoom = await Room.findOne({ roomNumber: roomData.roomNumber });
  if (existingRoom) {
    const error = new Error(
      `Room number "${roomData.roomNumber}" already exists`
    );
    error.statusCode = 409;
    throw error;
  }

  const room = await Room.create(roomData);
  return room;
};

// ─── 2. Get all rooms (with optional filters) ──────────────────────────────────
const getAllRooms = async (filters = {}) => {
  const query = {};

  if (filters.roomType) query.roomType = filters.roomType;
  if (filters.status)   query.status   = filters.status;

  if (filters.minPrice || filters.maxPrice) {
    query.pricePerNight = {};
    if (filters.minPrice) query.pricePerNight.$gte = Number(filters.minPrice);
    if (filters.maxPrice) query.pricePerNight.$lte = Number(filters.maxPrice);
  }

  if (filters.maxOccupancy) {
    query.maxOccupancy = { $gte: Number(filters.maxOccupancy) };
  }

  const rooms = await Room.find(query).sort({ roomNumber: 1 });
  return rooms;
};

// ─── 3. Get a single room by ID ────────────────────────────────────────────────
const getRoomById = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }
  return room;
};

// ─── 4. Update room details ────────────────────────────────────────────────────
const updateRoom = async (roomId, updateData) => {
  // Prevent roomNumber duplication if it is being changed
  if (updateData.roomNumber) {
    const duplicate = await Room.findOne({
      roomNumber: updateData.roomNumber,
      _id: { $ne: roomId },
    });
    if (duplicate) {
      const error = new Error(
        `Room number "${updateData.roomNumber}" is already in use`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const room = await Room.findByIdAndUpdate(
    roomId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  return room;
};

// ─── 5. Delete a room ─────────────────────────────────────────────────────────
const deleteRoom = async (roomId) => {
  // Block deletion if the room has active (confirmed) bookings
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: "confirmed",
  });

  if (activeBooking) {
    const error = new Error(
      "Cannot delete a room with active bookings. Cancel the bookings first."
    );
    error.statusCode = 400;
    throw error;
  }

  const room = await Room.findByIdAndDelete(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  return { message: `Room "${room.roomNumber}" deleted successfully` };
};

// ─── 6. Update room status ─────────────────────────────────────────────────────
const updateRoomStatus = async (roomId, status) => {
  const allowedStatuses = ["available", "booked", "maintenance"];
  if (!allowedStatuses.includes(status)) {
    const error = new Error(
      `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const room = await Room.findByIdAndUpdate(
    roomId,
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  return room;
};

// ─── 7. Check room availability for a date range ──────────────────────────────
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  if (room.status === "maintenance") {
    return {
      available: false,
      reason: "Room is currently under maintenance",
    };
  }

  // Look for any overlapping confirmed booking for this room
  const overlappingBooking = await Booking.findOne({
    room: roomId,
    status: "confirmed",
    $or: [
      // Existing booking starts within the requested range
      { checkInDate: { $lt: new Date(checkOutDate), $gte: new Date(checkInDate) } },
      // Existing booking ends within the requested range
      { checkOutDate: { $gt: new Date(checkInDate), $lte: new Date(checkOutDate) } },
      // Existing booking completely spans the requested range
      {
        checkInDate:  { $lte: new Date(checkInDate) },
        checkOutDate: { $gte: new Date(checkOutDate) },
      },
    ],
  });

  if (overlappingBooking) {
    return {
      available: false,
      reason: "Room is already booked for the selected dates",
    };
  }

  return { available: true, room };
};

// ─── 8. Get all available rooms for a date range ──────────────────────────────
const getAvailableRooms = async (checkInDate, checkOutDate, filters = {}) => {
  // Find room IDs that have overlapping confirmed bookings
  const bookedRooms = await Booking.find({
    status: "confirmed",
    $or: [
      { checkInDate:  { $lt: new Date(checkOutDate), $gte: new Date(checkInDate) } },
      { checkOutDate: { $gt: new Date(checkInDate),  $lte: new Date(checkOutDate) } },
      {
        checkInDate:  { $lte: new Date(checkInDate) },
        checkOutDate: { $gte: new Date(checkOutDate) },
      },
    ],
  }).distinct("room");

  const query = {
    _id:    { $nin: bookedRooms },
    status: { $ne: "maintenance" },
  };

  if (filters.roomType)    query.roomType      = filters.roomType;
  if (filters.maxOccupancy) query.maxOccupancy = { $gte: Number(filters.maxOccupancy) };
  if (filters.minPrice || filters.maxPrice) {
    query.pricePerNight = {};
    if (filters.minPrice) query.pricePerNight.$gte = Number(filters.minPrice);
    if (filters.maxPrice) query.pricePerNight.$lte = Number(filters.maxPrice);
  }

  const availableRooms = await Room.find(query).sort({ pricePerNight: 1 });
  return availableRooms;
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  checkRoomAvailability,
  getAvailableRooms,
};
