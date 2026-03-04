import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail } from "../email";

describe("email utils", () => {
  it("normalizes case and spaces", () => {
    expect(normalizeEmail("  A@Example.COM ")).toBe("a@example.com");
  });

  it("validates basic email format", () => {
    expect(isValidEmail("a@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });
});
