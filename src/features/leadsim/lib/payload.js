/**
 * Lead Sim delivery payload builder.
 *
 * Mirror of `buildDeliveryPayload` / `redactedPayload` in
 * `supabase/functions/sim-drip-deliver/index.ts` — keep in sync.
 * Used by the UI payload preview so admins see the exact request the
 * worker will send for a lead.
 */

/**
 * Build the outgoing request for one claimed lead.
 *
 * @param {{
 *   email: string,
 *   payload_json: { canonical?: Record<string, string>, raw?: Record<string, unknown> } | null,
 *   webhook_url: string,
 *   http_method: string,
 *   content_type: string,
 *   field_mapping: { fields?: Record<string, string>, constants?: Record<string, string> } | null,
 *   custom_headers: Record<string, string> | null,
 *   auth_secret: string | null,
 * }} lead
 * @returns {{ body: Record<string, string>, encoded: string, headers: Record<string, string>, url: string, method: string }}
 */
export function buildDeliveryPayload(lead) {
  const canonical = {
    email: lead.email,
    ...(lead.payload_json?.canonical ?? {}),
  };
  const fields = lead.field_mapping?.fields ?? {};
  const constants = lead.field_mapping?.constants ?? {};
  const body = {};
  for (const [canonicalKey, theirKey] of Object.entries(fields)) {
    const value = canonical[canonicalKey];
    if (theirKey && value) body[theirKey] = value;
  }
  for (const [key, value] of Object.entries(constants)) {
    if (key) body[key] = String(value);
  }
  const headers = {};
  let secretPlaced = false;
  for (const [name, raw] of Object.entries(lead.custom_headers ?? {})) {
    let value = String(raw);
    if (lead.auth_secret && value.includes("{{secret}}")) {
      value = value.replaceAll("{{secret}}", lead.auth_secret);
      secretPlaced = true;
    }
    headers[name] = value;
  }
  if (lead.auth_secret && !secretPlaced) {
    headers["Authorization"] = `Bearer ${lead.auth_secret}`;
  }
  const isForm = lead.content_type === "application/x-www-form-urlencoded";
  headers["Content-Type"] = isForm
    ? "application/x-www-form-urlencoded"
    : "application/json";
  const encoded = isForm
    ? new URLSearchParams(body).toString()
    : JSON.stringify(body);
  return {
    body,
    encoded,
    headers,
    url: lead.webhook_url,
    method: lead.http_method || "POST",
  };
}

/**
 * Mask the auth secret anywhere it appears in the headers, for safe display
 * and storage (`delivered_payload`). Body/url/method pass through untouched.
 *
 * @param {ReturnType<typeof buildDeliveryPayload>} p
 * @param {string | null} secret
 */
export function redactedPayload(p, secret) {
  const safeHeaders = {};
  for (const [k, v] of Object.entries(p.headers)) {
    safeHeaders[k] = secret && v.includes(secret) ? v.replaceAll(secret, "•••") : v;
  }
  return { url: p.url, method: p.method, headers: safeHeaders, body: p.body };
}
