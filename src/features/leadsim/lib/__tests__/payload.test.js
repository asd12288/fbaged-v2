import { describe, it, expect } from "vitest";
import { buildDeliveryPayload, redactedPayload } from "../payload";

function makeLead(overrides = {}) {
  return {
    id: "l1",
    drip_id: "d1",
    email: "jane@example.com",
    payload_json: {
      canonical: { full_name: "Jane Doe", tel: "+33600000000" },
      raw: {},
    },
    attempts: 0,
    webhook_url: "https://crm.example.com/leads",
    http_method: "POST",
    content_type: "application/json",
    field_mapping: {
      fields: { email: "Email", full_name: "Name", tel: "Phone" },
      constants: {},
    },
    custom_headers: {},
    auth_secret: null,
    ...overrides,
  };
}

describe("buildDeliveryPayload", () => {
  it("encodes JSON bodies for application/json clients", () => {
    const payload = buildDeliveryPayload(makeLead());
    expect(payload.body).toEqual({
      Email: "jane@example.com",
      Name: "Jane Doe",
      Phone: "+33600000000",
    });
    expect(payload.encoded).toBe(JSON.stringify(payload.body));
    expect(payload.headers["Content-Type"]).toBe("application/json");
    expect(payload.url).toBe("https://crm.example.com/leads");
    expect(payload.method).toBe("POST");
  });

  it("encodes form bodies for application/x-www-form-urlencoded clients", () => {
    const payload = buildDeliveryPayload(
      makeLead({ content_type: "application/x-www-form-urlencoded" })
    );
    expect(payload.encoded).toBe(new URLSearchParams(payload.body).toString());
    expect(payload.encoded).toContain("Email=jane%40example.com");
    expect(payload.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
  });

  it("skips mapped fields with empty values or empty target keys", () => {
    const payload = buildDeliveryPayload(
      makeLead({
        payload_json: { canonical: { full_name: "Jane Doe" }, raw: {} },
        field_mapping: {
          fields: { email: "Email", full_name: "Name", tel: "Phone", answer: "" },
          constants: {},
        },
      })
    );
    // tel has no value, answer maps to an empty key — both dropped.
    expect(payload.body).toEqual({ Email: "jane@example.com", Name: "Jane Doe" });
    expect(payload.body).not.toHaveProperty("Phone");
  });

  it("merges constants into the body", () => {
    const payload = buildDeliveryPayload(
      makeLead({
        field_mapping: {
          fields: { email: "Email" },
          constants: { source: "facebook", priority: 3 },
        },
      })
    );
    expect(payload.body).toEqual({
      Email: "jane@example.com",
      source: "facebook",
      priority: "3",
    });
  });

  it("substitutes {{secret}} placeholders in custom headers", () => {
    const payload = buildDeliveryPayload(
      makeLead({
        auth_secret: "tok-123",
        custom_headers: { "X-Api-Key": "{{secret}}", "X-Env": "prod" },
      })
    );
    expect(payload.headers["X-Api-Key"]).toBe("tok-123");
    expect(payload.headers["X-Env"]).toBe("prod");
    // The placeholder consumed the secret: no default Authorization header.
    expect(payload.headers).not.toHaveProperty("Authorization");
  });

  it("defaults to Authorization: Bearer when no placeholder consumed the secret", () => {
    const payload = buildDeliveryPayload(
      makeLead({ auth_secret: "tok-123", custom_headers: { "X-Env": "prod" } })
    );
    expect(payload.headers["Authorization"]).toBe("Bearer tok-123");
  });

  it("adds no Authorization header when there is no secret", () => {
    const payload = buildDeliveryPayload(makeLead({ auth_secret: null }));
    expect(payload.headers).not.toHaveProperty("Authorization");
  });

  it("defaults the method to POST when http_method is missing", () => {
    const payload = buildDeliveryPayload(makeLead({ http_method: "" }));
    expect(payload.method).toBe("POST");
  });
});

describe("redactedPayload", () => {
  it("masks the secret wherever it appears in headers", () => {
    const lead = makeLead({
      auth_secret: "tok-123",
      custom_headers: { "X-Api-Key": "key {{secret}} suffix" },
    });
    const payload = buildDeliveryPayload(lead);
    const safe = redactedPayload(payload, lead.auth_secret);
    expect(safe.headers["X-Api-Key"]).toBe("key ••• suffix");
    expect(JSON.stringify(safe.headers)).not.toContain("tok-123");
    expect(safe.url).toBe(payload.url);
    expect(safe.method).toBe(payload.method);
    expect(safe.body).toEqual(payload.body);
  });

  it("masks the default bearer header", () => {
    const lead = makeLead({ auth_secret: "tok-123" });
    const safe = redactedPayload(buildDeliveryPayload(lead), lead.auth_secret);
    expect(safe.headers["Authorization"]).toBe("Bearer •••");
  });

  it("passes headers through untouched when there is no secret", () => {
    const payload = buildDeliveryPayload(makeLead());
    const safe = redactedPayload(payload, null);
    expect(safe.headers).toEqual(payload.headers);
  });
});
