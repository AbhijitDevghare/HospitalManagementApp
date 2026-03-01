const mongoose      = require("mongoose");
const bcrypt        = require("bcryptjs");
require("../config/env");
const { connectDB } = require("../config/db");

// ─── Models ───────────────────────────────────────────────────────────────────
const User            = require("../models/User");
const Room            = require("../models/Room");
const Booking         = require("../models/Booking");
const Payment         = require("../models/Payment");
const Invoice         = require("../models/Invoice");
const Review          = require("../models/Review");
const RoomMaintenance = require("../models/RoomMaintenance");
const Staff           = require("../models/Staff");
const Inventory       = require("../models/Inventory");
const Service         = require("../models/Service");

// ════════════════════════════════════════════════════════════════════════════
// SEED DATA  — every value validated against its model enum
// ════════════════════════════════════════════════════════════════════════════

// ── Users ─────────────────────────────────────────────────────────────────
// role enum : "admin" | "staff" | "guest"
const USERS = [
  { name: "Super Admin", email: "admin@hotel.com", password: "Admin@123", phone: "+919000000001", role: "admin"  },
  { name: "John Guest",  email: "john@example.com",password: "Secret@123",phone: "+919876543210", role: "guest"  },
  { name: "Jane Guest",  email: "jane@example.com", password: "Secret@123",phone: "+919876543211", role: "guest" },
];

