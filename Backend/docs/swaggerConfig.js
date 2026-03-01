const swaggerJsdoc  = require("swagger-jsdoc");
const swaggerUi     = require("swagger-ui-express");
const config        = require("../config/env");

// ─── OpenAPI definition ───────────────────────────────────────────────────────
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title:       "🏨 Hotel Management System API",
    version:     "1.0.0",
    description: "Complete REST API for the MERN Stack Hotel Management System covering authentication, rooms, bookings, payments, invoices, inventory, reviews, services, maintenance, and staff management.",
    contact: {
      name:  "Hotel Management System",
      email: "support@hotel.com",
    },
    license: { name: "MIT" },
  },
  servers: [
    {
      url:         `http://localhost:${config.PORT || 5000}/api`,
      description: "Development server",
    },
    {
      url:         "https://api.hotel.com/api",
      description: "Production server",
    },
  ],

  // ─── Reusable security schemes ───────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type:         "http",
        scheme:       "bearer",
        bearerFormat: "JWT",
        description:  "Enter JWT token obtained from /api/auth/login",
      },
    },

    // ─── Reusable response schemas ──────────────────────────────────────────
    schemas: {

      // ── Generic wrappers ──────────────────────────────────────────────────
      SuccessResponse: {
        type: "object",
        properties: {
          success:    { type: "boolean", example: true },
          message:    { type: "string",  example: "Operation successful." },
          data:       { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success:    { type: "boolean", example: false },
          statusCode: { type: "integer", example: 400 },
          message:    { type: "string",  example: "Bad request." },
          errors:     { type: "array", items: { type: "object" } },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          currentPage:  { type: "integer", example: 1 },
          totalPages:   { type: "integer", example: 5 },
          totalRecords: { type: "integer", example: 48 },
          limit:        { type: "integer", example: 10 },
          hasNextPage:  { type: "boolean", example: true },
          hasPrevPage:  { type: "boolean", example: false },
        },
      },

      // ── User ─────────────────────────────────────────────────────────────
      User: {
        type: "object",
        properties: {
          _id:       { type: "string",  example: "64f1a2b3c4d5e6f7a8b9c0d1" },
          name:      { type: "string",  example: "John Doe" },
          email:     { type: "string",  example: "john@example.com" },
          phone:     { type: "string",  example: "+919876543210" },
          role:      { type: "string",  enum: ["admin", "staff", "guest"], example: "guest" },
          createdAt: { type: "string",  format: "date-time" },
        },
      },
      RegisterBody: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name:     { type: "string",  example: "John Doe" },
          email:    { type: "string",  example: "john@example.com" },
          password: { type: "string",  example: "Secret@123" },
          phone:    { type: "string",  example: "+919876543210" },
          role:     { type: "string",  enum: ["admin", "guest"], example: "guest" },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email:    { type: "string", example: "john@example.com" },
          password: { type: "string", example: "Secret@123" },
        },
      },

      // ── Room ──────────────────────────────────────────────────────────────
      Room: {
        type: "object",
        properties: {
          _id:            { type: "string",  example: "64f1a2b3c4d5e6f7a8b9c0d2" },
          roomNumber:     { type: "string",  example: "101" },
          roomType:       { type: "string",  enum: ["single", "double", "deluxe"] },
          pricePerNight:  { type: "number",  example: 2500 },
          maxOccupancy:   { type: "integer", example: 2 },
          status:         { type: "string",  enum: ["available", "booked", "maintenance"] },
          amenities:      { type: "array",   items: { type: "string" }, example: ["WiFi", "AC", "TV"] },
          images:         { type: "array",   items: { type: "object" } },
        },
      },
      RoomBody: {
        type: "object",
        required: ["roomNumber", "roomType", "pricePerNight", "maxOccupancy"],
        properties: {
          roomNumber:    { type: "string",  example: "101" },
          roomType:      { type: "string",  enum: ["single", "double", "deluxe"] },
          pricePerNight: { type: "number",  example: 2500 },
          maxOccupancy:  { type: "integer", example: 2 },
          amenities:     { type: "array",   items: { type: "string" } },
        },
      },

      // ── Booking ───────────────────────────────────────────────────────────
      Booking: {
        type: "object",
        properties: {
          _id:             { type: "string" },
          user:            { $ref: "#/components/schemas/User" },
          room:            { $ref: "#/components/schemas/Room" },
          checkInDate:     { type: "string", format: "date", example: "2025-02-01" },
          checkOutDate:    { type: "string", format: "date", example: "2025-02-05" },
          numberOfGuests:  { type: "integer", example: 2 },
          totalAmount:     { type: "number",  example: 11200 },
          status:          { type: "string",  enum: ["confirmed", "cancelled", "completed"] },
        },
      },
      BookingBody: {
        type: "object",
        required: ["roomId", "checkInDate", "checkOutDate", "numberOfGuests"],
        properties: {
          roomId:         { type: "string",  example: "64f1a2b3c4d5e6f7a8b9c0d2" },
          checkInDate:    { type: "string",  format: "date", example: "2025-02-01" },
          checkOutDate:   { type: "string",  format: "date", example: "2025-02-05" },
          numberOfGuests: { type: "integer", example: 2 },
          serviceCharges: { type: "number",  example: 500 },
        },
      },

      // ── Payment ───────────────────────────────────────────────────────────
      Payment: {
        type: "object",
        properties: {
          _id:           { type: "string" },
          booking:       { type: "string" },
          paymentAmount: { type: "number",  example: 11200 },
          paymentMethod: { type: "string",  enum: ["card", "UPI", "cash"] },
          paymentStatus: { type: "string",  enum: ["pending", "success", "failed"] },
          transactionId: { type: "string",  example: "txn_abc123" },
          paymentDate:   { type: "string",  format: "date-time" },
        },
      },
      PaymentBody: {
        type: "object",
        required: ["bookingId", "paymentAmount", "paymentMethod"],
        properties: {
          bookingId:     { type: "string", example: "64f1a2b3c4d5e6f7a8b9c0d3" },
          paymentAmount: { type: "number", example: 11200 },
          paymentMethod: { type: "string", enum: ["card", "UPI", "cash"] },
          transactionId: { type: "string", example: "txn_abc123" },
        },
      },

      // ── Invoice ───────────────────────────────────────────────────────────
      Invoice: {
        type: "object",
        properties: {
          _id:            { type: "string" },
          booking:        { type: "object" },
          roomCharges:    { type: "number", example: 10000 },
          serviceCharges: { type: "number", example: 500 },
          taxes:          { type: "number", example: 1260 },
          totalBill:      { type: "number", example: 11760 },
          isPaid:         { type: "boolean", example: true },
          invoiceDate:    { type: "string",  format: "date-time" },
        },
      },

      // ── Review ────────────────────────────────────────────────────────────
      Review: {
        type: "object",
        properties: {
          _id:     { type: "string" },
          user:    { $ref: "#/components/schemas/User" },
          room:    { type: "object" },
          rating:  { type: "integer", minimum: 1, maximum: 5, example: 4 },
          comment: { type: "string",  example: "Great room, very clean!" },
        },
      },
      ReviewBody: {
        type: "object",
        required: ["roomId", "rating"],
        properties: {
          roomId:  { type: "string",  example: "64f1a2b3c4d5e6f7a8b9c0d2" },
          rating:  { type: "integer", minimum: 1, maximum: 5, example: 4 },
          comment: { type: "string",  example: "Great room, very clean!" },
        },
      },

      // ── Staff ─────────────────────────────────────────────────────────────
      Staff: {
        type: "object",
        properties: {
          _id:      { type: "string" },
          name:     { type: "string",  example: "Alice Smith" },
          email:    { type: "string",  example: "alice@hotel.com" },
          phone:    { type: "string",  example: "+919876543211" },
          role:     { type: "string",  enum: ["manager", "receptionist", "housekeeping"] },
          salary:   { type: "number",  example: 45000 },
          isActive: { type: "boolean", example: true },
          shiftTiming: {
            type: "object",
            properties: {
              startTime: { type: "string", example: "08:00" },
              endTime:   { type: "string", example: "16:00" },
            },
          },
        },
      },
    },

    // ─── Reusable parameters ────────────────────────────────────────────────
    parameters: {
      IdParam: {
        in:          "path",
        name:        "id",
        required:    true,
        schema:      { type: "string" },
        description: "MongoDB ObjectId",
      },
      PageQuery: {
        in: "query", name: "page",  schema: { type: "integer", default: 1 },
        description: "Page number (default: 1)",
      },
      LimitQuery: {
        in: "query", name: "limit", schema: { type: "integer", default: 10 },
        description: "Records per page (max: 100)",
      },
    },

    // ─── Reusable responses ─────────────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: "Authentication required.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      Forbidden: {
        description: "Insufficient permissions.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      NotFound: {
        description: "Resource not found.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      ValidationError: {
        description: "Validation failed.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
  },

  // ─── Apply BearerAuth globally (overridden per route if public) ────────────
  security: [{ BearerAuth: [] }],

  // ─── Tags for sidebar grouping in Swagger UI ──────────────────────────────
  tags: [
    { name: "Auth",        description: "User registration, login, profile" },
    { name: "Rooms",       description: "Room management and availability" },
    { name: "Bookings",    description: "Booking lifecycle management" },
    { name: "Payments",    description: "Payment processing and verification" },
    { name: "Invoices",    description: "Invoice generation and retrieval" },
    { name: "Inventory",   description: "Hotel inventory and stock management" },
    { name: "Reviews",     description: "Guest reviews and ratings" },
    { name: "Services",    description: "Hotel add-on services" },
    { name: "Maintenance", description: "Room maintenance tracking" },
    { name: "Staff",       description: "Staff records and scheduling" },
  ],
};

// ─── Options for swagger-jsdoc ────────────────────────────────────────────────
const options = {
  swaggerDefinition,
  apis: [
    "./routes/*.js",       // JSDoc annotations in route files
    "./controllers/*.js",  // optional: annotations in controllers
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// ─── Mount function — call in app.js ──────────────────────────────────────────
const setupSwagger = (app) => {
  // Serve interactive UI
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Hotel Management API Docs",
      customCss: ".swagger-ui .topbar { background-color: #2c3e50; }",
      swaggerOptions: {
        persistAuthorization: true,      // Keep token across page refreshes
        displayRequestDuration: true,
        filter:                true,     // Enable search/filter box
        docExpansion:          "none",   // Collapse all by default
      },
    })
  );

  // Serve raw OpenAPI JSON for tools like Postman import
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(
    `📄 Swagger docs : http://localhost:${config.PORT || 5000}/api/docs`
  );
};

module.exports = { setupSwagger, swaggerSpec };
