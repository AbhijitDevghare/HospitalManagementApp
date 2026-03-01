const roomService = require("../services/roomService");
const asyncHandler = require("../middleware/asyncHandler");
const path = require("path");
const fs   = require("fs");

// ─── POST /api/rooms ───────────────────────────────────────────────────────────
const createRoom = asyncHandler(async (req, res, next) => {
  try {
    // Merge uploaded image paths (if any) into room data
        // console.log("ROOMS IMAGES : ",req.files)

    const images = req.files?.map((file) => ({
      url:     `/uploads/rooms/${file.filename}`,
      altText: file.originalname,
    })) ?? [];

    // console.log("ROOMS IMAGES : ",images)
    // return
    const room = await roomService.createRoom({ ...req.body, images });

    res.status(201).json({
      success: true,
      message: "Room created successfully.",
      data: { room },
    });
  } catch (err) {
    console.log(err.message)
    next(err);
  }
});

// ─── GET /api/rooms ────────────────────────────────────────────────────────────
const getAllRooms = asyncHandler(async (req, res, next) => {
  try {
    const { roomType, status, minPrice, maxPrice, maxOccupancy } = req.query;

    const rooms = await roomService.getAllRooms({
      roomType,
      status,
      minPrice,
      maxPrice,
      maxOccupancy,
    });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: { rooms },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rooms/:id ────────────────────────────────────────────────────────
const getRoomById = asyncHandler(async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);

    res.status(200).json({
      success: true,
      data: { room },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/rooms/:id ────────────────────────────────────────────────────────
// ─── PUT /api/rooms/:id ────────────────────────────────────────────────────────
const updateRoom = asyncHandler(async (req, res, next) => {
  try {
    const newImages = req.files?.map((file) => ({
      url: `/uploads/rooms/${file.filename}`,
      altText: file.originalname,
    })) ?? [];

    // keepImages comes as string or array
    let keepImages = req.body.keepImages || [];
    if (!Array.isArray(keepImages)) {
      keepImages = [keepImages];
    }

    // Merge kept images + new images
    const finalImages = [
      ...keepImages.map((url) => ({ url })),
      ...newImages,
    ];

    const updateData = {
      ...req.body,
      images: finalImages,
    };

    delete updateData.keepImages; // cleanup

    const room = await roomService.updateRoom(req.params.id, updateData);

    res.status(200).json({
      success: true,
      message: "Room updated successfully.",
      data: { room },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/rooms/:id ────────────────────────────────────────────────────
const deleteRoom = asyncHandler(async (req, res, next) => {
  try {
    // Fetch images before deletion so we can clean up files from disk
    const existingRoom = await roomService.getRoomById(req.params.id);

    const result = await roomService.deleteRoom(req.params.id);

    // Remove uploaded image files from disk
    existingRoom.images?.forEach((img) => {
      const filePath = path.join(__dirname, "..", img.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/rooms/:id/status ─────────────────────────────────────────────
const updateRoomStatus = asyncHandler(async (req, res, next) => {
  try {
    const { status } = req.body;

    const room = await roomService.updateRoomStatus(req.params.id, status);

    res.status(200).json({
      success: true,
      message: `Room status updated to "${status}".`,
      data: { room },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rooms/:id/availability ─────────────────────────────────────────
const checkRoomAvailability = asyncHandler(async (req, res, next) => {
  try {
    const { checkInDate, checkOutDate } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Both checkInDate and checkOutDate query params are required.",
      }); 
    }

    const result = await roomService.checkRoomAvailability(
      req.params.id,
      checkInDate,
      checkOutDate
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rooms/available ─────────────────────────────────────────────────
const getAvailableRooms = asyncHandler(async (req, res, next) => {
  try {
    const { checkInDate, checkOutDate, roomType, minPrice, maxPrice, maxOccupancy } =
      req.query;
    console.log(req.query)
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Both checkInDate and checkOutDate query params are required.",
      });
    }

    const rooms = await roomService.getAvailableRooms(
      checkInDate,
      checkOutDate,
      { roomType, minPrice, maxPrice, maxOccupancy }
    );

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: { rooms },
    });
  } catch (err) {
    console.log(err.message)
    next(err);
  }
});

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
