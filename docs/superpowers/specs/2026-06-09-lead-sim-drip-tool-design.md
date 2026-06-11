# Lead Sim — Drip Delivery Tool (Design)

**Date:** 2026-06-09
**Status:** Approved design, pending spec review
**Author:** Admin tooling

## Problem

Today, fbaged receives bulk lead lists, dedupes/imports them, and the app's
*signed-in users* view and download those leads in-app. Leads live in the DB
tied to a user + campaign.

A different class of client does **not** log into fbaged. They run their own
CRM and want leads delivered directly into it. Two requirements make a plain
bulk push unacceptable:

1. **Delivery target is the client's CRM**, not the fbaged UI. The client gives
   us a webhook/API endpoint.
2. **Leads must arrive gradually and look organic** — trickled in over hours and
   days with realistic, varied timing, as if real people were signing up to a
   newsletter/ad — not dumped all at once.

This tool is an **extra, standalone admin tool**, fully separate from the
existing in-app leads system.

## Goals

- Admin configures an external client's webhook + how to shape the payload.
- Admin uploads a CSV lead list for a client (same format as today's imports).
- The tool delivers leads to the client's webhook **gradually**, paced by a
  daily volume, spread realistically across the client's business hours.
- Per-client deduplication: a given email is never delivered twice to the same
  client.
- Admin can monitor and control a running drip: pause/resume/cancel, see
  per-lead status, retry failures, adjust pace mid-drip.
- A broken webhook auto-pauses the drip instead of burning the whole list.

## Non-Goals

- Named per-CRM integrations (HubSpot/Salesforce native APIs). We deliver via a
  **generic webhook** only. Per-CRM adapters may come later.
- Letting external clients log into fbaged. They never authenticate; the admin
  operates entirely on their behalf.
- A built-in "test send" UI (explicitly deferred). A thin internal hook may
  exist but no UI is built now.
- Reusing/coupling with the existing in-app `leads` table. The two systems are
  independent; lists enter this tool via CSV upload.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| CRM delivery | Generic webhook (POST URL + headers) |
| Pacing model | Daily volume + realistic spread (jittered, business-hours) |
| Payload | Per-client field mapping; JSON or form-encoded |
| Input & dedup | CSV upload + dedup per client (by email) |
| Controls | Pause/resume/cancel, live per-lead status, adjust pace mid-drip |
| Failure policy | Circuit breaker — N consecutive failures auto-pause the drip |
| Engine architecture | pg_cron + Supabase Edge Function (Option A) |
| Env safety | Tests never hit prod; worker dry-runs outside real prod deploy |

## Architecture

Everything runs on Supabase (one platform). Confirmed available on the project:
`pg_cron` (1.6.4), `pg_net` (0.19.5), `supabase_vault`.

```
CSV upload (admin UI)
      │  admin_sim_drip_create RPC
      ▼
 sim_drips + sim_drip_leads (status=queued)
      │
      ├── Planner  (plpgsql, pg_cron hourly)
      │     assigns scheduled_at to queued leads,
      │     respecting daily_volume + window + off-days
      ▼
 sim_drip_leads (status=scheduled, scheduled_at set)
      │
      ├── Delivery worker (Edge Function `sim-drip-deliver`,
      │     invoked by pg_cron every minute)
      │     picks due leads → POST to client webhook → records result
      ▼
 client's CRM webhook
```

### Naming & layout

| Layer | Artifacts |
|---|---|
| Database | `sim_clients`, `sim_drips`, `sim_drip_leads`; RPCs `admin_sim_*`; plpgsql planner; pg_cron jobs |
| Edge Function | `supabase/functions/sim-drip-deliver/` |
| Services | `src/services/leadSimApi.js` |
| Feature UI | `src/features/leadsim/` (`admin/`, `hooks/`) |
| Page/route | `src/pages/LeadSim.jsx`, route `/admin/lead-sim` (admin-only) |

## Data Model

### `sim_clients`
External client + delivery config.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `name` | text | display name |
| `webhook_url` | text | client's endpoint |
| `http_method` | text | default `POST` |
| `content_type` | text enum | `application/json` \| `application/x-www-form-urlencoded` |
| `field_mapping` | jsonb | canonical field → target key; supports constant values |
| `custom_headers` | jsonb | header name → value (non-secret) |
| `auth_secret_ref` | text | reference into Vault for the auth header value |
| `timezone` | text | IANA tz, e.g. `Europe/Paris` |
| `send_window_start` | time | e.g. `08:00` |
| `send_window_end` | time | e.g. `21:00` |
| `skip_weekends` | bool | default false |
| `default_daily_volume` | int | default pace when creating a drip |
| `is_archived` | bool | soft-delete |
| `created_at` / `created_by` | timestamptz / uuid | |

**Field mapping shape** (example):
```json
{
  "fields": { "email": "Email", "full_name": "name", "tel": "phone" },
  "constants": { "source": "facebook-lead" }
}
```
Canonical fields available from a lead: `full_name`, `email`, `tel`, `answer`,
`date`, `campaign`, plus any passthrough keys present in `payload_json`.

### `sim_drips`
One uploaded list for one client.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `client_id` | uuid fk → sim_clients | |
| `name` | text | |
| `source_filename` | text | |
| `status` | text enum | `draft` \| `running` \| `paused` \| `completed` \| `canceled` |
| `paused_reason` | text null | set when circuit breaker trips |
| `daily_volume` | int | editable mid-drip |
| `total_count` | int | denormalized |
| `sent_count` | int | denormalized |
| `failed_count` | int | denormalized |
| `consecutive_failures` | int | drives circuit breaker; reset on any success |
| `started_at` | timestamptz null | |
| `created_at` / `created_by` | | |

Pacing window/timezone are read from the client at delivery/planning time
(single source of truth on `sim_clients`).

### `sim_drip_leads`
Each lead queued for delivery.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `drip_id` | uuid fk → sim_drips | |
| `client_id` | uuid | denormalized for dedup index |
| `email` | citext | |
| `payload_json` | jsonb | raw lead fields |
| `scheduled_at` | timestamptz null | when to fire |
| `status` | text enum | `queued`\|`scheduled`\|`sending`\|`sent`\|`failed`\|`canceled`\|`skipped_duplicate` |
| `attempts` | int | default 0 |
| `last_attempt_at` | timestamptz null | |
| `sent_at` | timestamptz null | |
| `response_status` | int null | HTTP status |
| `response_body` | text null | truncated (e.g. 2 KB) |
| `error` | text null | |

**Dedup:** unique index on `(client_id, lower(email))`. On upload, colliding
rows are recorded as `skipped_duplicate` and surfaced in the preview, mirroring
the existing import's duplicate handling.

## Drip Engine

### Planner (plpgsql, pg_cron hourly)
Maintains a rolling ~24–48h scheduling horizon per `running` drip. For each:

1. Determine the client's local timezone, send window, and off-days.
2. For each upcoming local day inside the horizon that has no full schedule yet,
   choose a target count = `daily_volume` ± 20% jitter (so daily counts vary).
3. Pull that many `queued` leads (FIFO by id) and assign each a `scheduled_at`
   at a **random time within the send window** — random offsets, not evenly
   spaced, so gaps cluster like real signups. Skip configured off-days.
4. Mark those leads `scheduled`.

Editing `daily_volume` mid-drip is picked up on the next planner cycle. Scaling:
only the near-horizon is scheduled at a time, so 50k-row lists don't precompute
50k timestamps.

The distribution algorithm (given window, count, tz, seed) is implemented as a
**pure function** so it is unit-testable without a database, then called from
the plpgsql planner (or computed in the worker — see Open Questions).

### Delivery worker (Edge Function `sim-drip-deliver`, pg_cron every minute)
1. Select `scheduled` leads in `running` drips where `scheduled_at <= now()`,
   lock with `FOR UPDATE SKIP LOCKED`, set `sending`.
2. For each: build payload from the client's `field_mapping` (`fields` +
   `constants`), encode per `content_type`, merge `custom_headers` + the Vault
   auth secret, POST to `webhook_url` with a timeout.
