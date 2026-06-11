# Lead Sim — Plan 2: Lead-list upload, drip creation & per-client dedup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin upload a CSV lead list for a chosen sim client, preview new-vs-duplicate counts (deduped against that client's existing queued/sent leads), and create a `draft` drip whose queued leads are stored for the Plan 3 engine to deliver. Dedup is per-client and case-insensitive.

**Architecture:** Two new tables (`sim_drips`, `sim_drip_leads`) with admin-only RLS via `public.is_admin()`. A unique index on `sim_drip_leads (client_id, lower(email))` enforces per-client dedup. Three SECURITY DEFINER RPCs (`admin_sim_drip_preview`, `admin_sim_drip_create`, `admin_sim_drips_list`) port the temp-staging-table dedup pattern from `admin_leads_import_confirm` (20260305201500). New service functions in `src/services/leadSimApi.js`, three hooks under `src/features/leadsim/hooks/`, and a UI built as **sub-tabs inside the existing AdminDashboard "Lead Sim" tab** ("Clients" | "Drips") — no React Router, no `/admin/lead-sim` route. CSV parsing/validation reuses `src/features/leads/utils/csv.js` and `src/services/leadNormalization.js` verbatim — no new header/email logic. No DB writes happen on preview; the drip engine, scheduling, and controls are deferred to Plans 3–4.

**Tech Stack:** React 18 + Vite, React Query, styled-components, PapaParse, react-hot-toast, Supabase (Postgres), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-09-lead-sim-drip-tool-design.md`

**Prereqs for local testing:** Docker daemon running, then `npx supabase@2.105.0 start` (plain `npx supabase` is the old v2.6.8 and fails). `.env.local` already targets the local stack. The prod Supabase ref is `padrhwykbrioohogickg` — never target it from tests/dev; the guard in `src/utils/prodGuard.js` (wired into `src/test/setup.js`) fails fast if `VITE_SUPABASE_URL` points at prod. Apply migrations with `npx supabase@2.105.0 db reset`. Run SQL via `docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "..."`. Seeded admin: `admin@fbaged.dev` / `password123` (id `00000000-0000-0000-0000-000000000001`).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `supabase/migrations/20260609090300_sim_drips.sql` | `sim_drips` + `sim_drip_leads` tables, citext extension, unique dedup index, supporting indexes, admin RLS, grants | Create |
| `supabase/migrations/20260609090400_sim_drips_rpcs.sql` | `admin_sim_drip_preview`, `admin_sim_drip_create`, `admin_sim_drips_list` RPCs | Create |
| `src/services/leadSimApi.js` | Add `previewSimDrip`, `createSimDrip`, `listSimDrips` | Modify |
| `src/services/__tests__/leadSimApi.test.js` | Add tests for the three new service functions | Modify |
| `src/features/leadsim/hooks/useSimDripPreview.js` | `useMutation` on `previewSimDrip`, no invalidation | Create |
| `src/features/leadsim/hooks/useSimDripCreate.js` | `useMutation` on `createSimDrip`, invalidate `["sim-drips", clientId]` | Create |
| `src/features/leadsim/hooks/useSimDrips.js` | `useQuery` `["sim-drips", clientId]`, `listSimDrips`, `enabled: !!clientId` | Create |
| `src/features/leadsim/utils/pacing.js` | Pure `estimateBusinessDays(newCount, dailyVolume)` + `formatPacingLine(client)` | Create |
| `src/features/leadsim/utils/__tests__/pacing.test.js` | Tests for pacing helpers | Create |
| `src/features/leadsim/admin/SimClientsPanel.jsx` | The existing client-config body, lifted from `LeadSimLayout`, + `onOpenClient` | Create |
| `src/features/leadsim/admin/SimClientsTable.jsx` | Add `onOpen(client)`; clickable Name cell | Modify |
| `src/features/leadsim/admin/SimDripsPanel.jsx` | Drips sub-tab container: client `Select` + pacing line + `SimDripForm` + `SimDripsTable` | Create |
| `src/features/leadsim/admin/SimCsvDropzone.jsx` | Presentational drag-drop CSV zone | Create |
| `src/features/leadsim/admin/SimDripForm.jsx` | Parse + preview + create flow for one client | Create |
| `src/features/leadsim/admin/SimDripPreviewCard.jsx` | 5 count chips, duplicate samples, name input, volume stepper, pacing estimate, Create button, success box | Create |
| `src/features/leadsim/admin/SimDripStatusBadge.jsx` | Status → token color pill (Plan-4-reusable) | Create |
| `src/features/leadsim/admin/SimDripProgressBar.jsx` | `sent/total` bar with failed count (Plan-4-reusable) | Create |
| `src/features/leadsim/admin/SimDripsTable.jsx` | Per-client drips table (mirrors `AdminLeadImportsTable` styling) | Create |
| `src/features/leadsim/admin/LeadSimLayout.jsx` | Becomes the sub-tab shell ("Clients" \| "Drips") + cross-link state | Modify |

---

## Task 1: Migration — `sim_drips` & `sim_drip_leads` tables

**Files:**
- Create: `supabase/migrations/20260609090300_sim_drips.sql`

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260609090300_sim_drips.sql`:
```sql
-- Lead-sim drips: one uploaded list per client + its queued leads.
-- Per-client, case-insensitive dedup via citext + unique (client_id, lower(email)).

create extension if not exists citext;

create table if not exists public.sim_drips (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sim_clients(id) on delete cascade,
  name text not null,
  source_filename text,
  status text not null default 'draft'
    check (status in ('draft', 'running', 'paused', 'completed', 'canceled')),
  paused_reason text,
  daily_volume integer not null default 25
    check (daily_volume > 0),
  total_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  consecutive_failures integer not null default 0,
  started_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists idx_sim_drips_client_created
  on public.sim_drips (client_id, created_at desc);
create index if not exists idx_sim_drips_status
  on public.sim_drips (status);

create table if not exists public.sim_drip_leads (
  id uuid primary key default gen_random_uuid(),
  drip_id uuid not null references public.sim_drips(id) on delete cascade,
  client_id uuid not null references public.sim_clients(id) on delete cascade,
  email citext not null,
  payload_json jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'queued'
    check (status in ('queued', 'scheduled', 'sending', 'sent', 'failed', 'canceled', 'skipped_duplicate')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  response_status integer,
  response_body text,
  error text,
  created_at timestamptz not null default now()
);

-- Per-client dedup: case-insensitive uniqueness across all of a client's leads.
-- skipped_duplicate rows are NOT inserted (they collide), so this index only
-- ever holds the surviving deliverable rows for a client.
create unique index if not exists ux_sim_drip_leads_client_email
  on public.sim_drip_leads (client_id, lower(email));

create index if not exists idx_sim_drip_leads_drip
  on public.sim_drip_leads (drip_id);
create index if not exists idx_sim_drip_leads_status
  on public.sim_drip_leads (status);
create index if not exists idx_sim_drip_leads_scheduled
  on public.sim_drip_leads (scheduled_at) where status in ('queued', 'scheduled');

alter table public.sim_drips enable row level security;
alter table public.sim_drip_leads enable row level security;

create policy sim_drips_admin_all
  on public.sim_drips
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy sim_drip_leads_admin_all
  on public.sim_drip_leads
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.sim_drips to authenticated;
grant select, insert, update, delete on public.sim_drip_leads to authenticated;
```

