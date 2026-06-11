# Lead Sim — Plans 3+4 Contract: Drip Engine & Controls/Monitoring UI

Companion to `2026-06-09-lead-sim-plan-2-upload-drips.md` (the upload plan, "the Plan-2 doc").
This doc pins the EXACT contracts for the delivery engine and the admin controls so
parallel builders cannot drift. SQL bodies here are authoritative — assemble, don't redesign.

**Env facts:** local Supabase stack running (CLI: `npx supabase@2.105.0`, NEVER plain `npx supabase`);
SQL via `docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "..."`;
apply migrations with `npx supabase@2.105.0 db reset`. Prod ref `padrhwykbrioohogickg` is OFF LIMITS.
Seeded admin `00000000-0000-0000-0000-000000000001`. Vault is enabled locally.

---

## 1. Data deltas on top of the Plan-2 doc

- `sim_drip_leads` gains one column (add directly in migration `20260609090300_sim_drips.sql`):
  `delivered_payload jsonb` — the exact body the worker sent (or would send in dry-run).
- The Plan-2 doc's Task 2 Step 2 (`on conflict ... do nothing` on the skipped-duplicate insert)
  must be applied directly when writing `20260609090400_sim_drips_rpcs.sql`.
- Lead rows uploaded from the UI have this shape (frontend builds it; create RPC just stores
  `row - 'email'` into `payload_json` as the Plan-2 doc already does):
  ```json
  { "email": "a@x.com",
    "canonical": { "full_name": "...", "tel": "...", "answer": "...", "date": "...", "campaign": "..." },
    "raw": { "...original CSV row..." : "..." } }
  ```
  So `payload_json = {canonical, raw}` and `email` lives in its own column.

## 2. Migration `20260609090500_sim_engine.sql` (engine — full SQL below)

Sections, in order:

### 2.1 Extensions + settings + vault seeds
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Single-row global settings. dry_run defaults TRUE everywhere: real HTTP delivery
-- only happens after an admin explicitly flips it (prod safety).
create table if not exists public.sim_settings (
  id boolean primary key default true check (id),
  dry_run boolean not null default true,
  updated_at timestamptz,
  updated_by uuid
);
insert into public.sim_settings (id) values (true) on conflict do nothing;

alter table public.sim_settings enable row level security;
create policy sim_settings_admin_read on public.sim_settings
  for select to authenticated using (public.is_admin());
grant select on public.sim_settings to authenticated;

-- Idempotent vault seeds: a cron shared secret and the deliver-function URL.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sim_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'sim_cron_secret', 'Shared secret pg_cron presents to the sim-drip-deliver edge function');
  end if;
  if not exists (select 1 from vault.secrets where name = 'sim_function_url') then
    perform vault.create_secret('http://host.docker.internal:54321/functions/v1/sim-drip-deliver', 'sim_function_url', 'URL pg_net posts to to trigger delivery (prod: https://<ref>.supabase.co/functions/v1/sim-drip-deliver)');
  end if;
end $$;
```

### 2.2 Internal helpers (NOT callable from the API)
```sql
create or replace function public.sim_get_secret(p_name text)
returns text language sql security definer set search_path = public
as $$ select decrypted_secret from vault.decrypted_secrets where name = p_name; $$;
revoke all on function public.sim_get_secret(text) from public, anon, authenticated;

-- Trigger one delivery cycle: async POST to the edge function with the cron secret.
create or replace function public.sim_invoke_delivery()
returns bigint language sql security definer set search_path = public
as $$
  select net.http_post(
    url := public.sim_get_secret('sim_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sim-cron-secret', public.sim_get_secret('sim_cron_secret')
    ),
    body := '{}'::jsonb
  );
