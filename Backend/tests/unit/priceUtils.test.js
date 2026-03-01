const {
  calcBookingTotal,
  calcRoomCharges,
  calcServiceCharges,
  calcTax,
  applyDiscount,
  formatCurrency,
} = require("../../utils/priceUtils");

describe("priceUtils", () => {

  // ─── calcRoomCharges ────────────────────────────────────────────────────────
  describe("calcRoomCharges", () => {
    it("calculates room charges for multiple nights", () => {
      expect(calcRoomCharges(2500, "2025-02-01", "2025-02-05")).toBe(10000);
    });

    it("calculates charges for a single night", () => {
      expect(calcRoomCharges(1500, "2025-02-01", "2025-02-02")).toBe(1500);
    });

    it("throws when check-out is not after check-in", () => {
      expect(() => calcRoomCharges(2500, "2025-02-05", "2025-02-01")).toThrow();
    });
  });

  // ─── calcServiceCharges ─────────────────────────────────────────────────────
  describe("calcServiceCharges", () => {
    it("sums prices of multiple services", () => {
      const services = [{ price: 500 }, { price: 300 }, { price: 200 }];
      expect(calcServiceCharges(services)).toBe(1000);
    });

    it("returns 0 for empty array", () => {
      expect(calcServiceCharges([])).toBe(0);
    });
  });

  // ─── calcTax ────────────────────────────────────────────────────────────────
  describe("calcTax", () => {
    it("applies 12% tax correctly", () => {
      expect(calcTax(10000, 0.12)).toBe(1200);
    });

    it("rounds to 2 decimal places", () => {
      expect(calcTax(1000, 0.12)).toBe(120);
    });
  });

  // ─── calcBookingTotal ───────────────────────────────────────────────────────
  describe("calcBookingTotal", () => {
    it("returns correct full breakdown", () => {
      const result = calcBookingTotal({
        pricePerNight: 2500,
        checkInDate:   "2025-02-01",
        checkOutDate:  "2025-02-05",
        services:      [{ price: 500 }],
        taxRate:       0.12,
        discount:      0,
      });

      expect(result.nights).toBe(4);
      expect(result.roomCharges).toBe(10000);
      expect(result.serviceCharges).toBe(500);
      expect(result.subtotal).toBe(10500);
      expect(result.taxes).toBe(1260);
      expect(result.totalAmount).toBe(11760);
    });

    it("applies discount before tax", () => {
      const result = calcBookingTotal({
        pricePerNight: 2500,
        checkInDate:   "2025-02-01",
        checkOutDate:  "2025-02-03",
        services:      [],
        taxRate:       0.12,
        discount:      0.10, // 10% off
      });

      expect(result.discountAmount).toBe(500);
      expect(result.taxes).toBeCloseTo(540, 1);
    });
  });

  // ─── applyDiscount ──────────────────────────────────────────────────────────
  describe("applyDiscount", () => {
    it("applies percentage discount", () => {
      expect(applyDiscount(10000, 10)).toBe(9000);
    });

    it("clamps discount at 100%", () => {
      expect(applyDiscount(10000, 150)).toBe(0);
    });

    it("handles 0% discount", () => {
      expect(applyDiscount(10000, 0)).toBe(10000);
    });
  });

  // ─── formatCurrency ─────────────────────────────────────────────────────────
  describe("formatCurrency", () => {
    it("formats INR correctly", () => {
      const result = formatCurrency(1500, "INR", "en-IN");
      expect(result).toContain("1,500");
    });
  });
});