- [ ] **Step 2: Apply and verify the schema**

Run: `npx supabase@2.105.0 db reset`
Then verify the tables, the dedup index, and the citext column type exist:
```bash
docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "select table_name from information_schema.tables where table_schema='public' and table_name in ('sim_drips','sim_drip_leads') order by 1;"
docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "select indexname from pg_indexes where tablename='sim_drip_leads' and indexname='ux_sim_drip_leads_client_email';"
docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "select data_type from information_schema.columns where table_name='sim_drip_leads' and column_name='email';"
```
Expected: `sim_drip_leads` then `sim_drips`; `ux_sim_drip_leads_client_email`; `citext`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260609090300_sim_drips.sql
git commit -m "feat(leadsim): add sim_drips and sim_drip_leads tables with per-client dedup"
```

---

## Task 2: Migration — preview / create / list RPCs

**Files:**
- Create: `supabase/migrations/20260609090400_sim_drips_rpcs.sql`

- [ ] **Step 1: Write the RPC migration**

`supabase/migrations/20260609090400_sim_drips_rpcs.sql`:
```sql
-- Preview: count new vs duplicate (against THIS client's existing leads). No writes.
create or replace function public.admin_sim_drip_preview(
  p_client_id uuid,
  p_emails text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_count integer := 0;
  duplicate_count integer := 0;
  duplicate_samples jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if not exists (
    select 1 from public.sim_clients c
    where c.id = p_client_id and not c.is_archived
  ) then
    raise exception 'Sim client not found';
  end if;

  with normalized as (
    select lower(trim(email_input)) as email
    from unnest(coalesce(p_emails, '{}'::text[])) email_input
  ),
  candidates as (
    select distinct n.email
    from normalized n
    where n.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  duplicates as (
    select c.email
    from candidates c
    where exists (
      select 1 from public.sim_drip_leads l
      where l.client_id = p_client_id
        and lower(l.email) = c.email
    )
  )
  select
    (select count(*) from candidates),
    (select count(*) from duplicates),
    coalesce((
      select jsonb_agg(d.email)
      from (
        select email from duplicates order by email limit 20
      ) d
    ), '[]'::jsonb)
  into candidate_count, duplicate_count, duplicate_samples;

  return jsonb_build_object(
    'candidate_count', candidate_count,
    'duplicate_count', duplicate_count,
    'new_count', greatest(candidate_count - duplicate_count, 0),
    'duplicate_samples', duplicate_samples
  );
end;
$$;

grant execute on function public.admin_sim_drip_preview(uuid, text[]) to authenticated;

-- Create: insert a draft drip + queued leads; collisions become skipped_duplicate.
-- Mirrors the staging-table dedup of admin_leads_import_confirm but scoped to one client.
create or replace function public.admin_sim_drip_create(
  p_client_id uuid,
  p_name text,
  p_source_filename text,
  p_daily_volume integer,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drip_id uuid;
  v_total_rows integer := 0;
  v_valid_rows integer := 0;
  v_queued_rows integer := 0;
  v_duplicate_rows integer := 0;
  v_invalid_rows integer := 0;
  v_duplicate_samples jsonb := '[]'::jsonb;
  v_daily_volume integer;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if not exists (
    select 1 from public.sim_clients c
    where c.id = p_client_id and not c.is_archived
  ) then
    raise exception 'Sim client not found';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Invalid rows payload';
  end if;

  v_daily_volume := greatest(coalesce(p_daily_volume, 25), 1);

  create temporary table _sim_drip_stage (
    row_number integer not null,
    row_json jsonb not null,
    email_raw text,
    email_normalized text,
    is_valid boolean not null default false,
    is_duplicate_in_file boolean not null default false,
    is_duplicate_existing boolean not null default false
  ) on commit drop;

  insert into _sim_drip_stage (row_number, row_json, email_raw, email_normalized, is_valid)
  select
    entry.ordinality::integer,
    entry.row_json,
    entry.row_json->>'email' as email_raw,
    lower(trim(coalesce(entry.row_json->>'email', ''))) as email_normalized,
    (
      lower(trim(coalesce(entry.row_json->>'email', ''))) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ) as is_valid
  from jsonb_array_elements(p_rows) with ordinality as entry(row_json, ordinality);

  update _sim_drip_stage s
  set is_duplicate_in_file = true
  where s.is_valid
    and exists (
      select 1
      from _sim_drip_stage first_row
      where first_row.email_normalized = s.email_normalized
        and first_row.is_valid
        and first_row.row_number < s.row_number
    );

  update _sim_drip_stage s
  set is_duplicate_existing = true
  where s.is_valid
    and not s.is_duplicate_in_file
    and exists (
      select 1
      from public.sim_drip_leads l
      where l.client_id = p_client_id
        and lower(l.email) = s.email_normalized
    );

  select count(*) into v_total_rows from _sim_drip_stage;
  select count(*) into v_valid_rows from _sim_drip_stage where is_valid;
  select count(*) into v_invalid_rows from _sim_drip_stage where not is_valid;
  select count(*) into v_duplicate_rows
  from _sim_drip_stage
  where is_duplicate_in_file or is_duplicate_existing;

  insert into public.sim_drips (
    client_id, name, source_filename, status, daily_volume, total_count, created_by
  )
  values (
    p_client_id, p_name, p_source_filename, 'draft', v_daily_volume, 0, auth.uid()
  )
  returning id into v_drip_id;

  -- Surviving (new) leads -> queued.
  insert into public.sim_drip_leads (
    drip_id, client_id, email, payload_json, status
  )
  select
    v_drip_id,
    p_client_id,
    s.email_normalized,
    coalesce(s.row_json - 'email', '{}'::jsonb),
    'queued'
  from _sim_drip_stage s
  where s.is_valid
    and not s.is_duplicate_in_file
    and not s.is_duplicate_existing
  on conflict (client_id, lower(email)) do nothing;

  get diagnostics v_queued_rows = row_count;

  -- Collisions against existing client leads -> recorded as skipped_duplicate,
  -- linked to this drip but never deliverable. They do not hit the unique
  -- index because skipped_duplicate rows are excluded from the candidate set;
  -- to keep a record we attach them to this drip with a NULL-safe email tag.
  insert into public.sim_drip_leads (
    drip_id, client_id, email, payload_json, status
  )
  select
    v_drip_id,
    p_client_id,
    s.email_normalized,
    jsonb_build_object(
      'skipped_reason',
      case when s.is_duplicate_in_file then 'duplicate_in_file' else 'duplicate_existing' end,
      'payload_json', coalesce(s.row_json - 'email', '{}'::jsonb)
    ),
    'skipped_duplicate'
  from _sim_drip_stage s
  where (s.is_duplicate_in_file or s.is_duplicate_existing)
    and s.is_valid;

  update public.sim_drips
  set total_count = v_queued_rows
  where id = v_drip_id;

  select coalesce(jsonb_agg(sample.email_normalized), '[]'::jsonb)
  into v_duplicate_samples
  from (
    select distinct s.email_normalized
    from _sim_drip_stage s
    where s.is_duplicate_in_file or s.is_duplicate_existing
    order by s.email_normalized
    limit 20
  ) sample;

  return jsonb_build_object(
    'drip_id', v_drip_id,
    'total_rows', v_total_rows,
    'valid_rows', v_valid_rows,
    'queued_count', v_queued_rows,
    'duplicate_rows', v_duplicate_rows,
    'invalid_rows', v_invalid_rows,
    'duplicate_samples', v_duplicate_samples
  );
end;
$$;

grant execute on function public.admin_sim_drip_create(uuid, text, text, integer, jsonb) to authenticated;

-- List drips, optionally scoped to one client, newest first.
create or replace function public.admin_sim_drips_list(p_client_id uuid default null)
returns setof public.sim_drips
language sql
security definer
set search_path = public
as $$
  select * from public.sim_drips
  where public.is_admin()
    and (p_client_id is null or client_id = p_client_id)
  order by created_at desc;
$$;

grant execute on function public.admin_sim_drips_list(uuid) to authenticated;
```

> **Note on the skipped_duplicate insert:** `skipped_duplicate` rows store the normalized email in `email` but are never counted toward `total_count` and never appear in the deliverable queue. Because the unique index is `(client_id, lower(email))`, two skipped rows with the same email within one drip would collide; this is acceptable since the surviving (queued) row already owns that key for the client and the skipped rows exist only for audit. If a collision is hit on the skipped insert it will raise — see Task 2 Step 2 which asserts a clean run. To avoid that raise in pathological inputs the `is_duplicate_in_file` flag already keeps only one staged row per email as `duplicate_in_file`; `duplicate_existing` rows are distinct-by-construction against existing leads but can still repeat the same email across multiple new rows. Guard the skipped insert with `on conflict (client_id, lower(email)) do nothing` to make it idempotent.

- [ ] **Step 2: Add `on conflict` to the skipped-duplicate insert**

Edit the `skipped_duplicate` insert in `supabase/migrations/20260609090400_sim_drips_rpcs.sql` to append the conflict clause so repeated skipped emails never raise. Change:
```sql
    'skipped_duplicate'
  from _sim_drip_stage s
  where (s.is_duplicate_in_file or s.is_duplicate_existing)
    and s.is_valid;
```
to:
```sql
    'skipped_duplicate'
  from _sim_drip_stage s
  where (s.is_duplicate_in_file or s.is_duplicate_existing)
    and s.is_valid
  on conflict (client_id, lower(email)) do nothing;
```

- [ ] **Step 3: Apply and smoke-test the RPCs against the local stack**

Run: `npx supabase@2.105.0 db reset`
Then create a client, run preview + create twice (the second upload must show the same email as a duplicate), and confirm counts:
```bash
docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into public.sim_clients (created_by, name, webhook_url)
  values ('00000000-0000-0000-0000-000000000001','Smoke','https://hook.test')
  returning id;" 2>/dev/null || echo "use the value below"

CID=$(docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "select id from public.sim_clients where name='Smoke' order by created_at desc limit 1;")
echo "client=$CID"

docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.admin_sim_drip_preview('$CID', array['a@x.com','b@x.com','a@x.com','bad']);"

docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.admin_sim_drip_create('$CID','list-1','list-1.csv',25,
  '[{\"email\":\"a@x.com\"},{\"email\":\"b@x.com\"},{\"email\":\"a@x.com\"},{\"email\":\"bad\"}]'::jsonb);"

docker exec supabase_db_local-dev-setup psql -U postgres -d postgres -tAc "
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.admin_sim_drip_create('$CID','list-2','list-2.csv',10,
  '[{\"email\":\"a@x.com\"},{\"email\":\"c@x.com\"}]'::jsonb);"
```
Expected: preview returns `candidate_count=2, duplicate_count=0, new_count=2`. First create returns `queued_count=2, duplicate_rows=1 (in-file a), invalid_rows=1 (bad)`. Second create returns `queued_count=1, duplicate_rows=1` (a@x.com now collides with the existing client lead; c@x.com is new). No SQL errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609090400_sim_drips_rpcs.sql
git commit -m "feat(leadsim): add sim drip preview/create/list RPCs"
```

---

## Task 3: Service functions + tests

**Files:**
- Modify: `src/services/leadSimApi.js`
- Modify: `src/services/__tests__/leadSimApi.test.js`

- [ ] **Step 1: Write the failing service tests**

Append to `src/services/__tests__/leadSimApi.test.js` (add the three functions to the existing import line first):

Change the import line:
```js
import { listSimClients, upsertSimClient, archiveSimClient } from "../leadSimApi";
```
to:
```js
import {
  listSimClients,
  upsertSimClient,
  archiveSimClient,
  previewSimDrip,
  createSimDrip,
  listSimDrips,
} from "../leadSimApi";
```

Then add these cases inside the existing `describe("leadSimApi", ...)` block, before its closing `});`:
```js
  it("previewSimDrip maps args to RPC params", async () => {
    rpc.mockResolvedValue({
      data: { candidate_count: 2, duplicate_count: 1, new_count: 1, duplicate_samples: [] },
      error: null,
    });
    const out = await previewSimDrip({ clientId: "c1", emails: ["a@x.com", "b@x.com"] });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_preview", {
      p_client_id: "c1",
      p_emails: ["a@x.com", "b@x.com"],
    });
    expect(out.new_count).toBe(1);
  });

  it("createSimDrip maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { drip_id: "d1", queued_count: 5 }, error: null });
    const out = await createSimDrip({
      clientId: "c1",
      name: "march",
      sourceFilename: "march.csv",
      dailyVolume: 30,
      rows: [{ email: "a@x.com" }],
    });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drip_create", {
      p_client_id: "c1",
      p_name: "march",
      p_source_filename: "march.csv",
      p_daily_volume: 30,
      p_rows: [{ email: "a@x.com" }],
    });
    expect(out.drip_id).toBe("d1");
  });

  it("listSimDrips passes client id and returns rows", async () => {
    rpc.mockResolvedValue({ data: [{ id: "d1", name: "march" }], error: null });
    const rows = await listSimDrips({ clientId: "c1" });
    expect(rpc).toHaveBeenCalledWith("admin_sim_drips_list", { p_client_id: "c1" });
    expect(rows).toEqual([{ id: "d1", name: "march" }]);
  });

  it("listSimDrips defaults client id to null", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await listSimDrips();
    expect(rpc).toHaveBeenCalledWith("admin_sim_drips_list", { p_client_id: null });
  });

  it("createSimDrip throws on rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(
      createSimDrip({ clientId: "c1", name: "x", sourceFilename: "x.csv", dailyVolume: 1, rows: [] })
    ).rejects.toThrow("nope");
  });
```

Run: `npx vitest run src/services/__tests__/leadSimApi.test.js`
Expected: the new cases FAIL (functions not exported yet).

- [ ] **Step 2: Implement the service functions**

Append to `src/services/leadSimApi.js` (after `archiveSimClient`):
```js
export async function previewSimDrip({ clientId, emails }) {
  const { data, error } = await supabase.rpc("admin_sim_drip_preview", {
    p_client_id: clientId,
    p_emails: emails,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createSimDrip({
  clientId,
  name,
  sourceFilename,
  dailyVolume,
  rows,
}) {
  const { data, error } = await supabase.rpc("admin_sim_drip_create", {
    p_client_id: clientId,
    p_name: name,
    p_source_filename: sourceFilename,
    p_daily_volume: dailyVolume,
    p_rows: rows,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function listSimDrips({ clientId = null } = {}) {
  const { data, error } = await supabase.rpc("admin_sim_drips_list", {
    p_client_id: clientId,
  });
  if (error) throw new Error(error.message);
  return data || [];
}
```

- [ ] **Step 3: Re-run the service tests**

Run: `npx vitest run src/services/__tests__/leadSimApi.test.js`
Expected: all cases pass.

- [ ] **Step 4: Commit**

```bash
git add src/services/leadSimApi.js src/services/__tests__/leadSimApi.test.js
git commit -m "feat(leadsim): add previewSimDrip/createSimDrip/listSimDrips service fns"
```

---

## Task 4: Pacing util + tests

**Files:**
- Create: `src/features/leadsim/utils/pacing.js`
- Test: `src/features/leadsim/utils/__tests__/pacing.test.js`

- [ ] **Step 1: Write the failing test**

`src/features/leadsim/utils/__tests__/pacing.test.js`:
```js
import { describe, it, expect } from "vitest";
import { estimateBusinessDays, formatPacingLine } from "../pacing";

describe("estimateBusinessDays", () => {
  it("returns ceil(new/volume)", () => {
    expect(estimateBusinessDays(50, 25)).toBe(2);
    expect(estimateBusinessDays(51, 25)).toBe(3);
    expect(estimateBusinessDays(0, 25)).toBe(0);
  });

  it("treats non-positive volume as 1/day", () => {
    expect(estimateBusinessDays(10, 0)).toBe(10);
    expect(estimateBusinessDays(10, -5)).toBe(10);
  });
});

describe("formatPacingLine", () => {
  it("composes the client cadence line", () => {
    const line = formatPacingLine({
      send_window_start: "08:00:00",
      send_window_end: "21:00:00",
      timezone: "Europe/Paris",
      skip_weekends: true,
      default_daily_volume: 25,
    });
    expect(line).toBe(
      "Send window 08:00–21:00 Europe/Paris · skips weekends · default 25/day"
    );
  });

  it("omits the weekend clause when skip_weekends is false", () => {
    const line = formatPacingLine({
      send_window_start: "08:00",
      send_window_end: "21:00",
      timezone: "Europe/Paris",
      skip_weekends: false,
      default_daily_volume: 40,
    });
    expect(line).toBe("Send window 08:00–21:00 Europe/Paris · default 40/day");
  });

  it("returns empty string for missing client", () => {
    expect(formatPacingLine(null)).toBe("");
  });
});
```

Run: `npx vitest run src/features/leadsim/utils/__tests__/pacing.test.js`
Expected: FAIL (module does not exist).

- [ ] **Step 2: Implement the util**

`src/features/leadsim/utils/pacing.js`:
```js
export function estimateBusinessDays(newCount, dailyVolume) {
  const count = Math.max(0, Number(newCount) || 0);
  if (count === 0) return 0;
  const perDay = Math.max(1, Number(dailyVolume) || 0);
  return Math.ceil(count / perDay);
}

function trimSeconds(time) {
  // "08:00:00" -> "08:00"; "08:00" stays "08:00".
  return String(time || "").slice(0, 5);
}

export function formatPacingLine(client) {
  if (!client) return "";
  const start = trimSeconds(client.send_window_start);
  const end = trimSeconds(client.send_window_end);
  const tz = client.timezone || "Europe/Paris";
  const volume = client.default_daily_volume ?? 25;
  const parts = [`Send window ${start}–${end} ${tz}`];
  if (client.skip_weekends) parts.push("skips weekends");
  parts.push(`default ${volume}/day`);
  return parts.join(" · ");
}
```

- [ ] **Step 3: Re-run the test**

Run: `npx vitest run src/features/leadsim/utils/__tests__/pacing.test.js`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/leadsim/utils/pacing.js src/features/leadsim/utils/__tests__/pacing.test.js
git commit -m "feat(leadsim): add pacing estimate + pacing line helpers"
```

---

## Task 5: Hooks — preview, create, list

**Files:**
- Create: `src/features/leadsim/hooks/useSimDripPreview.js`
- Create: `src/features/leadsim/hooks/useSimDripCreate.js`
- Create: `src/features/leadsim/hooks/useSimDrips.js`

- [ ] **Step 1: Preview hook (no invalidation)**

`src/features/leadsim/hooks/useSimDripPreview.js`:
```js
import { useMutation } from "@tanstack/react-query";
import { previewSimDrip } from "../../../services/leadSimApi";

export function useSimDripPreview() {
  const { mutateAsync: previewDrip, isPending: isPreviewing, error } =
    useMutation({
      mutationFn: previewSimDrip,
    });

  return { previewDrip, isPreviewing, error };
}
```

- [ ] **Step 2: Create hook (invalidate the client's drips)**

`src/features/leadsim/hooks/useSimDripCreate.js`:
```js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSimDrip } from "../../../services/leadSimApi";

export function useSimDripCreate(clientId) {
  const queryClient = useQueryClient();

  const { mutateAsync: createDrip, isPending: isCreating, error } =
    useMutation({
      mutationFn: createSimDrip,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sim-drips", clientId] });
      },
    });

  return { createDrip, isCreating, error };
}
```

- [ ] **Step 3: List hook**

`src/features/leadsim/hooks/useSimDrips.js`:
```js
import { useQuery } from "@tanstack/react-query";
import { listSimDrips } from "../../../services/leadSimApi";

export function useSimDrips(clientId) {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-drips", clientId],
    queryFn: () => listSimDrips({ clientId }),
    enabled: !!clientId,
  });

  return { drips: data || [], isPending, error };
}
```

- [ ] **Step 4: Verify hooks import cleanly**

Run: `npm run lint`
Expected: no errors for the three new hook files.

- [ ] **Step 5: Commit**

```bash
git add src/features/leadsim/hooks/useSimDripPreview.js src/features/leadsim/hooks/useSimDripCreate.js src/features/leadsim/hooks/useSimDrips.js
git commit -m "feat(leadsim): add useSimDripPreview/useSimDripCreate/useSimDrips hooks"
```

---

## Task 6: Presentational pieces — status badge, progress bar, CSV dropzone

**Files:**
- Create: `src/features/leadsim/admin/SimDripStatusBadge.jsx`
- Create: `src/features/leadsim/admin/SimDripProgressBar.jsx`
- Create: `src/features/leadsim/admin/SimCsvDropzone.jsx`

- [ ] **Step 1: Status badge**

`src/features/leadsim/admin/SimDripStatusBadge.jsx`:
```jsx
import styled from "styled-components";