3. **Success** (2xx): `sent`, record `response_status`/`response_body`,
   `sent_at`; increment `sent_count`; reset `consecutive_failures` to 0.
4. **Failure**: increment `attempts`. If `attempts < max_attempts` (default 5),
   re-`scheduled` at `now() + backoff` (exponential, e.g. `2^attempts` minutes).
   Else `failed`, increment `failed_count` and `consecutive_failures`.
5. **Circuit breaker**: if `consecutive_failures >= threshold` (default 5), set
   the drip `paused` with `paused_reason`, so the list is not burned on a broken
   webhook/credentials. Surfaced in the UI.
6. When no `queued`/`scheduled`/`sending` leads remain, mark the drip
   `completed`.

Minute-level granularity is sufficient for "organic" pacing.

## Upload & Preview (reuses existing import logic)

Mirrors the current `LeadsImportForm → preview → confirm` flow:

1. Admin selects a client and uploads a CSV.
2. Parse with Papa Parse (already a dependency). **Reuse the header
   normalization + alias mapping currently in `leadsApi.js`** — factor the
   shared normalization helpers (`normalizeFieldKey`, alias sets, `buildFullName`,
   etc.) into a shared module imported by both the existing leads import and this
   tool. No behavioral change to the existing import.
3. Preview: show counts (new vs duplicate against this client's existing
   `sim_drip_leads`) plus a sample.
