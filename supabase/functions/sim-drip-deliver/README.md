# sim-drip-deliver

Lead Sim delivery worker. Invoked every minute by pg_cron (via `pg_net` → `sim_invoke_delivery()`)
or on demand by the admin "Run delivery now" action. Each invocation claims up to 25 due leads
via the `sim_worker_claim` RPC, builds each client's webhook payload (field mapping, constants,
custom headers, JSON or form encoding), POSTs it with a 10s timeout (5 in parallel per chunk),
and records every outcome via `sim_worker_record` (success, retry backoff, circuit breaker).

**Auth model:** `verify_jwt = false` — the cron call carries no JWT. Instead the caller must send
an `x-sim-cron-secret` header; the function forwards it to `sim_worker_claim`, which validates it
in SQL against the Vault secret `sim_cron_secret` (missing header → 401; mismatch → 401 from SQL).

**Dry-run — double opt-in for live sends.** A real HTTP request is only sent when BOTH are true:

1. the admin dry-run toggle is off (`sim_settings.dry_run = false`, flipped in the admin UI), AND
2. the environment signals that live sends are allowed: the function secret
   `SIM_DRIP_LIVE_ALLOWED` is `"true"`, or `SUPABASE_URL` contains the production project ref
   (`padrhwykbrioohogickg`).

In every other case the worker forces dry-run: it builds the payload, records it (secret redacted
as `•••`) and marks the lead `sent` with a `[dry-run]` response body — nothing leaves the
function. The response JSON reports the effective mode as `dry_run` plus `forced_dry_run: true`
when the DB asked for live but the environment refused. Locally, `SIM_DRIP_LIVE_ALLOWED` is wired
through `[edge_runtime.secrets]` in `supabase/config.toml`; leave the env var unset so a local
stack can never send real webhooks, even if someone flips the DB toggle.

**Field mapping with raw fallback:** each `field_mapping.fields` entry maps a source key to the
client's field name. The source key is resolved against the canonical fields first (`email` plus
`payload_json.canonical`), then falls back to the lead's raw CSV row (`payload_json.raw`) — so a
mapping may reference any original CSV column header, not just the 6 canonical fields. Missing or
empty values are omitted from the body. (Mirrored in `src/features/leadsim/lib/payload.js` — keep
the two in sync.)

**Record-failure surfacing:** a `sim_worker_record` RPC error is never silently swallowed — the
function logs `sim_worker_record failed <lead_id> <message>`, sets `recordOk: false` on that
result, and counts it in the top-level `record_failures` field of the response. A non-zero count
means some outcomes were not persisted — those leads sit in `sending` until the stale-claim
reaper in `sim_worker_claim` hands them back to the scheduler after 10 minutes (i.e. they will be
re-attempted), so check the function logs when the count is non-zero.

**Prod deploy runbook:** `supabase functions deploy sim-drip-deliver --no-verify-jwt`, set the
function secret `SIM_DRIP_LIVE_ALLOWED=true` (or rely on the prod `SUPABASE_URL` ref), then update
the Vault secret `sim_function_url` to `https://<ref>.supabase.co/functions/v1/sim-drip-deliver`.
`dry_run` stays TRUE until an admin explicitly flips it to live.