const STATUS_STYLES = {
  draft: { bg: "var(--color-grey-200)", fg: "var(--color-grey-700)", label: "Draft" },
  running: { bg: "var(--color-brand-600)", fg: "var(--color-grey-0)", label: "Running" },
  paused: { bg: "var(--color-red-100)", fg: "var(--color-red-700)", label: "Paused" },
  completed: { bg: "var(--color-green-100)", fg: "var(--color-green-700)", label: "Completed" },
  canceled: { bg: "var(--color-grey-200)", fg: "var(--color-grey-500)", label: "Canceled" },
};

const Pill = styled.span`
  display: inline-block;
  padding: 0.3rem 0.9rem;
  border-radius: 100px;
  font-size: 1.1rem;
  font-weight: 600;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$fg};
`;

export default function SimDripStatusBadge({ status, pausedReason }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <Pill $bg={style.bg} $fg={style.fg} title={pausedReason || undefined}>
      {style.label}
    </Pill>
  );
}
```

- [ ] **Step 2: Progress bar**

`src/features/leadsim/admin/SimDripProgressBar.jsx`:
```jsx
import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 12rem;
`;

const Track = styled.div`
  height: 0.8rem;
  border-radius: 100px;
  background: var(--color-grey-200);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(props) => props.$pct}%;
  background: var(--color-brand-600);
