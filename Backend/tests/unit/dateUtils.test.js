const {
  validateBookingDates,
  calculateNights,
  doRangesOverlap,
  isToday,
  formatStayDuration,
  addDays,
} = require("../../utils/dateUtils");

describe("dateUtils", () => {

  // ─── calculateNights ────────────────────────────────────────────────────────
  describe("calculateNights", () => {
    it("returns correct number of nights", () => {
      expect(calculateNights("2025-02-01", "2025-02-05")).toBe(4);
    });

    it("returns 1 for a single-night stay", () => {
      expect(calculateNights("2025-02-01", "2025-02-02")).toBe(1);
    });
  });

  // ─── validateBookingDates ───────────────────────────────────────────────────
  describe("validateBookingDates", () => {
    it("returns valid for future dates with check-out after check-in", () => {
      const future     = addDays(new Date(), 2);
      const futureEnd  = addDays(new Date(), 5);
      const result = validateBookingDates(future, futureEnd);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error when check-in is in the past", () => {
      const result = validateBookingDates("2020-01-01", "2020-01-05");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Check-in date cannot be in the past.");
    });

    it("returns error when check-out is before check-in", () => {
      const future = addDays(new Date(), 5);
      const before = addDays(new Date(), 2);
      const result = validateBookingDates(future, before);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Check-out date must be after check-in date.");
    });
  });

  // ─── doRangesOverlap ────────────────────────────────────────────────────────
  describe("doRangesOverlap", () => {
    it("detects overlapping ranges", () => {
      expect(doRangesOverlap("2025-02-01", "2025-02-05", "2025-02-03", "2025-02-08")).toBe(true);
    });

    it("returns false for non-overlapping ranges", () => {
      expect(doRangesOverlap("2025-02-01", "2025-02-05", "2025-02-06", "2025-02-10")).toBe(false);
    });

    it("detects contained range", () => {
      expect(doRangesOverlap("2025-02-01", "2025-02-10", "2025-02-03", "2025-02-06")).toBe(true);
    });
  });

  // ─── isToday ────────────────────────────────────────────────────────────────
  describe("isToday", () => {
    it("returns true for today", () => {
      expect(isToday(new Date())).toBe(true);
    });

    it("returns false for yesterday", () => {
      const yesterday = addDays(new Date(), -1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  // ─── formatStayDuration ─────────────────────────────────────────────────────
  describe("formatStayDuration", () => {
    it("returns a descriptive string", () => {
      const result = formatStayDuration("2025-02-01", "2025-02-04");
      expect(result).toContain("3 nights");
      expect(result).toContain("2025-02-01");
    });

    it("handles single-night stay correctly", () => {
      const result = formatStayDuration("2025-02-01", "2025-02-02");
      expect(result).toContain("1 night");
    });
  });
});
