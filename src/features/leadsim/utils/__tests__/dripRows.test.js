import { describe, it, expect } from "vitest";
import { buildDripRows } from "../dripRows";

describe("buildDripRows", () => {
  it("extracts the canonical block and preserves the email", () => {
    const row = {
      email: "jane@example.com",
      "full name": "Jane Doe",
      tel: "+33600000000",
      answer: "Beginner",
    };
    const rows = buildDripRows([row]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("jane@example.com");
    expect(rows[0].canonical).toEqual({
      full_name: "Jane Doe",
      tel: "+33600000000",
      answer: "Beginner",
    });
    expect(rows[0].raw).toEqual(row);
  });

  it("drops empty canonical values", () => {
    const rows = buildDripRows([{ email: "a@x.com" }]);
    expect(rows[0].email).toBe("a@x.com");
    expect(rows[0].canonical).toEqual({});
    expect(rows[0].raw).toEqual({ email: "a@x.com" });
  });

  it("maps post-transform header keys (full_name/phone) too", () => {
    const rows = buildDripRows([
      {
        email: "b@x.com",
        full_name: "Bob Roe",
        phone: "+33700000000",
        date: "2026-06-01",
        campaign: "Spring",
      },
    ]);
    expect(rows[0].canonical).toEqual({
      full_name: "Bob Roe",
      tel: "+33700000000",
      date: "2026-06-01",
      campaign: "Spring",
    });
  });

  it("returns an empty array for empty/missing input", () => {
    expect(buildDripRows([])).toEqual([]);
    expect(buildDripRows(null)).toEqual([]);
  });
});