$$;
revoke all on function public.sim_invoke_delivery() from public, anon, authenticated;
```

### 2.3 Planner (authoritative body — copy verbatim)
```sql
-- Schedules queued leads for today + tomorrow per running drip, in the client's
-- timezone/send-window, with a ±20% jittered daily target and random in-window times.
create or replace function public.sim_plan_drips(p_drip_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  d record;
  v_total_scheduled integer := 0;
  v_drips integer := 0;
  v_day integer;
  v_local_now timestamp;
  v_local_date date;
  v_win_start timestamp;
  v_win_end timestamp;
  v_eff_start timestamp;
  v_eff_start_ts timestamptz;
  v_span interval;
  v_target integer;
  v_already integer;
  v_need integer;
  v_picked integer;
begin
  for d in
    select dr.id, dr.daily_volume, c.timezone, c.send_window_start, c.send_window_end, c.skip_weekends
    from public.sim_drips dr
    join public.sim_clients c on c.id = dr.client_id
    where dr.status = 'running'
      and (p_drip_id is null or dr.id = p_drip_id)
    order by dr.created_at
  loop
    v_drips := v_drips + 1;
    v_local_now := (now() at time zone d.timezone);
    for v_day in 0..1 loop
      v_local_date := (v_local_now)::date + v_day;
      if d.skip_weekends and extract(isodow from v_local_date) in (6, 7) then
        continue;
      end if;
      v_win_start := v_local_date + d.send_window_start;
      v_win_end := v_local_date + d.send_window_end;
      if v_day = 0 then
        v_eff_start := greatest(v_win_start, v_local_now);
      else
        v_eff_start := v_win_start;
      end if;
      if v_eff_start >= v_win_end then
        continue;
      end if;
      v_target := greatest(1, round(d.daily_volume * (0.8 + random() * 0.4))::integer);
      select count(*) into v_already
      from public.sim_drip_leads l
      where l.drip_id = d.id
        and l.status in ('scheduled', 'sending', 'sent', 'failed')
        and ((l.scheduled_at at time zone d.timezone)::date) = v_local_date;
      v_need := v_target - v_already;
      if v_need <= 0 then
        continue;
      end if;
      v_eff_start_ts := v_eff_start at time zone d.timezone;
      v_span := v_win_end - v_eff_start;
      update public.sim_drip_leads l
      set status = 'scheduled',
          scheduled_at = v_eff_start_ts + (pick.r * v_span)
      from (
        select id, random() as r
        from public.sim_drip_leads
        where drip_id = d.id and status = 'queued'
        order by created_at, id
        limit v_need
        for update skip locked
      ) pick
      where l.id = pick.id;
      get diagnostics v_picked = row_count;
      v_total_scheduled := v_total_scheduled + v_picked;
    end loop;
  end loop;
  return jsonb_build_object('drips_planned', v_drips, 'leads_scheduled', v_total_scheduled);
end;
$$;
revoke all on function public.sim_plan_drips(uuid) from public, anon, authenticated;
```

### 2.4 Worker RPCs (service_role only — copy verbatim)
```sql
-- Claim due leads (locks them as 'sending') and return them with client delivery
-- config + decrypted auth secret. Only the edge function (service role) may call;
-- the cron shared secret is validated as defense in depth.
create or replace function public.sim_worker_claim(p_secret text, p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_expected text;
  v_dry boolean;
  v_leads jsonb;
begin
  v_expected := public.sim_get_secret('sim_cron_secret');
  if v_expected is null or p_secret is distinct from v_expected then
    raise exception 'Invalid worker secret';
  end if;
  select dry_run into v_dry from public.sim_settings where id;
  with claimed as (
    update public.sim_drip_leads l
    set status = 'sending', last_attempt_at = now()
    where l.id in (
      select l2.id
      from public.sim_drip_leads l2
      join public.sim_drips d on d.id = l2.drip_id
      where l2.status = 'scheduled'
        and l2.scheduled_at <= now()
        and d.status = 'running'
      order by l2.scheduled_at
      limit greatest(1, least(coalesce(p_limit, 25), 100))
      for update of l2 skip locked
    )
    returning l.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cl.id,
    'drip_id', cl.drip_id,
    'email', cl.email,
    'payload_json', cl.payload_json,
    'attempts', cl.attempts,
    'webhook_url', c.webhook_url,
    'http_method', c.http_method,
    'content_type', c.content_type,
    'field_mapping', c.field_mapping,
    'custom_headers', c.custom_headers,
    'auth_secret', vs.decrypted_secret
  )), '[]'::jsonb)
  into v_leads
  from claimed cl
  join public.sim_clients c on c.id = cl.client_id
  left join vault.decrypted_secrets vs on vs.id = c.auth_secret_ref;
  return jsonb_build_object('dry_run', v_dry, 'leads', v_leads);