`;

const Label = styled.span`
  font-size: 1.1rem;
  color: var(--color-grey-600);
`;

const Failed = styled.span`
  font-size: 1.1rem;
  color: var(--color-red-700);
`;

export default function SimDripProgressBar({ sent = 0, total = 0, failed = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
  return (
    <Wrap>
      <Track>
        <Fill $pct={pct} />
      </Track>
      <Label>
        {sent}/{total} sent
        {failed > 0 ? <Failed> · {failed} failed</Failed> : null}
      </Label>
    </Wrap>
  );
}
```

- [ ] **Step 3: CSV dropzone**

`src/features/leadsim/admin/SimCsvDropzone.jsx`:
```jsx
import { useRef, useState } from "react";
import styled from "styled-components";

const Zone = styled.div`
  border: 2px dashed
    ${(props) => (props.$active ? "var(--color-brand-600)" : "var(--color-grey-300)")};
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
  text-align: center;
  cursor: pointer;
  background: ${(props) => (props.$active ? "var(--color-grey-50)" : "transparent")};
  transition: border-color 0.15s, background 0.15s;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-grey-500);
`;

const FileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

const Chip = styled.span`
  padding: 0.3rem 0.9rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-grey-100);
`;

const ReplaceLink = styled.button`
  background: none;
  border: none;
  color: var(--color-brand-600);
  cursor: pointer;
  font-size: 1.2rem;
  text-decoration: underline;
