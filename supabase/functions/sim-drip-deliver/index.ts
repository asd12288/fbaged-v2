// Lead Sim delivery worker. Invoked by pg_cron (via pg_net) every minute, or by
// admin "Run delivery now". Auth = x-sim-cron-secret header, validated in SQL by
// sim_worker_claim. Honors global dry-run: builds + records payloads, sends nothing.
import { createClient } from "npm:@supabase/supabase-js@2";

const CHUNK = 5;          // parallel sends per batch
const CLAIM_LIMIT = 25;   // leads per invocation
const FETCH_TIMEOUT_MS = 10_000;

type ClaimedLead = {
  id: string;
  drip_id: string;
  email: string;
  payload_json: { canonical?: Record<string, string>; raw?: Record<string, unknown> } | null;
  attempts: number;
  webhook_url: string;
  http_method: string;
  content_type: string;
  field_mapping: { fields?: Record<string, string>; constants?: Record<string, string> } | null;
  custom_headers: Record<string, string> | null;
  auth_secret: string | null;
};

// Mirror of src/features/leadsim/lib/payload.js — keep in sync.
export function buildDeliveryPayload(lead: ClaimedLead) {
  const canonical: Record<string, string> = {
    email: lead.email,
    ...(lead.payload_json?.canonical ?? {}),
  };
  const fields = lead.field_mapping?.fields ?? {};
  const constants = lead.field_mapping?.constants ?? {};
  const body: Record<string, string> = {};
  for (const [canonicalKey, theirKey] of Object.entries(fields)) {
    const value = canonical[canonicalKey];
    if (theirKey && value) body[theirKey] = value;
  }
  for (const [key, value] of Object.entries(constants)) {
    if (key) body[key] = String(value);
  }
  const headers: Record<string, string> = {};
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
  headers["Content-Type"] = isForm ? "application/x-www-form-urlencoded" : "application/json";
  const encoded = isForm
    ? new URLSearchParams(body).toString()
    : JSON.stringify(body);
  return { body, encoded, headers, url: lead.webhook_url, method: lead.http_method || "POST" };
}

function redactedPayload(p: ReturnType<typeof buildDeliveryPayload>, secret: string | null) {
  const safeHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.headers)) {
    safeHeaders[k] = secret && v.includes(secret) ? v.replaceAll(secret, "•••") : v;
  }
  return { url: p.url, method: p.method, headers: safeHeaders, body: p.body };
}

async function deliverOne(admin: ReturnType<typeof createClient>, secret: string, lead: ClaimedLead, dryRun: boolean) {
  const payload = buildDeliveryPayload(lead);
  const recorded = redactedPayload(payload, lead.auth_secret);
  if (dryRun) {
    await admin.rpc("sim_worker_record", {
      p_secret: secret, p_lead_id: lead.id, p_success: true,
      p_response_status: null, p_response_body: "[dry-run] delivery simulated — no request sent",
      p_error: null, p_delivered_payload: recorded,
    });
    return { id: lead.id, ok: true, dryRun: true };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(payload.url, {
      method: payload.method, headers: payload.headers, body: payload.encoded,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = (await res.text()).slice(0, 2048);
    await admin.rpc("sim_worker_record", {
      p_secret: secret, p_lead_id: lead.id, p_success: res.ok,
      p_response_status: res.status, p_response_body: text,
      p_error: res.ok ? null : `HTTP ${res.status}`, p_delivered_payload: recorded,
    });
    return { id: lead.id, ok: res.ok, status: res.status };
  } catch (err) {
    await admin.rpc("sim_worker_record", {
      p_secret: secret, p_lead_id: lead.id, p_success: false,
      p_response_status: null, p_response_body: null,
      p_error: String(err).slice(0, 500), p_delivered_payload: recorded,
    });
    return { id: lead.id, ok: false, error: String(err).slice(0, 200) };
  }
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-sim-cron-secret");
  if (!secret) {
    return new Response(JSON.stringify({ error: "missing x-sim-cron-secret" }), { status: 401 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("sim_worker_claim", {
    p_secret: secret, p_limit: CLAIM_LIMIT,
  });
  if (error) {
    const status = /invalid worker secret/i.test(error.message) ? 401 : 500;
    return new Response(JSON.stringify({ error: error.message }), { status });
  }
  const dryRun: boolean = Boolean(data?.dry_run);
  const leads: ClaimedLead[] = data?.leads ?? [];
  const results: unknown[] = [];
  for (let i = 0; i < leads.length; i += CHUNK) {
    const chunk = leads.slice(i, i + CHUNK);
    results.push(...(await Promise.all(chunk.map((l) => deliverOne(admin, secret, l, dryRun)))));
  }
  return new Response(
    JSON.stringify({ processed: leads.length, dry_run: dryRun, results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