end;
$$;
revoke all on function public.sim_worker_claim(text, integer) from public, anon, authenticated;
grant execute on function public.sim_worker_claim(text, integer) to service_role;

-- Record one delivery outcome. Handles retries w/ exponential backoff (2^n min,
-- capped 16, max 5 attempts), the drip circuit breaker (5 consecutive failed
-- ATTEMPTS pauses the drip), counters, and completion detection.
create or replace function public.sim_worker_record(
  p_secret text,
  p_lead_id uuid,
  p_success boolean,
  p_response_status integer,
  p_response_body text,
  p_error text,
  p_delivered_payload jsonb
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_expected text;
  v_lead record;
  v_drip record;
  v_consecutive integer;
  v_breaker constant integer := 5;
  v_max_attempts constant integer := 5;
begin
  v_expected := public.sim_get_secret('sim_cron_secret');
  if v_expected is null or p_secret is distinct from v_expected then
    raise exception 'Invalid worker secret';
  end if;
  select * into v_lead from public.sim_drip_leads where id = p_lead_id for update;
  if not found or v_lead.status <> 'sending' then
    return jsonb_build_object('skipped', true);
  end if;
  select * into v_drip from public.sim_drips where id = v_lead.drip_id for update;

  if p_success then
    update public.sim_drip_leads
    set status = 'sent', sent_at = now(), attempts = v_lead.attempts + 1,
        response_status = p_response_status,
        response_body = left(coalesce(p_response_body, ''), 2048),
        error = null, delivered_payload = p_delivered_payload
    where id = p_lead_id;
    update public.sim_drips
    set sent_count = sent_count + 1, consecutive_failures = 0
    where id = v_drip.id;
  else
    if v_lead.attempts + 1 < v_max_attempts then
      update public.sim_drip_leads
      set status = 'scheduled', attempts = v_lead.attempts + 1,
          scheduled_at = now() + (least(power(2, v_lead.attempts + 1), 16)::integer * interval '1 minute'),
          response_status = p_response_status,
          response_body = left(coalesce(p_response_body, ''), 2048),
          error = left(coalesce(p_error, ''), 500),
          delivered_payload = p_delivered_payload
      where id = p_lead_id;
    else
      update public.sim_drip_leads
      set status = 'failed', attempts = v_lead.attempts + 1,
          response_status = p_response_status,
          response_body = left(coalesce(p_response_body, ''), 2048),
          error = left(coalesce(p_error, ''), 500),
          delivered_payload = p_delivered_payload
      where id = p_lead_id;
      update public.sim_drips set failed_count = failed_count + 1 where id = v_drip.id;
    end if;
    update public.sim_drips
    set consecutive_failures = consecutive_failures + 1
    where id = v_drip.id
    returning consecutive_failures into v_consecutive;
    if v_consecutive >= v_breaker
       and (select status from public.sim_drips where id = v_drip.id) = 'running' then
      update public.sim_drips
      set status = 'paused',
          paused_reason = 'Circuit breaker: ' || v_breaker || ' consecutive delivery failures (last: '
            || left(coalesce(p_error, 'HTTP ' || p_response_status::text, 'unknown'), 120) || ')'
      where id = v_drip.id;
    end if;
  end if;

  if not exists (
    select 1 from public.sim_drip_leads
    where drip_id = v_drip.id and status in ('queued', 'scheduled', 'sending')
  ) and (select status from public.sim_drips where id = v_drip.id) = 'running' then
    update public.sim_drips set status = 'completed' where id = v_drip.id;
  end if;

  return jsonb_build_object('lead_id', p_lead_id, 'drip_id', v_drip.id);
end;
$$;
revoke all on function public.sim_worker_record(text, uuid, boolean, integer, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.sim_worker_record(text, uuid, boolean, integer, text, text, jsonb) to service_role;
```

### 2.5 Admin RPCs (authenticated + `public.is_admin()` gate; grant execute to authenticated)

Signatures + behavior (bodies follow the existing admin RPC idiom — `if not public.is_admin() then raise exception 'Access denied: admin only'; end if;`):

- `admin_sim_drip_get(p_drip_id uuid) returns jsonb` →
  `{drip: <full sim_drips row as jsonb>, client: {id, name, timezone, send_window_start, send_window_end, skip_weekends, content_type, webhook_url}, counts: {queued, scheduled, sending, sent, failed, canceled, skipped_duplicate}}`.
  Counts via `count(*) filter (where status = '...')` over the drip's leads. Raise if drip not found.
- `admin_sim_drip_leads(p_drip_id uuid, p_status text default null, p_limit integer default 100, p_offset integer default 0) returns jsonb` →
  `{total: <count matching filter>, rows: [<lead rows: id, email, status, scheduled_at, sent_at, attempts, response_status, response_body, error, delivered_payload, created_at>]}`
  ordered by `coalesce(scheduled_at, created_at)` ascending.
- `admin_sim_drip_set_status(p_drip_id uuid, p_action text) returns jsonb` (returns updated drip row):
  - `start`: only from `draft` → `running`, `started_at = coalesce(started_at, now())`, clear `paused_reason`, `consecutive_failures = 0`, then `perform public.sim_plan_drips(p_drip_id)`.
  - `resume`: only from `paused` → same updates as start.
  - `pause`: only from `running` → `paused`, `paused_reason = 'Paused by admin'`.
  - `cancel`: from `draft|running|paused` → `canceled`; also `update sim_drip_leads set status='canceled' where drip_id=… and status in ('queued','scheduled','sending')`.
  - anything else / wrong current status: `raise exception` with a clear message.
- `admin_sim_drip_update_pace(p_drip_id uuid, p_daily_volume integer) returns jsonb` — clamp `greatest(p_daily_volume, 1)`, update, and if the drip is `running`, `perform public.sim_plan_drips(p_drip_id)`. Returns updated drip row.
- `admin_sim_drip_retry_lead(p_lead_id uuid) returns jsonb` — only `failed` leads: set `status='scheduled', scheduled_at=now(), attempts=0, error=null, response_status=null, response_body=null`; on the drip: `failed_count = greatest(failed_count - 1, 0)`, `consecutive_failures = 0`. Returns updated lead row.
- `admin_sim_run_planner() returns jsonb` — `is_admin` gate, returns `public.sim_plan_drips()`.
- `admin_sim_run_delivery() returns jsonb` — `is_admin` gate, returns `jsonb_build_object('request_id', public.sim_invoke_delivery())`.
- `admin_sim_get_settings() returns jsonb` — `{dry_run, updated_at}` from `sim_settings`.
- `admin_sim_set_dry_run(p_dry_run boolean) returns jsonb` — update `sim_settings` (+ `updated_at=now(), updated_by=auth.uid()`), return `{dry_run}`.

### 2.6 Cron schedules
```sql
select cron.schedule('sim-drip-planner', '7 * * * *', $$select public.sim_plan_drips();$$);
select cron.schedule('sim-drip-deliver', '* * * * *', $$select public.sim_invoke_delivery();$$);
```

### 2.7 Smoke tests the backend builder must run (psql, after db reset)
1. Objects exist: tables `sim_settings`, functions `sim_plan_drips`, `sim_worker_claim`, `sim_worker_record`, all `admin_sim_*`; `select jobname from cron.job;` shows both jobs; vault has both secrets.
2. Functional loop entirely in SQL (no edge function needed):
   - insert a client + use `admin_sim_drip_create` (as admin: `set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'; set local role authenticated;`) with 5 emails.
   - `admin_sim_drip_set_status(drip,'start')` → leads become `scheduled` (planner ran; assert `scheduled` count between 1 and 5, ±20% jitter of e.g. volume 3 → target 3±1).
   - force due: `update sim_drip_leads set scheduled_at = now() - interval '1 minute' where drip_id=...;`
   - claim as service path: `select public.sim_worker_claim(public.sim_get_secret('sim_cron_secret'), 10);` (as postgres) → returns leads w/ webhook config, leads now `sending`.
   - record success for one + record failure for another 5× (simulate) → assert: success → `sent`, drip.sent_count=1; failures → backoff rescheduling then `failed` at attempt 5; consecutive_failures climbs; at 5 the drip flips `paused` with breaker reason.
   - `admin_sim_drip_retry_lead` on the failed one → `scheduled`, counters adjusted.
   - `admin_sim_drip_set_status(drip,'resume')` then cancel → remaining leads `canceled`, drip `canceled`.
3. RLS: `set local role anon; select public.sim_worker_claim('x', 1);` must FAIL with permission denied (revoked).

## 3. Edge Function `supabase/functions/sim-drip-deliver/index.ts` (full implementation)

```ts
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
```

Also add to `supabase/config.toml` (the cron call carries no JWT):
```toml
[functions.sim-drip-deliver]
verify_jwt = false
```
Prod deploy note (runbook, do NOT run now): `supabase functions deploy sim-drip-deliver --no-verify-jwt`,
then update vault `sim_function_url` to the prod URL. dry_run stays TRUE until explicitly flipped.

## 4. Frontend libs (mirrors + upload enrichment)

### 4.1 `src/features/leadsim/lib/payload.js`
JS mirror of `buildDeliveryPayload`/`redactedPayload` above (same names, same logic, JSDoc note
"keep in sync with supabase/functions/sim-drip-deliver/index.ts"). Used by the UI payload preview.
Unit tests: JSON vs form encoding; mapping skips empty values; constants merged; `{{secret}}`
substitution; default `Authorization: Bearer` only when no placeholder consumed the secret;
redaction masks the secret in headers.

### 4.2 `src/features/leadsim/lib/schedule.js`
Pure mirror of the planner's per-day math for tests/estimates:
```js
// planDay({count, windowStartMin, windowEndMin, nowMin = null, rng = Math.random})
// -> sorted array of minute-of-day floats, all in [max(windowStartMin, nowMin), windowEndMin)
// jitterTarget(dailyVolume, rng) -> integer in [ceil(0.8*v)..floor(1.2*v)], min 1
```
Tests with a seeded rng (e.g. mulberry32): respects window; honors nowMin; count exact;
non-uniform spacing (not equal gaps); jitter within ±20% and never < 1.

### 4.3 `src/features/leadsim/utils/dripRows.js`
```js
// buildDripRows(parsedCsvRows) -> rows for admin_sim_drip_create:
// [{ email, canonical: {full_name, tel, answer, date, campaign}, raw: {...row} }]
// Canonical extraction reuses mapLeadRowToExportRow from src/services/leadNormalization.js:
//   const exportRow = mapLeadRowToExportRow({ email: row.email, payload_json: row }, {});
//   canonical = { full_name: exportRow["full name"], tel: exportRow.tel, answer: exportRow.answer,
//                 date: exportRow.date, campaign: exportRow.campaign } (drop empties)
```
Test: a row with `full name`/`tel`/`answer` columns produces the canonical block; email preserved.
**SimDripForm delta vs the Plan-2 doc:** `rows: buildDripRows(parsedRows)` instead of `rows: parsedRows`.

## 5. Service + hooks additions (exact signatures)

`src/services/leadSimApi.js` — add (same `p_*`/throw-on-error idiom):
```js
getSimDrip({ dripId })                                  // rpc admin_sim_drip_get        {p_drip_id}
listSimDripLeads({ dripId, status = null, limit = 100, offset = 0 })
                                                        // rpc admin_sim_drip_leads      {p_drip_id,p_status,p_limit,p_offset}
setSimDripStatus({ dripId, action })                    // rpc admin_sim_drip_set_status {p_drip_id,p_action}
updateSimDripPace({ dripId, dailyVolume })              // rpc admin_sim_drip_update_pace{p_drip_id,p_daily_volume}
retrySimDripLead({ leadId })                            // rpc admin_sim_drip_retry_lead {p_lead_id}
runSimPlanner()                                         // rpc admin_sim_run_planner
runSimDelivery()                                        // rpc admin_sim_run_delivery
getSimSettings()                                        // rpc admin_sim_get_settings
setSimDryRun({ dryRun })                                // rpc admin_sim_set_dry_run     {p_dry_run}
```
Vitest for each (mock `../supabase` rpc, mirror existing tests' style).

Hooks (`src/features/leadsim/hooks/`):
```js
useSimDrip(dripId)        // ["sim-drip", dripId], getSimDrip, enabled: !!dripId,
                          // refetchInterval: (q) => q.state.data?.drip?.status === "running" ? 4000 : false
useSimDripLeads(dripId, { status } = {})   // ["sim-drip-leads", dripId, status], refetchInterval same idea (always 4000 ok)
useSimDripControls(dripId) // mutations: start/pause/resume/cancel (setSimDripStatus), setPace, retryLead,
                          // runDelivery (runSimDelivery), runPlanner; ALL invalidate ["sim-drip", dripId],
                          // ["sim-drip-leads", dripId] and ["sim-drips"]
useSimSettings()          // ["sim-settings"], getSimSettings
useSimSetDryRun()         // mutation setSimDryRun, invalidates ["sim-settings"]
```
Note: `useSimDrips` (Plan-2 doc) gains `refetchInterval: 5000`.

## 6. Controls & monitoring UI (agent crafts styling; structure is required)

- **SimDripsTable**: rows clickable (`onOpenDrip(drip)`), cursor pointer, hover row tint.
- **SimDripsPanel**: holds `openDripId` state; when set, renders `SimDripDetail` (with back button)
  instead of the upload form + table. After a successful create, offer "View drip" linking to detail.
- **`SimDripDetail.jsx`** (new):
  - Header: drip name + `SimDripStatusBadge` + client name + created date; back link "← All drips".
  - **Dry-run banner** (uses `useSimSettings`): when dry_run → yellow (`--color-yellow-100/700`) banner
    "🧪 Dry-run mode — deliveries are simulated, nothing is sent to client CRMs" + "Switch to live" button
    (confirm before flipping via `useSimSetDryRun`); when live → slim green note "Live delivery is ON" + switch back.
  - Controls row by status: draft → **Start drip**; running → **Pause** + **Run delivery now**; paused →
    **Resume** (+ show `paused_reason` prominently if set, red tint for breaker); draft/running/paused →
    **Cancel** (confirmation step); pace: inline number input + Save (useSimDripControls.setPace).
  - Stat cards: Queued / Scheduled / Sent / Failed (red when > 0) from `admin_sim_drip_get.counts`.
  - Leads table: email, status badge, "Scheduled for" + "Sent at" formatted in the CLIENT's timezone
    (`toLocaleString("en-GB", { timeZone: client.timezone, ... })`), attempts, response (status code +
    truncated body/error in a `title` tooltip), Retry button on failed rows (useSimDripControls.retryLead).
    Status filter chips: All / queued / scheduled / sent / failed.
  - Auto-refresh comes free from the hooks' refetchInterval.
- **Status badge**: extend `SimDripStatusBadge` STATUS_STYLES with lead statuses —
  queued (grey), scheduled (blue `--color-blue-100/700`), sending (indigo), sent (green),
  failed (red), canceled (silver), skipped_duplicate (silver).
- **Client form payload preview**: in `SimClientForm`, live preview card (uses `lib/payload.js`)
  rendering the exact request for a sample lead (sample canonical: Jane Doe / jane@example.com / +33600000000),
  with headers (secret masked as •••) and JSON or form body per content_type. Helper text: header values
  may use `{{secret}}` to place the stored secret; otherwise it is sent as `Authorization: Bearer <secret>`.

## 7. Integration verification (run by the orchestrator, not agents)

Full-loop local E2E via Preview MCP + a localhost echo server; dry-run AND live modes;
controls exercised in the browser; lint + full vitest; then review workflow.
