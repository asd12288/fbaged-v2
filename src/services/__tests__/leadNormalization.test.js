import { describe, it, expect } from "vitest";
import {
  normalizeFieldKey,
  mapLeadRowToExportRow,
} from "../leadNormalization";

describe("leadNormalization", () => {
  it("normalizes accented/camel/spaced headers to snake keys", () => {
    expect(normalizeFieldKey("Numéro de téléphone")).toBe("numero_de_telephone");
    expect(normalizeFieldKey("fullName")).toBe("full_name");
    expect(normalizeFieldKey("  Email  ")).toBe("email");
  });

  it("maps a raw lead row to canonical export fields", () => {
    const row = {
      email: "a@b.com",
      payload_json: { "Full Name": "Jane Doe", tel: "0600000000", campaign: "Spring" },
    };
    const out = mapLeadRowToExportRow(row, { campaignName: "Fallback" });
    expect(out["full name"]).toBe("Jane Doe");
    expect(out.email).toBe("a@b.com");
    expect(out.tel).toBe("0600000000");
    expect(out.campaign).toBe("Spring");
  });
});
