const request  = require("supertest");
const mongoose = require("mongoose");
const app      = require("../../app");
const User     = require("../../models/User");

// ─── Test credentials ─────────────────────────────────────────────────────────
const ADMIN = { name: "Admin",     email: "inttest.admin@hotel.com", password: "Admin@123", role: "admin" };
const GUEST = { name: "GuestUser", email: "inttest.guest@hotel.com", password: "Guest@123", role: "guest" };

let adminToken = "";
let guestToken = "";

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/hotel_test");
  await User.deleteMany({ email: { $in: [ADMIN.email, GUEST.email] } });
});

afterAll(async () => {
  await User.deleteMany({ email: { $in: [ADMIN.email, GUEST.email] } });
  await mongoose.connection.close();
});

// ─── Auth integration tests ───────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("registers a new admin user", async () => {
    const res = await request(app).post("/api/auth/register").send(ADMIN);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe(ADMIN.email);
    adminToken = res.body.token;
  });

  it("registers a new guest user", async () => {
    const res = await request(app).post("/api/auth/register").send(GUEST);
    expect(res.statusCode).toBe(201);
    guestToken = res.body.token;
  });

  it("rejects duplicate email with 409", async () => {
    const res = await request(app).post("/api/auth/register").send(ADMIN);
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing email with 422", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "X", password: "Pass@123" });
    expect(res.statusCode).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email:    ADMIN.email,
      password: ADMIN.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email:    ADMIN.email,
      password: "wrongpassword",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects non-existent email with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email:    "nobody@example.com",
      password: "Pass@123",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user profile with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(ADMIN.email);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears token cookie and returns 200", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${guestToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