`;

const HiddenInput = styled.input`
  display: none;
`;

export default function SimCsvDropzone({ file, onFile }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <Zone
      $active={active}
      onClick={file ? undefined : openPicker}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    >
      <HiddenInput
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      {file ? (
        <FileRow>
          <Chip>{file.name}</Chip>
          <ReplaceLink
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            Replace file
          </ReplaceLink>
        </FileRow>
      ) : (
        <Hint>Drop a CSV or click to browse · Required column: email</Hint>
      )}
    </Zone>
  );
}
```

- [ ] **Step 4: Verify lint**

Run: `npm run lint`
Expected: no errors for the three new component files.

- [ ] **Step 5: Commit**

```bash
git add src/features/leadsim/admin/SimDripStatusBadge.jsx src/features/leadsim/admin/SimDripProgressBar.jsx src/features/leadsim/admin/SimCsvDropzone.jsx
git commit -m "feat(leadsim): add status badge, progress bar, CSV dropzone components"
```

---

## Task 7: Preview card

**Files:**
- Create: `src/features/leadsim/admin/SimDripPreviewCard.jsx`

- [ ] **Step 1: Write the preview card**

`src/features/leadsim/admin/SimDripPreviewCard.jsx`:
```jsx
import styled from "styled-components";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import SpinnerMini from "../../../ui/SpinnerMini";
import { estimateBusinessDays } from "../utils/pacing";

const Card = styled.div`
  margin-top: 2rem;
  padding: 1.6rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-50);
`;

const Title = styled.h4`
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: var(--color-brand-700);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.2rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Chip = styled.div`
  background: ${(props) => props.$bg || "var(--color-grey-0)"};
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  padding: 0.8rem 1rem;
  font-size: 1.2rem;
  color: ${(props) => props.$fg || "var(--color-grey-700)"};
`;

const ChipValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
`;

const SampleList = styled.ul`
  margin: 0.8rem 0 1.2rem;
  padding-left: 2rem;
  font-size: 1.2rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
  max-width: 32rem;

  label {
    font-size: 1.3rem;
    color: var(--color-grey-600);
  }
`;

const Helper = styled.p`
  margin: 0.4rem 0 0;
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const ResultBox = styled.div`
  margin-top: 1.2rem;
  padding: 1rem 1.2rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-green-100);
  color: var(--color-green-700);
  font-size: 1.3rem;
`;

