const {
  isValidEmail,
  isValidPhone,
  isValidObjectId,
  isPositiveNumber,
  isPositiveInteger,
  isInRange,
  isValidRating,
  isNonEmptyString,
  checkRequiredFields,
  isValidEnum,
  isStrongPassword,
} = require("../../utils/validationUtils");

describe("validationUtils", () => {

  describe("isValidEmail", () => {
    it("accepts valid emails",  () => { expect(isValidEmail("user@example.com")).toBe(true); });
    it("rejects missing @",     () => { expect(isValidEmail("userexample.com")).toBe(false); });
    it("rejects empty string",  () => { expect(isValidEmail("")).toBe(false); });
  });

  describe("isValidPhone", () => {
    it("accepts international format", () => { expect(isValidPhone("+919876543210")).toBe(true); });
    it("accepts without + prefix",     () => { expect(isValidPhone("9876543210")).toBe(true);  });
    it("rejects too-short number",     () => { expect(isValidPhone("123")).toBe(false); });
  });

  describe("isValidObjectId", () => {
    it("accepts valid 24-char hex id", () => {
      expect(isValidObjectId("64f1a2b3c4d5e6f7a8b9c0d1")).toBe(true);
    });
    it("rejects invalid id", () => {
      expect(isValidObjectId("not-an-id")).toBe(false);
    });
  });

  describe("isPositiveNumber", () => {
    it("accepts 1",              () => { expect(isPositiveNumber(1)).toBe(true);     });
    it("rejects 0",              () => { expect(isPositiveNumber(0)).toBe(false);    });
    it("rejects negative",       () => { expect(isPositiveNumber(-5)).toBe(false);   });
    it("rejects string",         () => { expect(isPositiveNumber("5")).toBe(false);  });
  });

  describe("isPositiveInteger", () => {
    it("accepts 3",              () => { expect(isPositiveInteger(3)).toBe(true);    });
    it("rejects float 1.5",      () => { expect(isPositiveInteger(1.5)).toBe(false); });
    it("rejects 0",              () => { expect(isPositiveInteger(0)).toBe(false);   });
  });

  describe("isInRange", () => {
    it("accepts value in range",    () => { expect(isInRange(5, 1, 10)).toBe(true);  });
    it("accepts boundary values",   () => { expect(isInRange(1, 1, 10)).toBe(true);  });
    it("rejects out-of-range",      () => { expect(isInRange(11, 1, 10)).toBe(false); });
  });

  describe("isValidRating", () => {
    it("accepts 1 through 5",    () => {
      [1, 2, 3, 4, 5].forEach((r) => expect(isValidRating(r)).toBe(true));
    });
    it("rejects 0 and 6",        () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
    });
    it("rejects float 3.5",      () => { expect(isValidRating(3.5)).toBe(false); });
  });

  describe("isNonEmptyString", () => {
    it("accepts non-empty string",  () => { expect(isNonEmptyString("hello")).toBe(true);  });
    it("rejects empty string",      () => { expect(isNonEmptyString("")).toBe(false);     });
    it("rejects whitespace only",   () => { expect(isNonEmptyString("   ")).toBe(false);  });
    it("rejects non-string",        () => { expect(isNonEmptyString(123)).toBe(false);    });
  });

  describe("checkRequiredFields", () => {
    it("returns valid when all fields present", () => {
      const result = checkRequiredFields({ name: "John", email: "j@e.com" }, ["name", "email"]);
      expect(result.valid).toBe(true);
    });

    it("reports missing fields", () => {
      const result = checkRequiredFields({ name: "John" }, ["name", "email"]);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("email");
    });

    it("treats empty string as missing", () => {
      const result = checkRequiredFields({ name: "" }, ["name"]);
      expect(result.valid).toBe(false);
    });
  });

  describe("isValidEnum", () => {
    const roles = ["admin", "staff", "guest"];
    it("accepts allowed value",   () => { expect(isValidEnum("admin",   roles)).toBe(true);  });
    it("rejects unknown value",   () => { expect(isValidEnum("manager", roles)).toBe(false); });
  });

  describe("isStrongPassword", () => {
    it("accepts valid strong password",     () => { expect(isStrongPassword("Secret@123")).toBe(true);  });
    it("rejects short password",            () => { expect(isStrongPassword("Aa1")).toBe(false);        });
    it("rejects password without number",   () => { expect(isStrongPassword("SecretABC")).toBe(false);  });
    it("rejects password without uppercase",() => { expect(isStrongPassword("secret@123")).toBe(false); });
  });
});
