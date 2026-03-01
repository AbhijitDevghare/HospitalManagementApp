const hotelServiceService = require("../services/hotelServiceService");
const asyncHandler        = require("../middleware/asyncHandler");

// ─── POST /api/services ─── admin only ────────────────────────────────────────
const createService = asyncHandler(async (req, res, next) => {
  try {
    const service = await hotelServiceService.createService(req.body);

    res.status(201).json({
      success: true,
      message: "Service created successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/services ────────────────────────────────────────────────────────
const getAllServices = asyncHandler(async (req, res, next) => {
  try {
    const { category, isAvailable } = req.query;

    const services = await hotelServiceService.getAllServices({
      category,
      isAvailable,
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/services/:id ────────────────────────────────────────────────────
const getServiceById = asyncHandler(async (req, res, next) => {
  try {
    const service = await hotelServiceService.getServiceById(req.params.id);

    res.status(200).json({
      success: true,
      data: { service },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/services/:id ─── admin only ─────────────────────────────────────
const updateService = asyncHandler(async (req, res, next) => {
  try {
    const service = await hotelServiceService.updateService(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/services/:id/toggle ─── admin only ───────────────────────────
const toggleServiceAvailability = asyncHandler(async (req, res, next) => {
  try {
    const result = await hotelServiceService.toggleServiceAvailability(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: { service: result.service },
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/services/:id ─── admin only ─────────────────────────────────
const deleteService = asyncHandler(async (req, res, next) => {
  try {
    const result = await hotelServiceService.deleteService(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/services/attach ─── attach services to a booking ───────────────
const attachServicesToBooking = asyncHandler(async (req, res, next) => {
  try {
    const { bookingId, serviceIds } = req.body;

    if (!bookingId || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bookingId and a non-empty serviceIds array are required.",
      });
    }

    const result = await hotelServiceService.attachServicesToBooking(
      bookingId,
      serviceIds
    );

    res.status(200).json({
      success: true,
      message: `${result.attachedServices.length} service(s) attached to booking. Additional charges: ${result.additionalCharges}.`,
      data: {
        booking:           result.booking,
        attachedServices:  result.attachedServices,
        additionalCharges: result.additionalCharges,
      },
    });
  } catch (err) {
    console.log(err.message)
    next(err);
  }
});

// ─── POST /api/services/breakdown ─── cost preview for a list of service IDs ──
const getServiceCostBreakdown = asyncHandler(async (req, res, next) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A non-empty serviceIds array is required.",
      });
    }

    const result = await hotelServiceService.getServiceCostBreakdown(serviceIds);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  toggleServiceAvailability,
  deleteService,
  attachServicesToBooking,
  getServiceCostBreakdown,
};
