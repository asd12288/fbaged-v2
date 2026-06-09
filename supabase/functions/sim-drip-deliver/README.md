# sim-drip-deliver

Lead Sim delivery worker. Invoked every minute by pg_cron (via `pg_net` → `sim_invoke_delivery()`)
or on demand by the admin "Run delivery now" action. Each invocation claims up to 25 due leads
via the `sim_worker_claim` RPC, builds each client's webhook payload (field mapping, constants,
custom headers, JSON or form encoding), POSTs it with a 10s timeout (5 in parallel per chunk),
and records every outcome via `sim_worker_record` (success, retry backoff, circuit breaker).

**Auth model:** `verify_jwt = false` — the cron call carries no JWT. Instead the caller must send
an `x-sim-cron-secret` header; the function forwards it to `sim_worker_claim`, which validates it
in SQL against the Vault secret `sim_cron_secret` (missing header → 401; mismatch → 401 from SQL).

**Dry-run:** when `sim_settings.dry_run` is true (the default), no HTTP request is sent — the
function builds the payload, records it (secret redacted as `•••`) and marks the lead `sent`
with a `[dry-run]` response body.

**Prod deploy runbook:** `supabase functions deploy sim-drip-deliver --no-verify-jwt`, then update
the Vault secret `sim_function_url` to `https://<ref>.supabase.co/functions/v1/sim-drip-deliver`.
`dry_run` stays TRUE until an admin explicitly flips it to live.