export default function SimDripPreviewCard({
  preview,
  dripName,
  onNameChange,
  dailyVolume,
  onVolumeChange,
  onConfirm,
  isCreating,
  createResult,
}) {
  if (!preview) return null;

  const total = preview.summary.totalRows;
  const valid = preview.summary.validRows;
  const duplicate = preview.summary.duplicateRows;
  const invalid = preview.summary.invalidRows;
  const newCount = preview.summary.newCount;
  const samples = preview.duplicateSamples || [];
  const days = estimateBusinessDays(newCount, dailyVolume);

  return (
    <Card>
      <Title>Drip Preview</Title>
      <StatsGrid>
        <Chip>
          Total
          <ChipValue>{total}</ChipValue>
        </Chip>
        <Chip>
          Valid
          <ChipValue>{valid}</ChipValue>
        </Chip>
        <Chip $bg="var(--color-green-100)" $fg="var(--color-green-700)">
          New (will queue)
          <ChipValue>{newCount}</ChipValue>
        </Chip>
        <Chip $bg="var(--color-grey-100)" $fg="var(--color-grey-600)">
          Duplicate (skipped)
          <ChipValue>{duplicate}</ChipValue>
        </Chip>
        <Chip $bg="var(--color-red-100)" $fg="var(--color-red-700)">
          Invalid (skipped)
          <ChipValue>{invalid}</ChipValue>
        </Chip>
      </StatsGrid>

      {samples.length > 0 ? (
        <>
          <strong>Duplicate email samples (this client)</strong>
          <SampleList>
            {samples.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </SampleList>
        </>
      ) : null}

      <Field>
        <label htmlFor="drip-name">Drip name</label>
        <Input
          id="drip-name"
          value={dripName}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </Field>

      <Field>
        <label htmlFor="drip-volume">Daily volume</label>
        <Input
          id="drip-volume"
          type="number"
          min={1}
          value={dailyVolume}
          onChange={(e) => onVolumeChange(Math.max(1, Number(e.target.value) || 1))}
        />
        <Helper>
          About {days} business {days === 1 ? "day" : "days"} to deliver {newCount} new
          leads at this pace.
        </Helper>
      </Field>

      <Button onClick={onConfirm} disabled={isCreating || newCount === 0}>
        {isCreating ? (
          <>
            <SpinnerMini /> Creating…
          </>
        ) : (
          "Create drip"
        )}
      </Button>

      {createResult ? (
        <ResultBox>
          Drip created: {createResult.queued_count} new leads queued, skipped{" "}
          {createResult.duplicate_rows} duplicates and {createResult.invalid_rows} invalid
          rows. Queued — delivery starts on the next cycle.
        </ResultBox>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors for the preview card.

- [ ] **Step 3: Commit**

```bash
git add src/features/leadsim/admin/SimDripPreviewCard.jsx
git commit -m "feat(leadsim): add drip preview card with count chips and pacing estimate"
```

---

## Task 8: Drip create form

**Files:**
- Create: `src/features/leadsim/admin/SimDripForm.jsx`

- [ ] **Step 1: Write the form**

`src/features/leadsim/admin/SimDripForm.jsx`:
```jsx
import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Papa from "papaparse";

import {
  buildPreviewRows,
  hasEmailColumn,
  normalizeCsvHeader,
} from "../../leads/utils/csv";
import { useSimDripPreview } from "../hooks/useSimDripPreview";
import { useSimDripCreate } from "../hooks/useSimDripCreate";
import Button from "../../../ui/Button";
import SpinnerMini from "../../../ui/SpinnerMini";
import SimCsvDropzone from "./SimCsvDropzone";
import SimDripPreviewCard from "./SimDripPreviewCard";

const Form = styled.div`
  display: grid;
  gap: 1.6rem;
`;

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeader,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });
}

function defaultDripName(filename) {
  return String(filename || "").replace(/\.csv$/i, "") || "drip";
}

export default function SimDripForm({ client }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [dripName, setDripName] = useState("");
  const [dailyVolume, setDailyVolume] = useState(client.default_daily_volume || 25);

  const { previewDrip, isPreviewing } = useSimDripPreview();
  const { createDrip, isCreating } = useSimDripCreate(client.id);

  function handleFile(next) {
    setFile(next);
    setParsedRows([]);
    setPreview(null);
    setCreateResult(null);
    if (next) setDripName(defaultDripName(next.name));
  }

  async function handlePreview() {
    if (!file) {
      toast.error("Drop a CSV file first");
      return;
    }

    const parsed = await parseCsv(file);
    if (!Array.isArray(parsed.data)) {
      toast.error("Could not parse CSV file");
      return;
    }

    if (!hasEmailColumn(parsed.meta?.fields)) {
      toast.error("CSV must include an email column");
      return;
    }

    const local = buildPreviewRows(parsed.data);

    try {
      const remote = await previewDrip({
        clientId: client.id,
        emails: local.candidateEmails,
      });

      const validRows =
        local.summary.totalRows -
        local.summary.invalidRows -
        local.summary.inFileDuplicateRows;
      const duplicateRows =
        local.summary.inFileDuplicateRows + (remote?.duplicate_count || 0);

      setParsedRows(parsed.data);
      setCreateResult(null);
      setPreview({
        summary: {
          totalRows: local.summary.totalRows,
          validRows,
          duplicateRows,
          invalidRows: local.summary.invalidRows,
          newCount: Math.max(validRows - duplicateRows, 0),
        },
        duplicateSamples: remote?.duplicate_samples || [],
      });
    } catch (error) {
      toast.error(error.message || "Could not preview drip");
    }
  }

  async function handleCreate() {
    if (!preview || parsedRows.length === 0) return;

    try {
      const result = await createDrip({
        clientId: client.id,
        name: dripName || defaultDripName(file?.name),
        sourceFilename: file?.name || "leads.csv",
        dailyVolume,
        rows: parsedRows,
      });
      setCreateResult(result);
      toast.success("Drip created");
      setFile(null);
      setParsedRows([]);
      setPreview(null);
    } catch (error) {
      toast.error(error.message || "Could not create drip");
    }
  }

  return (
    <Form>
      <SimCsvDropzone file={file} onFile={handleFile} />

      <div>
        <Button type="button" onClick={handlePreview} disabled={!file || isPreviewing}>
          {isPreviewing ? (
            <>
              <SpinnerMini /> Previewing…
            </>
          ) : (
            "Preview"
          )}
        </Button>
      </div>

      <SimDripPreviewCard
        preview={preview}
        dripName={dripName}
        onNameChange={setDripName}
        dailyVolume={dailyVolume}
        onVolumeChange={setDailyVolume}
        onConfirm={handleCreate}
        isCreating={isCreating}
        createResult={createResult}
      />
    </Form>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors for the form.

- [ ] **Step 3: Commit**

```bash
git add src/features/leadsim/admin/SimDripForm.jsx
git commit -m "feat(leadsim): add drip create form (parse, preview, confirm)"
```

---

## Task 9: Drips table

**Files:**
- Create: `src/features/leadsim/admin/SimDripsTable.jsx`

- [ ] **Step 1: Write the table**

`src/features/leadsim/admin/SimDripsTable.jsx`:
```jsx
import styled from "styled-components";
import Spinner from "../../../ui/Spinner";
import { useSimDrips } from "../hooks/useSimDrips";
import SimDripStatusBadge from "./SimDripStatusBadge";
import SimDripProgressBar from "./SimDripProgressBar";

const Notice = styled.p`
  margin-top: 1.2rem;
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

const Wrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-0);
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const HeadCell = styled.th`
  text-align: left;
  padding: 1rem;
  font-size: 1.2rem;
  color: var(--color-grey-600);
  border-bottom: 1px solid var(--color-grey-200);
  background: var(--color-grey-50);
`;

const Tr = styled.tr`
  border-bottom: 1px solid var(--color-grey-200);
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

export default function SimDripsTable({ clientId }) {
  const { drips, isPending } = useSimDrips(clientId);

  if (!clientId) {
    return <Notice>Select a sim client to view its drips.</Notice>;
  }

  if (isPending) {
    return <Spinner />;
  }

  if (!drips.length) {
    return (
      <Notice>No drips yet for this client — upload a list above to create one.</Notice>
    );
  }

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <HeadCell>Name</HeadCell>
            <HeadCell>File</HeadCell>
            <HeadCell>Created</HeadCell>
            <HeadCell>Status</HeadCell>
            <HeadCell>Progress</HeadCell>
            <HeadCell>Daily volume</HeadCell>
            <HeadCell>Failed</HeadCell>
          </tr>
        </thead>
        <tbody>
          {drips.map((drip) => (
            <Tr key={drip.id}>
              <Td>{drip.name}</Td>
              <Td>{drip.source_filename}</Td>
              <Td>{new Date(drip.created_at).toLocaleDateString()}</Td>
              <Td>
                <SimDripStatusBadge
                  status={drip.status}
                  pausedReason={drip.paused_reason}
                />
              </Td>
              <Td>
                <SimDripProgressBar
                  sent={drip.sent_count}
                  total={drip.total_count}
                  failed={drip.failed_count}
                />
              </Td>
              <Td>{drip.daily_volume}</Td>
              <Td>{drip.failed_count}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors for the table.

- [ ] **Step 3: Commit**

```bash
git add src/features/leadsim/admin/SimDripsTable.jsx
git commit -m "feat(leadsim): add per-client drips table"
```

---

## Task 10: Drips panel (client select + pacing line + form + table)

**Files:**
- Create: `src/features/leadsim/admin/SimDripsPanel.jsx`

- [ ] **Step 1: Write the panel**

`src/features/leadsim/admin/SimDripsPanel.jsx`:
```jsx
import { useMemo, useState } from "react";
import styled from "styled-components";
import Select from "../../../ui/Select";
import FormRowVertical from "../../../ui/FormRowVertical";
import { useSimClients } from "../hooks/useSimClients";
import { formatPacingLine } from "../utils/pacing";
import SimDripForm from "./SimDripForm";
import SimDripsTable from "./SimDripsTable";

const Region = styled.div`
  margin-bottom: 2.4rem;
`;

const PacingLine = styled.p`
  margin: 0.8rem 0 0;
  font-size: 1.3rem;
  color: var(--color-grey-600);
`;

const SectionHeading = styled.h3`
  margin: 0 0 1.2rem;
  font-size: 1.6rem;
`;

const Empty = styled.p`
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

export default function SimDripsPanel({ initialClientId = null }) {
  const { clients } = useSimClients();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");

  const clientOptions = useMemo(
    () => [
      { value: "", label: "Select a sim client" },
      ...clients.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  return (
    <>
      <Region>
        <FormRowVertical>
          <label htmlFor="drip-client">Sim client</label>
          <Select
            id="drip-client"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={clientOptions}
          />
        </FormRowVertical>
        {selectedClient ? (
          <PacingLine>{formatPacingLine(selectedClient)}</PacingLine>
        ) : null}
      </Region>

      {selectedClient ? (
        <Region>
          <SimDripForm key={selectedClient.id} client={selectedClient} />
        </Region>
      ) : (
        <Empty>Select a sim client to create a drip and view its lists.</Empty>
      )}

      <Region>
        <SectionHeading>Drips</SectionHeading>
        <SimDripsTable clientId={selectedClientId || null} />
      </Region>
    </>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: no errors for the panel.

- [ ] **Step 3: Commit**

```bash
git add src/features/leadsim/admin/SimDripsPanel.jsx
git commit -m "feat(leadsim): add drips panel with client select and pacing line"
```

---

## Task 11: Clients panel (lift-and-shift) + clickable row

**Files:**
- Create: `src/features/leadsim/admin/SimClientsPanel.jsx`
- Modify: `src/features/leadsim/admin/SimClientsTable.jsx`

- [ ] **Step 1: Add `onOpen` + clickable Name cell to the table**

Edit `src/features/leadsim/admin/SimClientsTable.jsx`.

Add a styled clickable cell after the existing `Action` styled block:
```jsx
const NameCell = styled.td`
  cursor: pointer;
  color: var(--color-brand-600);
  font-weight: 600;

  &:hover {
    background: var(--color-grey-50);
  }
`;
```

Change the signature:
```jsx
export default function SimClientsTable({ clients, onEdit, onArchive }) {
```
to:
```jsx
export default function SimClientsTable({ clients, onEdit, onArchive, onOpen }) {
```

Change the Name cell in the row from:
```jsx
            <td>{c.name}</td>
```
to:
```jsx
            <NameCell onClick={() => onOpen?.(c)}>{c.name}</NameCell>
```

- [ ] **Step 2: Create the clients panel (verbatim lift of the old LeadSimLayout body)**

`src/features/leadsim/admin/SimClientsPanel.jsx`:
```jsx
import { useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { useSimClients } from "../hooks/useSimClients";
import { useSimClientMutations } from "../hooks/useSimClientMutations";
import SimClientsTable from "./SimClientsTable";
import SimClientForm from "./SimClientForm";

const Bar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.4rem;
`;
const NewButton = styled.button`
  padding: 0.8rem 1.6rem;
  border-radius: var(--border-radius-sm);
  border: none;
  cursor: pointer;
  background: var(--color-brand-600);
  color: white;
`;

export default function SimClientsPanel({ onOpenClient }) {
  const { clients, isPending, error } = useSimClients();
  const { saveClient, isSaving, archiveClient } = useSimClientMutations();
  const [editing, setEditing] = useState(null); // null=list, {}=new, {client}=edit

  if (isPending) return <p>Loading clients…</p>;
  if (error) return <p>Could not load clients: {error.message}</p>;

  async function handleSave(values) {
    try {
      await saveClient(values);
      toast.success("Client saved");
      setEditing(null);
    } catch (e) {
      toast.error(e.message || "Could not save client");
    }
  }

  async function handleArchive(id) {
    try {
      await archiveClient(id);
      toast.success("Client archived");
    } catch (e) {
      toast.error(e.message || "Could not archive client");
    }
  }

  if (editing !== null) {
    return (
      <SimClientForm
        client={editing.id ? editing : null}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <>
      <Bar>
        <h3>Sim clients</h3>
        <NewButton onClick={() => setEditing({})}>+ New client</NewButton>
      </Bar>
      <SimClientsTable
        clients={clients}
        onEdit={(c) => setEditing(c)}
        onArchive={handleArchive}
        onOpen={onOpenClient}
      />
    </>
  );
}
```

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: no errors for the panel or the modified table.

- [ ] **Step 4: Commit**

```bash
git add src/features/leadsim/admin/SimClientsPanel.jsx src/features/leadsim/admin/SimClientsTable.jsx
git commit -m "feat(leadsim): extract clients panel and make client rows openable"
```

---

## Task 12: LeadSimLayout sub-tab shell + cross-link wiring

**Files:**
- Modify: `src/features/leadsim/admin/LeadSimLayout.jsx`

- [ ] **Step 1: Replace LeadSimLayout with the sub-tab shell**

Replace the entire contents of `src/features/leadsim/admin/LeadSimLayout.jsx` with:
```jsx
import { useState } from "react";
import styled from "styled-components";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";
import { useSimClients } from "../hooks/useSimClients";
import SimClientsPanel from "./SimClientsPanel";
import SimDripsPanel from "./SimDripsPanel";

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 1.6rem;
  border-bottom: 1px solid var(--color-grey-200);
  width: 100%;
`;

const Tab = styled.button`
  background: none;
  border: none;
  padding: 1rem 1.6rem;
  font-size: 1.4rem;
  font-weight: 600;
  color: ${(props) =>
    props.$active ? "var(--color-brand-600)" : "var(--color-grey-500)"};
  border-bottom: 2px solid
    ${(props) => (props.$active ? "var(--color-brand-600)" : "transparent")};
  cursor: pointer;
`;

export default function LeadSimLayout() {
  const { clients, isPending } = useSimClients();
  const hasClients = !isPending && clients.length > 0;

  const [activeSubTab, setActiveSubTab] = useState(null); // resolved on first render
  const [preselectedClientId, setPreselectedClientId] = useState(null);

  // Default: open "Drips" if clients exist, else "Clients".
  const resolvedTab = activeSubTab || (hasClients ? "drips" : "clients");

  function openClient(client) {
    setPreselectedClientId(client.id);
    setActiveSubTab("drips");
  }

  return (
    <>
      <Heading as="h2">Lead Sim</Heading>
      <TabContainer>
        <Tab
          $active={resolvedTab === "clients"}
          onClick={() => setActiveSubTab("clients")}
        >
          Clients
        </Tab>
        <Tab
          $active={resolvedTab === "drips"}
          onClick={() => setActiveSubTab("drips")}
        >
          Drips
        </Tab>
      </TabContainer>
      <GridBox>
        {resolvedTab === "clients" ? (
          <SimClientsPanel onOpenClient={openClient} />
        ) : (
          <SimDripsPanel initialClientId={preselectedClientId} />
        )}
      </GridBox>
    </>
  );
}
```

> **Note on the cross-link:** `SimDripsPanel` seeds its own `selectedClientId` from `initialClientId` once on mount. The `key` is not reset between cross-link clicks, so re-clicking a different client row while already on the Drips tab will not re-seed. This is acceptable for Plan 2 — the dropdown remains the source of truth and the admin can switch clients there. Re-seeding on every cross-link is a Plan 4 polish item, not in scope here.

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Verify in the running app**

Run (Docker + local Supabase up, `.env.local` pointing at the local stack): `npm run dev`
Then in the browser, logged in as `admin@fbaged.dev`:
1. Admin Dashboard → **Lead Sim** tab. If no clients exist it opens on **Clients**; create a client, then confirm returning to the tab now defaults to **Drips**.
2. On **Drips**, pick a client → the pacing line ("Send window 08:00–21:00 Europe/Paris · …") appears and the daily-volume seeds from the client.
3. Drop a CSV with an `email` column → filename chip + "Replace file" show. Click **Preview** → 5 chips render (Total/Valid/New/Duplicate/Invalid) with no DB write.
4. Click **Create drip** → green success box, panel resets, and a **Draft** row with a `0/total` bar appears at the top of the Drips table.
5. Upload the same list again → the previously-queued emails now show as Duplicate (skipped) in the preview.
6. Go to **Clients**, click a client's **Name** cell → it jumps to **Drips** pre-scoped to that client.

- [ ] **Step 4: Run lint + full test suite**

Run: `npm run lint && npx vitest run`
Expected: lint clean; all tests pass (including the new `leadSimApi` and `pacing` tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/leadsim/admin/LeadSimLayout.jsx
git commit -m "feat(leadsim): make Lead Sim tab a Clients/Drips sub-tab shell"
```

---

## Self-Review

- **Spec coverage (Plan 2 scope):**
  - Tables `sim_drips` + `sim_drip_leads` with exact columns, status enums, counters, `consecutive_failures`, citext email, unique `(client_id, lower(email))` index, supporting indexes, admin RLS via `public.is_admin()`, grants → Task 1.
  - RPCs `admin_sim_drip_preview` (per-client dedup, no writes), `admin_sim_drip_create` (staging-table dedup ported from `admin_leads_import_confirm`, `draft` status, `total_count`, queued + skipped_duplicate rows), `admin_sim_drips_list` → Task 2.
  - Service `previewSimDrip`/`createSimDrip`/`listSimDrips` following the `p_*` + throw-on-error + `data||[]` convention → Task 3.
  - Hooks `useSimDripPreview` (no invalidation), `useSimDripCreate` (invalidates `["sim-drips", clientId]`), `useSimDrips` → Task 5.
  - UI: sub-tab shell, clickable client rows cross-link, client select + pacing line, drag-drop dropzone, 5-chip preview card with pacing estimate, drips table with status badge + progress bar → Tasks 6–12.
- **Dependency order:** DB (1) → RPCs (2) → service (3) → pure util (4) → hooks (5) → presentational (6–7) → form (8) → table (9) → panels (10–11) → wiring (12). Each task only imports things created earlier.
- **Placeholder scan:** Every code-changing step contains the full SQL / JSX / JS — no `TODO`, no "similar to", no ellipsis-as-omission. Task 11's clients panel is a verbatim copy of the existing `LeadSimLayout` body plus the `onOpenClient` wiring (it is moved code, fully re-pasted, not referenced).
- **Reuse fidelity:** CSV parse + `normalizeCsvHeader`/`hasEmailColumn`/`buildPreviewRows` reused from `src/features/leads/utils/csv.js`; email regex/normalization identical between client (`utils/email.js`) and both RPCs (`^[^\s@]+@[^\s@]+\.[^\s@]+$`, `lower(trim())`); RPC admin gate uses the newer `public.is_admin()` convention (not the inline `profiles.role` check). Preview card, dropzone, progress bar mirror `LeadsImportPreviewCard`/`AdminLeadImportsTable` styling and the `$`-prefixed transient-prop + token conventions.
- **Type consistency:** `p_*` param names match between SQL (Task 2) and service (Task 3) and the service tests (Task 3). `client_id` is `uuid` everywhere (matches `sim_clients.id`). `dailyVolume` is an integer threaded `client.default_daily_volume → form state → createSimDrip → p_daily_volume → sim_drips.daily_volume`. `new_count` math: client computes `max(validRows - duplicateRows, 0)` for the chip; the server's authoritative `queued_count` is shown in the success box.
- **No-write-on-preview discipline:** `admin_sim_drip_preview` only SELECTs; the `useSimDripPreview` hook has no invalidation; the create panel resets only after `admin_sim_drip_create` succeeds.
- **Env safety:** No step targets prod. All SQL runs via `npx supabase@2.105.0 db reset` / `docker exec ... psql` against the local stack; tests mock `../supabase` exactly like the existing `leadSimApi.test.js`. The `prodGuard` in `src/test/setup.js` blocks prod ref `padrhwykbrioohogickg`.
- **Plan 4 seam left explicit:** `SimDripStatusBadge` and `SimDripProgressBar` are presentational/reusable; `SimDripsTable` is the natural host for future per-row pause/resume/cancel; a third "All drips" sub-tab can slot into the same `TabContainer` without restructuring. Not built here.
- **Known deferrals honored:** no planner, no Edge Function, no pg_cron/pg_net, no retry/backoff, no `max_attempts`/breaker-threshold columns (only `consecutive_failures` exists as a column), no controls RPCs. `skipped_duplicate` rows are recorded but not delivered; new drips correctly sit at `Draft 0/total` with "Queued — delivery starts on the next cycle" copy so the zero-progress state reads as intentional.
- **Watch-out — skipped_duplicate uniqueness:** the unique index would reject a second `skipped_duplicate` row with an email already owned (by a queued row or another skipped row) for the client; Task 2 Step 2 adds `on conflict (client_id, lower(email)) do nothing` to the skipped insert so it is idempotent and never raises. Verified by the two-upload smoke test in Task 2 Step 3.
```