4. Confirm: `admin_sim_drip_create` RPC (SECURITY DEFINER, admin-only — matches
   the existing `admin_leads_import_confirm` pattern) inserts a `sim_drip` +
   `queued` `sim_drip_leads`, recording duplicates as `skipped_duplicate`.

## Controls

| Control | Mechanism |
|---|---|
| Pause / resume | Set `sim_drips.status` to `paused` / `running`; planner & worker only act on `running` drips |
| Cancel | Set drip `canceled`; remaining `queued`/`scheduled` leads → `canceled` |
| Live per-lead status | Table reading `sim_drip_leads` (status, scheduled-for, sent-at, response/error) |
| Retry failed | Auto-retry in worker (backoff); manual "retry now" RPC resets a `failed` lead to `scheduled` at `now()` and clears the breaker counter |
| Adjust pace | Edit `sim_drips.daily_volume`; planner uses new value next cycle |

## Security

- All `sim_*` tables: RLS, **admin-only**, reusing the existing is-admin check
  (same pattern as `admin_list_users` and friends).
- Webhook auth secrets stored in **Vault**, resolved only inside the Edge
  Function (service role). Never returned to the browser.
- The Edge Function is gated by a **cron shared-secret header** (stored in
  Vault) validated on each request, so only pg_cron can invoke it.
- All write paths go through SECURITY DEFINER RPCs that assert admin.

## Environment Safety & Test Isolation

The Supabase project `padrhwykbrioohogickg` is **production**: it backs the live
site at fbaged.com, holds real users and 56k+ real leads, and is written to
daily. This tool additionally makes **real outbound POSTs to clients' CRM
webhooks**, so a test against prod could fire real leads at real clients. Every
test/dev path must be unable to touch prod.

- **No tests against prod.** Vitest runs against pure logic + mocks, or a local
  Supabase stack (`supabase start`). A test bootstrap guard asserts the
  configured Supabase URL/ref is **not** `padrhwykbrioohogickg` and fails fast
  otherwise.
- **The Docker-based local stack is the sandbox.** `supabase start` (requires
  the Docker daemon running) brings up Postgres + pg_cron + pg_net + Vault +
  Edge runtime + Storage in containers on localhost — fully isolated from prod.
  All migrations, RPCs, the planner, and the `sim-drip-deliver` Edge Function
  are exercised here. `pg_cron`, `pg_net`, and Vault must be **enabled in the
  local config/migrations** (available but off by default locally).
- **Schema work goes local-first.** Develop migrations with the Supabase CLI
  against the local stack; review before applying to prod. Do **not** use the
  Supabase MCP `apply_migration`/`execute_sql` to mutate prod for development
  (read-only inspection is fine).
- **Delivery worker defaults to dry-run.** The worker only performs real
  outbound POSTs when running in a real prod deployment. In any non-prod/test
  context it operates in **dry-run**: it builds the request and records the
  intended payload/headers but does not send. Controlled by an environment flag
  (e.g. `SIM_DRIP_DRY_RUN`) and additionally guarded so a non-prod Supabase ref
  forces dry-run on.
- **Manual E2E** of webhook delivery targets a throwaway endpoint
  (webhook.site / requestbin), never a real client URL, and runs against a local
  or staging Supabase project — not prod.

## Testing

Vitest (already configured):

- **Payload builder**: mapping (`fields` + `constants`) → correct JSON and
  form-encoded bodies; header merge.
- **Scheduler distribution** (pure function): respects send window, daily cap +
  jitter, skips off-days, produces non-uniform (clustered) gaps, deterministic
  given a seed.
- **Dedup**: per-client email collisions are skipped; cross-client identical
  emails are allowed.
- Shared CSV normalization: extract-and-reuse does not change existing import
  behavior (existing tests in `src/features/leads/**/__tests__` must still pass).
- **Prod-safety guard**: the test bootstrap guard rejects a prod Supabase
  URL/ref; the worker forces dry-run when not in a real prod deployment.

## Open Questions / Defaults (proceeding unless changed)

- **Where the distribution runs**: pure JS function unit-tested in the frontend
  test suite, with the authoritative scheduling done in the plpgsql planner
  (port of the same algorithm). Alternative: let the Edge Function do planning
  too. Default: planner in plpgsql for the schedule horizon; pure-function tests
  mirror its logic.
- **Defaults**: `max_attempts = 5`, breaker `threshold = 5` consecutive
  failures, response body truncated at 2 KB, scheduling horizon 48h, daily
  jitter ±20%, send window default 08:00–21:00 in the client's timezone.
- **pg_cron cadence**: planner hourly, delivery worker every minute.