// ── Rooms ─────────────────────────────────────────────────────────────────
// roomType enum : "single" | "double" | "deluxe"
// status   enum : "available" | "booked" | "maintenance"
const ROOMS = [
  { roomNumber: "101", roomType: "single", pricePerNight: 1500, maxOccupancy: 1, status: "available",   amenities: ["WiFi", "AC", "TV"],                           description: "Cozy single room on ground floor",       floor: 1, images: [] },
  { roomNumber: "102", roomType: "single", pricePerNight: 1500, maxOccupancy: 1, status: "available",   amenities: ["WiFi", "AC", "TV"],                           description: "Cozy single room with street view",       floor: 1, images: [] },
  { roomNumber: "201", roomType: "double", pricePerNight: 2500, maxOccupancy: 2, status: "available",   amenities: ["WiFi", "AC", "TV", "Mini Bar"],               description: "Spacious double room with city view",     floor: 2, images: [] },
  { roomNumber: "202", roomType: "double", pricePerNight: 2500, maxOccupancy: 2, status: "available",   amenities: ["WiFi", "AC", "TV", "Mini Bar"],               description: "Spacious double room with pool view",     floor: 2, images: [] },
  { roomNumber: "301", roomType: "deluxe", pricePerNight: 4500, maxOccupancy: 3, status: "available",   amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi"],    description: "Deluxe room with panoramic city view",    floor: 3, images: [] },
  { roomNumber: "302", roomType: "deluxe", pricePerNight: 4500, maxOccupancy: 3, status: "available",   amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi"],    description: "Deluxe room with sea view",               floor: 3, images: [] },
  { roomNumber: "401", roomType: "deluxe", pricePerNight: 8000, maxOccupancy: 4, status: "available",   amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi", "Kitchen"], description: "Premium deluxe room with private terrace", floor: 4, images: [] },
  { roomNumber: "501", roomType: "single", pricePerNight: 1500, maxOccupancy: 1, status: "maintenance", amenities: ["WiFi", "AC"],                                 description: "Single room under maintenance",           floor: 5, images: [] },
];

// ── Staff ─────────────────────────────────────────────────────────────────
// role enum : "manager" | "receptionist" | "housekeeping" | "maintenance" | "chef"
const STAFF = [
  { name: "Alice Manager",      email: "alice@hotel.com",  phone: "+919100000001", role: "manager",      salary: 75000, shiftTiming: { startTime: "09:00", endTime: "18:00" }, isActive: true },
  { name: "Bob Receptionist",   email: "bob@hotel.com",    phone: "+919100000002", role: "receptionist", salary: 40000, shiftTiming: { startTime: "08:00", endTime: "16:00" }, isActive: true },
  { name: "Carol Housekeeping", email: "carol@hotel.com",  phone: "+919100000003", role: "housekeeping", salary: 30000, shiftTiming: { startTime: "07:00", endTime: "15:00" }, isActive: true },
  { name: "David Housekeeping", email: "david@hotel.com",  phone: "+919100000004", role: "housekeeping", salary: 32000, shiftTiming: { startTime: "08:00", endTime: "16:00" }, isActive: true },
];

// ── Inventory ─────────────────────────────────────────────────────────────
// category enum : "linen" | "toiletries" | "food" | "beverages" |
//                 "cleaning" | "electronics" | "furniture" | "other"
const INVENTORY = [
  { itemName: "Bed Sheets",     category: "linen",       quantity: 100, unit: "pcs",     lowStockThreshold: 20 },
  { itemName: "Towels",         category: "linen",       quantity: 150, unit: "pcs",     lowStockThreshold: 30 },
  { itemName: "Shampoo",        category: "toiletries",  quantity: 8,   unit: "bottles", lowStockThreshold: 20 },
  { itemName: "Soap",           category: "toiletries",  quantity: 200, unit: "bars",    lowStockThreshold: 50 },
  { itemName: "Coffee Sachets", category: "food",        quantity: 50,  unit: "packets", lowStockThreshold: 20 },
  { itemName: "Mineral Water",  category: "beverages",   quantity: 5,   unit: "cases",   lowStockThreshold: 10 },
  { itemName: "Floor Cleaner",  category: "cleaning",    quantity: 20,  unit: "bottles", lowStockThreshold: 5  },
];

// ── Services ──────────────────────────────────────────────────────────────
// category enum : "spa" | "laundry" | "dining" | "transport" |
//                 "housekeeping" | "concierge" | "other"
const SERVICES = [
  { serviceName: "Airport Pickup",  category: "transport",    price: 800,  isAvailable: true  },
  { serviceName: "Room Service",    category: "dining",       price: 200,  isAvailable: true  },
  { serviceName: "Spa Treatment",   category: "spa",          price: 2000, isAvailable: true  },
  { serviceName: "Laundry Service", category: "laundry",      price: 300,  isAvailable: true  },
  { serviceName: "City Tour",       category: "concierge",    price: 1500, isAvailable: false },
  { serviceName: "Welcome Drinks",  category: "dining",       price: 150,  isAvailable: true  },
];

// ════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ════════════════════════════════════════════════════════════════════════════
const seed = async () => {
  await connectDB();
  console.log("\n🌱 Starting database seed…\n");

  try {
    // ── 1. Clear all collections ─────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Invoice.deleteMany({}),
      Review.deleteMany({}),
      RoomMaintenance.deleteMany({}),
      Staff.deleteMany({}),
      Inventory.deleteMany({}),
      Service.deleteMany({}),
    ]);
    console.log("🗑   Cleared existing collections.");

    // ── 2. Users ─────────────────────────────────────────────────────────
    const hashedUsers = await Promise.all(
      USERS.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 12) }))
    );
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✔  Users          : ${createdUsers.length} inserted`);

    // ── 3. Rooms ─────────────────────────────────────────────────────────
    const createdRooms = await Room.insertMany(ROOMS);
    console.log(`✔  Rooms          : ${createdRooms.length} inserted`);

    // ── 4. Staff ─────────────────────────────────────────────────────────
    const createdStaff = await Staff.insertMany(STAFF);
    console.log(`✔  Staff          : ${createdStaff.length} inserted`);

    // ── 5. Inventory ─────────────────────────────────────────────────────
    const createdInventory = await Inventory.insertMany(INVENTORY);
    console.log(`✔  Inventory      : ${createdInventory.length} inserted`);

    // ── 6. Services ───────────────────────────────────────────────────────
    const createdServices = await Service.insertMany(SERVICES);
    console.log(`✔  Services       : ${createdServices.length} inserted`);

    // ── Resolve references ────────────────────────────────────────────────
    const adminUser    = createdUsers.find((u) => u.email === "admin@hotel.com");
    const johnGuest    = createdUsers.find((u) => u.email === "john@example.com");
    const janeGuest    = createdUsers.find((u) => u.email === "jane@example.com");
    const doubleRoom   = createdRooms.find((r) => r.roomNumber === "201");
    const deluxeRoom   = createdRooms.find((r) => r.roomNumber === "301");
    const maintRoom    = createdRooms.find((r) => r.roomNumber === "501");
    const maintStaff   = createdStaff.find((s) => s.email === "david@hotel.com");
    const spaService   = createdServices.find((s) => s.serviceName === "Spa Treatment");
    const roomService  = createdServices.find((s) => s.serviceName === "Room Service");

    // ── 7. Bookings ───────────────────────────────────────────────────────
    // booking status enum : "confirmed" | "cancelled" | "completed"

    // Future confirmed booking — john in room 201
    const checkIn1  = new Date(); checkIn1.setDate(checkIn1.getDate() + 5);
    const checkOut1 = new Date(checkIn1); checkOut1.setDate(checkOut1.getDate() + 3);

    // Past completed booking — john in room 301 (needed for review)
    const checkIn2  = new Date(); checkIn2.setDate(checkIn2.getDate() - 10);
    const checkOut2 = new Date(checkIn2); checkOut2.setDate(checkOut2.getDate() + 2);

    // Future confirmed booking — jane in room 201
    const checkIn3  = new Date(); checkIn3.setDate(checkIn3.getDate() + 8);
    const checkOut3 = new Date(checkIn3); checkOut3.setDate(checkOut3.getDate() + 4);

    // Future bookings go through Mongoose (validation enabled)
    const [confirmedBooking, janeBooking] = await Booking.insertMany([
      {
        user:           johnGuest._id,
        room:           doubleRoom._id,
        checkInDate:    checkIn1,
        checkOutDate:   checkOut1,
        numberOfGuests: 2,
        totalAmount:    8400,         // 3 nights × 2500 + 12% tax
        status:         "confirmed",
        services:       [roomService._id],
      },
      {
        user:           janeGuest._id,
        room:           doubleRoom._id,
        checkInDate:    checkIn3,
        checkOutDate:   checkOut3,
        numberOfGuests: 1,
        totalAmount:    11200,        // 4 nights × 2500 + 12% tax
        status:         "confirmed",
        services:       [],
      },
    ]);

    // Past completed booking — bypass checkInDate validator with raw insert
    const completedBookingDocs = await Booking.collection.insertMany([
      {
        user:           johnGuest._id,
        room:           deluxeRoom._id,
        checkInDate:    checkIn2,
        checkOutDate:   checkOut2,
        numberOfGuests: 2,
        totalAmount:    10080,        // 2 nights × 4500 + 12% tax
        status:         "completed",
        services:       [spaService._id],
        createdAt:      new Date(),
        updatedAt:      new Date(),
      },
    ]);
    const completedBooking = { _id: completedBookingDocs.insertedIds[0] };

    console.log(`✔  Bookings       : 3 inserted`);

    // ── 8. Payments ───────────────────────────────────────────────────────
    // paymentMethod enum : "card" | "UPI" | "cash"
    // paymentStatus enum : "pending" | "success" | "failed"
    const [completedPayment] = await Payment.insertMany([
      {
        booking:       completedBooking._id,
        paymentAmount: 10080,
        paymentMethod: "UPI",
        paymentStatus: "success",
        transactionId: "txn_seed_001",
        paymentDate:   checkOut2,
      },
    ]);
    console.log(`✔  Payments       : 1 inserted`);

    // ── 9. Invoices ───────────────────────────────────────────────────────
    await Invoice.insertMany([
      {
        booking:        completedBooking._id,
        roomCharges:    9000,    // 2 nights × 4500
        serviceCharges: 2000,    // Spa Treatment
        taxes:          1320,    // (9000 + 2000) × 12%
        totalBill:      12320,
        isPaid:         true,
        invoiceDate:    checkOut2,
      },
    ]);
    console.log(`✔  Invoices       : 1 inserted`);

    // ── 10. Reviews ───────────────────────────────────────────────────────
    // rating : 1–5  (no createdDate field — model uses timestamps)
    await Review.insertMany([
      {
        user:    johnGuest._id,
        room:    deluxeRoom._id,
        rating:  5,
        comment: "Absolutely wonderful stay! The jacuzzi and spa were amazing.",
      },
    ]);
    console.log(`✔  Reviews        : 1 inserted`);

    // ── 11. Room Maintenance ──────────────────────────────────────────────
    // maintenanceStatus enum : "pending" | "in-progress" | "completed"
    // priority          enum : "low" | "medium" | "high" | "critical"
    await RoomMaintenance.insertMany([
      {
        room:              maintRoom._id,
        issueDescription:  "Air conditioning unit not cooling properly",
        priority:          "high",
        maintenanceStatus: "in-progress",
        reportedDate:      new Date(),
        assignedStaff:     maintStaff._id,
      },
    ]);
    console.log(`✔  Maintenance    : 1 record inserted`);

    // ── Summary ───────────────────────────────────────────────────────────
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("  🌱 Seed completed successfully!\n");
    console.log("  Test credentials:");
    console.log("    Admin : admin@hotel.com  / Admin@123");
    console.log("    Guest : john@example.com / Secret@123");
    console.log("    Guest : jane@example.com / Secret@123");
    console.log("\n  Sample IDs (copy into Postman variables):");
    console.log(`    adminId            : ${adminUser._id}`);
    console.log(`    johnGuestId        : ${johnGuest._id}`);
    console.log(`    roomId  (double)   : ${doubleRoom._id}`);
    console.log(`    roomId  (deluxe)   : ${deluxeRoom._id}`);
    console.log(`    roomId  (maint)    : ${maintRoom._id}`);
    console.log(`    confirmedBookingId : ${confirmedBooking._id}`);
    console.log(`    completedBookingId : ${completedBooking._id}`);
    console.log(`    paymentId          : ${completedPayment._id}`);
    console.log(`    spaServiceId       : ${spaService._id}`);
    console.log(`    maintStaffId       : ${maintStaff._id}`);
    console.log("──────────────────────────────────────────────────────────\n");

  } catch (err) {
    console.error("✖  Seed failed:", err.message);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seed();
