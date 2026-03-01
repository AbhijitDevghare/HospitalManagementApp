  const request  = require("supertest");
  const mongoose = require("mongoose");
  const app      = require("../../app");
  const User     = require("../../models/User");
  const Room     = require("../../models/Room");

  let adminToken = "";
  let guestToken = "";
  let createdRoomId = "";

  const ADMIN_CREDS = { email: "roomtest.admin@hotel.com", password: "Admin@123" };
  const GUEST_CREDS = { email: "roomtest.guest@hotel.com", password: "Guest@123" };

  const SAMPLE_ROOM = {
    roomNumber:    "TEST-101",
    roomType:      "double",
    pricePerNight: 2500,
    maxOccupancy:  2,
    amenities:     ["WiFi", "AC"],
  };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/hotel_test");
    await User.deleteMany({ email: { $in: [ADMIN_CREDS.email, GUEST_CREDS.email] } });
    await Room.deleteMany({ roomNumber: SAMPLE_ROOM.roomNumber });

    // Register and login admin
    const adminReg = await request(app).post("/api/auth/register").send({
      name: "RoomTestAdmin", ...ADMIN_CREDS, role: "admin",
    });
    adminToken = adminReg.body.token;

    // Register and login guest
    const guestReg = await request(app).post("/api/auth/register").send({
      name: "RoomTestGuest", ...GUEST_CREDS, role: "guest",
    });
    guestToken = guestReg.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [ADMIN_CREDS.email, GUEST_CREDS.email] } });
    await Room.deleteMany({ roomNumber: SAMPLE_ROOM.roomNumber });
    await mongoose.connection.close();
  });

  // ─── Room integration tests ───────────────────────────────────────────────────
  describe("GET /api/rooms", () => {
    it("returns room list publicly", async () => {
      const res = await request(app).get("/api/rooms");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rooms)).toBe(true);
    });

    it("filters by roomType query param", async () => {
      const res = await request(app).get("/api/rooms?roomType=single");
      expect(res.statusCode).toBe(200);
      res.body.data.rooms.forEach((r) => expect(r.roomType).toBe("single"));
    });
  });

  describe("POST /api/rooms (admin only)", () => {
    it("creates a room as admin", async () => {
      const res = await request(app)
        .post("/api/rooms")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("roomNumber",    SAMPLE_ROOM.roomNumber)
        .field("roomType",      SAMPLE_ROOM.roomType)
        .field("pricePerNight", SAMPLE_ROOM.pricePerNight)
        .field("maxOccupancy",  SAMPLE_ROOM.maxOccupancy);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.room.roomNumber).toBe(SAMPLE_ROOM.roomNumber);
      createdRoomId = res.body.data.room._id;
    });

    it("returns 403 when guest tries to create a room", async () => {
      const res = await request(app)
        .post("/api/rooms")
        .set("Authorization", `Bearer ${guestToken}`)
        .field("roomNumber", "GUEST-001")
        .field("roomType",   "single")
        .field("pricePerNight", 1000)
        .field("maxOccupancy", 1);
      expect(res.statusCode).toBe(403);
    });

    it("returns 401 with no token", async () => {
      const res = await request(app).post("/api/rooms").send(SAMPLE_ROOM);
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/rooms/:id", () => {
    it("fetches a single room by id", async () => {
      const res = await request(app).get(`/api/rooms/${createdRoomId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.room._id).toBe(createdRoomId);
    });

    it("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/rooms/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/rooms/:id/status (admin only)", () => {
    it("updates room status to maintenance", async () => {
      const res = await request(app)
        .patch(`/api/rooms/${createdRoomId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "maintenance" });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.room.status).toBe("maintenance");
    });
  });

  describe("DELETE /api/rooms/:id (admin only)", () => {
    it("deletes a room as admin", async () => {
      const res = await request(app)
        .delete(`/api/rooms/${createdRoomId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
