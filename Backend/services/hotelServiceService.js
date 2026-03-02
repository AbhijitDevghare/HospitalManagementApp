const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Invoice = require("../models/Invoice");

// ─── 1. Create a new hotel service ────────────────────────────────────────────
const createService = async (serviceData) => {
  const existing = await Service.findOne({
    serviceName: { $regex: new RegExp(`^${serviceData.serviceName}$`, "i") },
  });

  if (existing) {
    const error = new Error(
      `Service "${serviceData.serviceName}" already exists`
    );
    error.statusCode = 409;
    throw error;
  }

  const service = await Service.create(serviceData);
  return service;
};

// ─── 2. Get all services (with optional filters) ──────────────────────────────
const getAllServices = async (filters = {}) => {
  const query = {};

  if (filters.category)    query.category    = filters.category;
  if (filters.isAvailable !== undefined) {
    query.isAvailable = filters.isAvailable === "true" || filters.isAvailable === true;
  }

  const services = await Service.find(query).sort({ category: 1, serviceName: 1 });
  return services;
};

// ─── 3. Get a single service by ID ────────────────────────────────────────────
const getServiceById = async (serviceId) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }
  return service;
};

// ─── 4. Update a service ──────────────────────────────────────────────────────
const updateService = async (serviceId, updateData) => {
  // Guard against price going to zero or negative
  if (updateData.price !== undefined && updateData.price <= 0) {
    const error = new Error("Service price must be a positive value");
    error.statusCode = 400;
    throw error;
  }

  // Guard against name collision with another service
  if (updateData.serviceName) {
    const duplicate = await Service.findOne({
      serviceName: { $regex: new RegExp(`^${updateData.serviceName}$`, "i") },
      _id: { $ne: serviceId },
    });
    if (duplicate) {
      const error = new Error(
        `A service named "${updateData.serviceName}" already exists`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const service = await Service.findByIdAndUpdate(
    serviceId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  return service;
};

// ─── 5. Toggle service availability ──────────────────────────────────────────
const toggleServiceAvailability = async (serviceId) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  service.isAvailable = !service.isAvailable;
  await service.save();

  return {
    service,
    message: `Service "${service.serviceName}" is now ${
      service.isAvailable ? "available" : "unavailable"
    }`,
  };
};

// ─── 6. Delete a service ──────────────────────────────────────────────────────
const deleteService = async (serviceId) => {
  const service = await Service.findByIdAndDelete(serviceId);
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }
  return { message: `Service "${service.serviceName}" deleted successfully` };
};
// ─── 7. Attach services to a booking ─────────────────────────────────────────
const attachServicesToBooking = async (bookingId, serviceIds) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== "confirmed") {
    const error = new Error(
      "Services can only be added to confirmed bookings"
    );
    error.statusCode = 400;
    throw error;
  }

  // 🔎 Remove already attached services
  const alreadyAttached = (booking.services || []).map(id => id.toString());

  const newServiceIds = serviceIds.filter(
    id => !alreadyAttached.includes(id.toString())
  );

  if (newServiceIds.length === 0) {
    const error = new Error("All selected services are already attached");
    error.statusCode = 400;
    throw error;
  }

  // Fetch and validate only new services
  const services = await Service.find({
    _id: { $in: newServiceIds },
    isAvailable: true,
  });

  if (services.length !== newServiceIds.length) {
    const foundIds   = services.map((s) => s._id.toString());
    const missingIds = newServiceIds.filter(id => !foundIds.includes(id));
    const error = new Error(
      `Some services are unavailable or not found: ${missingIds.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Calculate total additional service charges
  const additionalCharges = calculateServiceTotal(services);

  // ✅ Update booking safely (no validation re-trigger)
  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      $inc: { totalAmount: additionalCharges },
      $addToSet: { services: { $each: newServiceIds } }
    },
    { new: true }
  );

  // Update invoice if exists
  const existingInvoice = await Invoice.findOne({ booking: bookingId });

  if (existingInvoice) {
    const updatedServiceCharges =
      existingInvoice.serviceCharges + additionalCharges;

    const updatedTaxes =
      (existingInvoice.roomCharges + updatedServiceCharges) * 0.12;

    const updatedTotalBill =
      existingInvoice.roomCharges +
      updatedServiceCharges +
      updatedTaxes;

    await Invoice.findByIdAndUpdate(existingInvoice._id, {
      serviceCharges: parseFloat(updatedServiceCharges.toFixed(2)),
      taxes: parseFloat(updatedTaxes.toFixed(2)),
      totalBill: parseFloat(updatedTotalBill.toFixed(2)),
      isPaid:false
    });
  }

  return {
    booking: updatedBooking,
    attachedServices: services,
    additionalCharges,
  };
};
// ─── 8. Calculate total cost of a service list ───────────────────────────────
const calculateServiceTotal = (services) => {
  return parseFloat(
    services.reduce((sum, s) => sum + s.price, 0).toFixed(2)
  );
};

// ─── 9. Get service cost breakdown for a list of IDs ─────────────────────────
const getServiceCostBreakdown = async (serviceIds) => {
  const services = await Service.find({ _id: { $in: serviceIds } });

  const breakdown = services.map((s) => ({
    serviceId:   s._id,
    serviceName: s.serviceName,
    category:    s.category,
    price:       s.price,
  }));

  const total = calculateServiceTotal(services);

  return { breakdown, total };
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  toggleServiceAvailability,
  deleteService,
  attachServicesToBooking,
  calculateServiceTotal,
  getServiceCostBreakdown,
};
