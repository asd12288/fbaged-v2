# Lead Sim — Plan 1: Foundation & Client Configuration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the prod-safety guardrails and let an admin create/edit/archive external "sim clients" (CRM webhook + per-client field mapping + pacing config), with auth secrets stored in Vault.

**Architecture:** A new `sim_clients` table (admin-only RLS) plus SECURITY DEFINER RPCs for CRUD, mirroring the existing `admin_leads_import_*` pattern. A new `src/features/leadsim/` feature folder and `src/services/leadSimApi.js` service, surfaced as a new "Lead Sim" tab in `AdminDashboard`. Webhook auth secrets are written to Supabase Vault by the upsert RPC and never returned to the browser.

**Tech Stack:** React 18 + Vite, React Query, styled-components, react-hook-form, Supabase (Postgres + Vault), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-09-lead-sim-drip-tool-design.md`

**Prereqs for local testing:** Docker daemon running, then `npx supabase start`. The prod Supabase ref is `padrhwykbrioohogickg` — never target it from tests/dev.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/utils/prodGuard.js` | Detect/assert the configured Supabase URL is not prod | Create |
| `src/utils/__tests__/prodGuard.test.js` | Tests for the guard | Create |
| `src/test/setup.js` | Wire the guard into the Vitest bootstrap | Modify |
| `src/services/leadNormalization.js` | Shared CSV header normalization + alias helpers (extracted from `leadsApi.js`) | Create |
| `src/services/__tests__/leadNormalization.test.js` | Tests for extracted helpers | Create |
| `src/services/leadsApi.js` | Re-import shared helpers instead of defining them | Modify |
| `supabase/config.toml` | Enable Vault locally | Modify |
| `supabase/migrations/20260609090000_sim_admin_helper.sql` | `public.is_admin()` helper | Create |
| `supabase/migrations/20260609090100_sim_clients.sql` | `sim_clients` table + RLS + grants | Create |
| `supabase/migrations/20260609090200_sim_clients_rpcs.sql` | upsert/list/archive RPCs (Vault-backed secret) | Create |
| `src/services/leadSimApi.js` | Client service: list/upsert/archive | Create |
| `src/services/__tests__/leadSimApi.test.js` | Tests (mock supabase) | Create |
| `src/features/leadsim/hooks/useSimClients.js` | React Query list hook | Create |
| `src/features/leadsim/hooks/useSimClientMutations.js` | upsert/archive mutations | Create |
| `src/features/leadsim/admin/SimClientForm.jsx` | Create/edit client form + mapping editor | Create |
| `src/features/leadsim/admin/SimClientsTable.jsx` | List clients with edit/archive | Create |
| `src/features/leadsim/admin/LeadSimLayout.jsx` | Tab layout container | Create |
| `src/pages/AdminDashboard.jsx` | Add "Lead Sim" tab | Modify |

---

## Task 1: Prod-safety test guard

**Files:**
- Create: `src/utils/prodGuard.js`
- Test: `src/utils/__tests__/prodGuard.test.js`
- Modify: `src/test/setup.js`

- [ ] **Step 1: Write the failing test**

`src/utils/__tests__/prodGuard.test.js`:
```js
import { describe, it, expect } from "vitest";
import { isProdSupabaseUrl, assertNotProdSupabase, PROD_SUPABASE_REF } from "../prodGuard";

describe("prodGuard", () => {
  it("flags the known prod project ref", () => {
    expect(isProdSupabaseUrl(`https://${PROD_SUPABASE_REF}.supabase.co`)).toBe(true);
  });

  it("treats local and empty urls as safe", () => {
    expect(isProdSupabaseUrl("http://127.0.0.1:54321")).toBe(false);
    expect(isProdSupabaseUrl(undefined)).toBe(false);
    expect(isProdSupabaseUrl("")).toBe(false);
  });

  it("assert throws on prod, passes on local", () => {
    expect(() => assertNotProdSupabase(`https://${PROD_SUPABASE_REF}.supabase.co`)).toThrow(
      /production/i
    );
    expect(() => assertNotProdSupabase("http://127.0.0.1:54321")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/prodGuard.test.js`
Expected: FAIL — cannot resolve `../prodGuard`.

- [ ] **Step 3: Write minimal implementation**

`src/utils/prodGuard.js`:
```js
// The live production Supabase project. Nothing under test/dev may target it.
export const PROD_SUPABASE_REF = "padrhwykbrioohogickg";

export function isProdSupabaseUrl(url) {
  if (!url) return false;
  return String(url).includes(PROD_SUPABASE_REF);
}

export function assertNotProdSupabase(url) {
  if (isProdSupabaseUrl(url)) {
    throw new Error(
      `Refusing to run against the production Supabase project (${PROD_SUPABASE_REF}). ` +
        `Use a local stack (supabase start) or mocks.`
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/prodGuard.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the guard into the test bootstrap**

Modify `src/test/setup.js` — append after the existing jest-dom import:
```js
import { assertNotProdSupabase } from "../utils/prodGuard";

// Hard stop: tests must never run against the live production database.
assertNotProdSupabase(import.meta.env?.VITE_SUPABASE_URL);
```

- [ ] **Step 6: Run the full suite to confirm nothing breaks**

Run: `npx vitest run`
Expected: PASS (existing suites + new prodGuard tests). If it throws the production error, your `.env.local`/test env points at prod — fix that before continuing.

- [ ] **Step 7: Commit**

```bash
git add src/utils/prodGuard.js src/utils/__tests__/prodGuard.test.js src/test/setup.js
git commit -m "test: add prod-Supabase safety guard to test bootstrap"
```

---

## Task 2: Extract shared CSV normalization helpers

**Why:** Plan 2's upload reuses the exact header-normalization/alias logic that currently lives inside `src/services/leadsApi.js`. Extract it now, with the existing leads tests as the safety net, so neither tool drifts.

**Files:**
- Create: `src/services/leadNormalization.js`
- Test: `src/services/__tests__/leadNormalization.test.js`
- Modify: `src/services/leadsApi.js`

- [ ] **Step 1: Create the shared module by moving helpers**

Create `src/services/leadNormalization.js` and move these definitions verbatim out of `src/services/leadsApi.js` (lines ~6–116 and the helpers that use them): the constant `CANONICAL_EXPORT_HEADERS`, every `*_ALIASES` set, `FULL_NAME_ALIASES`, `FIRST_NAME_ALIASES`, `LAST_NAME_ALIASES`, `PHONE_ALIASES`, `DATE_ALIASES`, `CAMPAIGN_ALIASES`, `ANSWER_ALIASES`, `SYSTEM_FIELD_ALIASES`, and the functions `normalizeFieldKey`, `buildAliasSet`, `stringifyCell`, `getRowEntries`, `findEntryByAliases`, `findValueByAliases`, `buildFullName`, `isMirroredLabelEntry`, `isSystemFieldEntry`, `scoreAnswerEntry`, `buildAnswer`, `buildCampaign`, `mapLeadRowToExportRow`.

Add `export` to each of these so they can be imported:
```js
export const CANONICAL_EXPORT_HEADERS = [ /* ...unchanged... */ ];
export function normalizeFieldKey(value) { /* ...unchanged... */ }
export function buildAliasSet(values) { /* ...unchanged... */ }
export function stringifyCell(value) { /* ...unchanged... */ }
export function getRowEntries(row) { /* ...unchanged... */ }
export function findValueByAliases(entries, aliases) { /* ...unchanged... */ }
export function buildFullName(entries) { /* ...unchanged... */ }
export function buildAnswer(entries) { /* ...unchanged... */ }
export function buildCampaign(entries, fallbackCampaignName) { /* ...unchanged... */ }
export function mapLeadRowToExportRow(row, opts) { /* ...unchanged... */ }
// keep findEntryByAliases, isMirroredLabelEntry, isSystemFieldEntry, scoreAnswerEntry,
// FULL_NAME_ALIASES etc. as module-internal (export the ones the test/consumers need).
```

- [ ] **Step 2: Re-import them in `leadsApi.js`**

In `src/services/leadsApi.js`, delete the moved definitions and add at the top (keeping `import supabase` and `import Papa`):
```js
import {
  CANONICAL_EXPORT_HEADERS,
  normalizeFieldKey,
  stringifyCell,
  mapLeadRowToExportRow,
} from "./leadNormalization";
```
Keep the remaining `leadsApi.js`-specific functions (`fetchAllPages`, `buildCsvBlob`, `parseStoredLeadRows`, `triggerBlobDownload`, `previewLeadImport`, `confirmLeadImport`, `getLeadBatches`, `buildLeadsCsvText`, the download functions, etc.) as-is.

- [ ] **Step 3: Run the existing leads tests (the safety net)**

Run: `npx vitest run src/features/leads src/services`
Expected: PASS — the existing `leadsApi.test.js` and import-form tests are unchanged and still green, proving the extraction preserved behavior.

- [ ] **Step 4: Add focused tests for the shared module**

`src/services/__tests__/leadNormalization.test.js`:
```js
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
```

- [ ] **Step 5: Run the new tests**

Run: `npx vitest run src/services/__tests__/leadNormalization.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/leadNormalization.js src/services/__tests__/leadNormalization.test.js src/services/leadsApi.js
git commit -m "refactor: extract shared lead CSV normalization helpers"
```

---

## Task 3: Enable Vault locally + add `is_admin()` helper

**Files:**
- Modify: `supabase/config.toml`
- Create: `supabase/migrations/20260609090000_sim_admin_helper.sql`

- [ ] **Step 1: Enable Vault in local config**

In `supabase/config.toml`, find the commented `# [db.vault]` block and replace it with:
```toml
[db.vault]
```
(An empty `[db.vault]` table enables the Vault extension on the local stack.)

- [ ] **Step 2: Write the admin-helper migration**

`supabase/migrations/20260609090000_sim_admin_helper.sql`:
```sql
-- Shared admin check used by all sim_* RPCs (DRY of the inline profiles.role lookup).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
```

- [ ] **Step 3: Apply migrations to the local stack and verify**

Run (Docker daemon must be running):
```bash
npx supabase start
npx supabase db reset
```
Then verify the function exists locally:
```bash
npx supabase db reset >/dev/null 2>&1; \
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select proname from pg_proc where proname = 'is_admin';"
```
Expected: a row `is_admin`. (If `psql` is unavailable, open Studio at http://127.0.0.1:54323 and confirm under Database → Functions.)

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml supabase/migrations/20260609090000_sim_admin_helper.sql
git commit -m "feat(db): enable local Vault and add is_admin() helper"
```

---

## Task 4: `sim_clients` table

**Files:**
- Create: `supabase/migrations/20260609090100_sim_clients.sql`

- [ ] **Step 1: Write the table migration**

`supabase/migrations/20260609090100_sim_clients.sql`:
```sql
-- External "sim" clients: a CRM webhook target + payload mapping + pacing config.
create table if not exists public.sim_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  name text not null,
  webhook_url text not null,
  http_method text not null default 'POST'
    check (http_method in ('POST', 'PUT')),
  content_type text not null default 'application/json'
    check (content_type in ('application/json', 'application/x-www-form-urlencoded')),
  field_mapping jsonb not null default '{"fields":{},"constants":{}}'::jsonb,
  custom_headers jsonb not null default '{}'::jsonb,
  auth_secret_ref uuid,                  -- vault.secrets.id; never exposed to the client
  timezone text not null default 'Europe/Paris',
  send_window_start time not null default '08:00',
  send_window_end time not null default '21:00',
  skip_weekends boolean not null default false,
  default_daily_volume integer not null default 25
    check (default_daily_volume > 0),
  is_archived boolean not null default false
);

create index if not exists idx_sim_clients_active
  on public.sim_clients (created_at desc) where not is_archived;

alter table public.sim_clients enable row level security;

create policy sim_clients_admin_all
  on public.sim_clients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.sim_clients to authenticated;
```

- [ ] **Step 2: Apply and verify**

Run:
```bash
npx supabase db reset >/dev/null 2>&1; \
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.sim_clients"
```
Expected: table description listing the columns above, with RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260609090100_sim_clients.sql
git commit -m "feat(db): add sim_clients table"
```

---

## Task 5: Client CRUD RPCs (Vault-backed secret)

**Files:**
- Create: `supabase/migrations/20260609090200_sim_clients_rpcs.sql`

The upsert RPC takes an optional plaintext `p_auth_secret`. When present it writes/updates a Vault secret and stores its id in `auth_secret_ref`; the secret value is never selected back. List/get never return the secret.

- [ ] **Step 1: Write the RPC migration**

`supabase/migrations/20260609090200_sim_clients_rpcs.sql`:
```sql
-- List clients (no secret material returned).
create or replace function public.admin_sim_clients_list()
returns setof public.sim_clients
language sql
security definer
set search_path = public
as $$
  select * from public.sim_clients
  where public.is_admin() and not is_archived
  order by created_at desc;
$$;

grant execute on function public.admin_sim_clients_list() to authenticated;

-- Create or update a client. p_id null => insert. p_auth_secret null => leave secret unchanged.
create or replace function public.admin_sim_client_upsert(
  p_id uuid,
  p_name text,
  p_webhook_url text,
  p_http_method text,
  p_content_type text,
  p_field_mapping jsonb,
  p_custom_headers jsonb,
  p_timezone text,
  p_send_window_start time,
  p_send_window_end time,
  p_skip_weekends boolean,
  p_default_daily_volume integer,
  p_auth_secret text
)
returns public.sim_clients
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_row public.sim_clients;
  v_secret_ref uuid;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;

  if p_id is null then
    -- Insert first so we have a stable id for the vault secret name.
    insert into public.sim_clients (
      created_by, name, webhook_url, http_method, content_type,
      field_mapping, custom_headers, timezone, send_window_start,
      send_window_end, skip_weekends, default_daily_volume
    ) values (
      auth.uid(), p_name, p_webhook_url, coalesce(p_http_method, 'POST'),
      coalesce(p_content_type, 'application/json'),
      coalesce(p_field_mapping, '{"fields":{},"constants":{}}'::jsonb),
      coalesce(p_custom_headers, '{}'::jsonb),
      coalesce(p_timezone, 'Europe/Paris'),
      coalesce(p_send_window_start, '08:00'),
      coalesce(p_send_window_end, '21:00'),
      coalesce(p_skip_weekends, false),
      coalesce(p_default_daily_volume, 25)
    )
    returning * into v_row;
  else
    update public.sim_clients set
      name = p_name,
      webhook_url = p_webhook_url,
      http_method = coalesce(p_http_method, http_method),
      content_type = coalesce(p_content_type, content_type),
      field_mapping = coalesce(p_field_mapping, field_mapping),
      custom_headers = coalesce(p_custom_headers, custom_headers),
      timezone = coalesce(p_timezone, timezone),
      send_window_start = coalesce(p_send_window_start, send_window_start),
      send_window_end = coalesce(p_send_window_end, send_window_end),
      skip_weekends = coalesce(p_skip_weekends, skip_weekends),
      default_daily_volume = coalesce(p_default_daily_volume, default_daily_volume)
    where id = p_id
    returning * into v_row;

    if v_row.id is null then
      raise exception 'Client not found';
    end if;
  end if;

  -- Handle the auth secret via Vault, if provided.
  if p_auth_secret is not null and length(p_auth_secret) > 0 then
    if v_row.auth_secret_ref is null then
      v_secret_ref := vault.create_secret(
        p_auth_secret,
        'sim_client_' || v_row.id::text,
        'Auth secret for sim client ' || v_row.name
      );
      update public.sim_clients set auth_secret_ref = v_secret_ref
        where id = v_row.id
        returning * into v_row;
    else
      perform vault.update_secret(v_row.auth_secret_ref, p_auth_secret);
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function public.admin_sim_client_upsert(
  uuid, text, text, text, text, jsonb, jsonb, text, time, time, boolean, integer, text
) to authenticated;

-- Soft-delete.
create or replace function public.admin_sim_client_archive(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin only';
  end if;
  update public.sim_clients set is_archived = true where id = p_id;
end;
$$;

grant execute on function public.admin_sim_client_archive(uuid) to authenticated;
```

- [ ] **Step 2: Apply and verify the RPCs exist**

Run:
```bash
npx supabase db reset >/dev/null 2>&1; \
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select proname from pg_proc where proname like 'admin_sim_client%' order by proname;"
```
Expected: `admin_sim_client_archive`, `admin_sim_client_upsert`, `admin_sim_clients_list`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260609090200_sim_clients_rpcs.sql
git commit -m "feat(db): add sim_clients CRUD RPCs with Vault-backed auth secret"
```

---

## Task 6: `leadSimApi.js` service

**Files:**
- Create: `src/services/leadSimApi.js`
- Test: `src/services/__tests__/leadSimApi.test.js`

- [ ] **Step 1: Write the failing test**

`src/services/__tests__/leadSimApi.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("../supabase", () => ({ default: { rpc: (...a) => rpc(...a) } }));

import { listSimClients, upsertSimClient, archiveSimClient } from "../leadSimApi";

beforeEach(() => rpc.mockReset());

describe("leadSimApi", () => {
  it("listSimClients returns rows", async () => {
    rpc.mockResolvedValue({ data: [{ id: "1", name: "Acme" }], error: null });
    const rows = await listSimClients();
    expect(rpc).toHaveBeenCalledWith("admin_sim_clients_list");
    expect(rows).toEqual([{ id: "1", name: "Acme" }]);
  });

  it("upsertSimClient maps args to RPC params", async () => {
    rpc.mockResolvedValue({ data: { id: "1" }, error: null });
    await upsertSimClient({
      id: null,
      name: "Acme",
      webhookUrl: "https://hook",
      fieldMapping: { fields: { email: "Email" }, constants: {} },
      authSecret: "tok",
    });
    expect(rpc).toHaveBeenCalledWith(
      "admin_sim_client_upsert",
      expect.objectContaining({
        p_id: null,
        p_name: "Acme",
        p_webhook_url: "https://hook",
        p_field_mapping: { fields: { email: "Email" }, constants: {} },
        p_auth_secret: "tok",
      })
    );
  });

  it("throws on rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(listSimClients()).rejects.toThrow("boom");
  });

  it("archiveSimClient passes id", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await archiveSimClient("abc");
    expect(rpc).toHaveBeenCalledWith("admin_sim_client_archive", { p_id: "abc" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/leadSimApi.test.js`
Expected: FAIL — cannot resolve `../leadSimApi`.

- [ ] **Step 3: Write the service**

`src/services/leadSimApi.js`:
```js
import supabase from "./supabase";

export async function listSimClients() {
  const { data, error } = await supabase.rpc("admin_sim_clients_list");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertSimClient({
  id = null,
  name,
  webhookUrl,
  httpMethod = "POST",
  contentType = "application/json",
  fieldMapping,
  customHeaders = {},
  timezone = "Europe/Paris",
  sendWindowStart = "08:00",
  sendWindowEnd = "21:00",
  skipWeekends = false,
  defaultDailyVolume = 25,
  authSecret = null,
}) {
  const { data, error } = await supabase.rpc("admin_sim_client_upsert", {
    p_id: id,
    p_name: name,
    p_webhook_url: webhookUrl,
    p_http_method: httpMethod,
    p_content_type: contentType,
    p_field_mapping: fieldMapping,
    p_custom_headers: customHeaders,
    p_timezone: timezone,
    p_send_window_start: sendWindowStart,
    p_send_window_end: sendWindowEnd,
    p_skip_weekends: skipWeekends,
    p_default_daily_volume: defaultDailyVolume,
    p_auth_secret: authSecret,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveSimClient(id) {
  const { error } = await supabase.rpc("admin_sim_client_archive", { p_id: id });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/leadSimApi.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/leadSimApi.js src/services/__tests__/leadSimApi.test.js
git commit -m "feat: add leadSimApi client service"
```

---

## Task 7: React Query hooks

**Files:**
- Create: `src/features/leadsim/hooks/useSimClients.js`
- Create: `src/features/leadsim/hooks/useSimClientMutations.js`

- [ ] **Step 1: Write the list hook**

`src/features/leadsim/hooks/useSimClients.js`:
```js
import { useQuery } from "@tanstack/react-query";
import { listSimClients } from "../../../services/leadSimApi";

export function useSimClients() {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-clients"],
    queryFn: listSimClients,
  });
  return { clients: data || [], isPending, error };
}
```

- [ ] **Step 2: Write the mutations hook**

`src/features/leadsim/hooks/useSimClientMutations.js`:
```js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertSimClient, archiveSimClient } from "../../../services/leadSimApi";

export function useSimClientMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["sim-clients"] });

  const upsert = useMutation({ mutationFn: upsertSimClient, onSuccess: invalidate });
  const archive = useMutation({ mutationFn: archiveSimClient, onSuccess: invalidate });

  return {
    saveClient: upsert.mutateAsync,
    isSaving: upsert.isPending,
    saveError: upsert.error,
    archiveClient: archive.mutateAsync,
    isArchiving: archive.isPending,
  };
}
```

- [ ] **Step 3: Sanity-check the build compiles**

Run: `npm run lint`
Expected: no new errors in the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/features/leadsim/hooks/
git commit -m "feat: add sim client React Query hooks"
```

---

## Task 8: Client UI + AdminDashboard tab

**Files:**
- Create: `src/features/leadsim/admin/SimClientForm.jsx`
- Create: `src/features/leadsim/admin/SimClientsTable.jsx`
- Create: `src/features/leadsim/admin/LeadSimLayout.jsx`
- Modify: `src/pages/AdminDashboard.jsx`

> The mapping editor (Step 1) is the only non-standard widget: it edits `field_mapping.fields` (our canonical field → their CRM key) as a small fixed-row table over the canonical fields `full_name, email, tel, answer, date, campaign`.

- [ ] **Step 1: Client form with mapping editor**

`src/features/leadsim/admin/SimClientForm.jsx`:
```jsx
import { useState } from "react";
import styled from "styled-components";

const CANONICAL_FIELDS = ["full_name", "email", "tel", "answer", "date", "campaign"];

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  max-width: 60rem;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 16rem 1fr;
  align-items: center;
  gap: 1.2rem;
`;
const Label = styled.label`
  font-weight: 600;
`;
const Input = styled.input`
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
`;
const Actions = styled.div`
  display: flex;
  gap: 1.2rem;
`;
const Button = styled.button`
  padding: 0.8rem 1.6rem;
  border-radius: var(--border-radius-sm);
  border: none;
  cursor: pointer;
  background: var(--color-brand-600);
  color: white;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const Ghost = styled(Button)`
  background: var(--color-grey-200);
  color: var(--color-grey-700);
`;

function mappingFromClient(client) {
  const fields = client?.field_mapping?.fields || {};
  return CANONICAL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: fields[f] || "" }), {});
}

export default function SimClientForm({ client, onSave, onCancel, isSaving }) {
  const [name, setName] = useState(client?.name || "");
  const [webhookUrl, setWebhookUrl] = useState(client?.webhook_url || "");
  const [contentType, setContentType] = useState(
    client?.content_type || "application/json"
  );
  const [dailyVolume, setDailyVolume] = useState(client?.default_daily_volume || 25);
  const [timezone, setTimezone] = useState(client?.timezone || "Europe/Paris");
  const [windowStart, setWindowStart] = useState(client?.send_window_start || "08:00");
  const [windowEnd, setWindowEnd] = useState(client?.send_window_end || "21:00");
  const [skipWeekends, setSkipWeekends] = useState(client?.skip_weekends || false);
  const [authSecret, setAuthSecret] = useState("");
  const [mapping, setMapping] = useState(mappingFromClient(client));

  function handleSubmit(e) {
    e.preventDefault();
    const fields = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v && v.trim())
    );
    onSave({
      id: client?.id || null,
      name,
      webhookUrl,
      contentType,
      timezone,
      sendWindowStart: windowStart,
      sendWindowEnd: windowEnd,
      skipWeekends,
      defaultDailyVolume: Number(dailyVolume),
      fieldMapping: { fields, constants: client?.field_mapping?.constants || {} },
      // only send a secret when the admin typed a new one
      authSecret: authSecret.trim() ? authSecret.trim() : null,
    });
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Row>
      <Row>
        <Label>Webhook URL</Label>
        <Input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          required
        />
      </Row>
      <Row>
        <Label>Content type</Label>
        <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="application/json">JSON</option>
          <option value="application/x-www-form-urlencoded">Form-encoded</option>
        </select>
      </Row>
      <Row>
        <Label>Auth secret</Label>
        <Input
          type="password"
          placeholder={client?.auth_secret_ref ? "•••••• (leave blank to keep)" : "token"}
          value={authSecret}
          onChange={(e) => setAuthSecret(e.target.value)}
        />
      </Row>
      <Row>
        <Label>Daily volume</Label>
        <Input
          type="number"
          min="1"
          value={dailyVolume}
          onChange={(e) => setDailyVolume(e.target.value)}
        />
      </Row>
      <Row>
        <Label>Timezone</Label>
        <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </Row>
      <Row>
        <Label>Send window</Label>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          <span>to</span>
          <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
        </div>
      </Row>
      <Row>
        <Label>Skip weekends</Label>
        <input
          type="checkbox"
          checked={skipWeekends}
          onChange={(e) => setSkipWeekends(e.target.checked)}
        />
      </Row>

      <Label>Field mapping (our field → their CRM key)</Label>
      {CANONICAL_FIELDS.map((field) => (
        <Row key={field}>
          <Label>{field}</Label>
          <Input
            placeholder={`their key for ${field}`}
            value={mapping[field]}
            onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
          />
        </Row>
      ))}

      <Actions>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save client"}
        </Button>
        {onCancel && (
          <Ghost type="button" onClick={onCancel}>
            Cancel
          </Ghost>
        )}
      </Actions>
    </Form>
  );
}
```

- [ ] **Step 2: Clients table**

`src/features/leadsim/admin/SimClientsTable.jsx`:
```jsx
import styled from "styled-components";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { text-align: left; padding: 1.2rem; border-bottom: 1px solid var(--color-grey-200); }
`;
const Action = styled.button`
  background: none;
  border: none;
  color: var(--color-brand-600);
  cursor: pointer;
  margin-right: 1.2rem;
`;

export default function SimClientsTable({ clients, onEdit, onArchive }) {
  if (!clients.length) return <p>No clients yet. Create one to get started.</p>;
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Webhook</th>
          <th>Daily volume</th>
          <th>Window</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.webhook_url}</td>
            <td>{c.default_daily_volume}</td>
            <td>{c.send_window_start}–{c.send_window_end} ({c.timezone})</td>
            <td>
              <Action onClick={() => onEdit(c)}>Edit</Action>
              <Action onClick={() => onArchive(c.id)}>Archive</Action>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

- [ ] **Step 3: Layout container**

`src/features/leadsim/admin/LeadSimLayout.jsx`:
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

export default function LeadSimLayout() {
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
      />
    </>
  );
}
```

- [ ] **Step 4: Add the AdminDashboard tab**

In `src/pages/AdminDashboard.jsx`:

Add import near the other layout imports:
```jsx
import LeadSimLayout from "../features/leadsim/admin/LeadSimLayout";
```
Add a tab button after the "leads" `Tab` (inside `TabContainer`):
```jsx
          <Tab
            $active={activeTab === "leadsim"}
            onClick={() => setActiveTab("leadsim")}
          >
            Lead Sim
          </Tab>
```
Add the render line after the existing `{activeTab === "leads" && <AdminLeadsImportLayout />}`:
```jsx
        {activeTab === "leadsim" && <LeadSimLayout />}
```

- [ ] **Step 5: Verify in the running app**

Run (Docker + local Supabase up, with `.env.local` pointing at the local stack):
```bash
npm run dev
```
Then in the browser: log in as an admin → Admin Dashboard → **Lead Sim** tab → **+ New client** → fill name + webhook + a field mapping + auth secret → Save. Confirm it appears in the table, Edit reloads values (secret blank), Archive removes it.

- [ ] **Step 6: Run lint + full test suite**

Run: `npm run lint && npx vitest run`
Expected: lint clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/leadsim/admin/ src/pages/AdminDashboard.jsx
git commit -m "feat(leadsim): add admin client config UI (Lead Sim tab)"
```

---

## Self-Review (completed)

- **Spec coverage (Plan 1 scope):** ✅ env-safety guard (Task 1) + local Vault (Task 3); shared CSV normalization extraction (Task 2); `sim_clients` table with admin RLS + per-client field mapping + pacing config + Vault auth secret (Tasks 4–5); service/hooks/UI for client CRUD (Tasks 6–8). The `sim_drips`/`sim_drip_leads` tables, engine, and controls are intentionally deferred to Plans 2–4.
- **Placeholder scan:** ✅ All steps contain runnable code/commands. Task 2 deliberately references moving existing, already-written code rather than re-pasting ~110 lines; the function names to move are enumerated explicitly.
- **Type consistency:** ✅ RPC param names (`p_*`) match between the SQL (Task 5) and the service (Task 6). `field_mapping` shape `{fields,constants}` is consistent across SQL default, service, form, and table. `auth_secret_ref` is write-only across SQL and never read by service/UI.

---

## Roadmap: Plans 2–4 (to be written after Plan 1 lands)

**Plan 2 — Upload, drip creation & dedup**
- Tables `sim_drips`, `sim_drip_leads` (+ unique `(client_id, lower(email))`), status enums, counters.
- RPCs `admin_sim_drip_preview` (new vs duplicate counts for a client) and `admin_sim_drip_create` (insert drip + queued leads, mark duplicates `skipped_duplicate`), reusing the staging-table pattern from `admin_leads_import_confirm` and the shared normalization from Task 2.
- UI: pick client → CSV upload → preview → confirm, mirroring `LeadsImportForm`/`useLeadImportPreview`/`useLeadImportConfirm`.

**Plan 3 — Drip engine**
- Pure `scheduleWindow({count, windowStart, windowEnd, tz, date, seed})` function + tests (non-uniform spread, respects window, deterministic by seed).
- plpgsql planner `sim_plan_drips()` (ports the spread logic; tops up the 48h horizon per running drip; ±20% daily jitter; skips off-days) + migration enabling `pg_cron`/`pg_net` and scheduling the planner hourly.
- Edge Function `sim-drip-deliver`: pulls due leads (`FOR UPDATE SKIP LOCKED`), builds payload from mapping (JSON/form) + headers + Vault secret, POSTs with timeout, records result, exponential-backoff retries (max 5), circuit breaker (5 consecutive failures → drip `paused`), **dry-run unless real prod**; pg_cron invokes it every minute with a shared-secret header.

**Plan 4 — Controls & monitoring UI**
- Drips list per client (status, sent/total progress, breaker reason).
- Drip detail: per-lead status table (queued/scheduled/sent/failed + response/error), pause/resume/cancel, "retry now", edit `daily_volume`.
- RPCs: `admin_sim_drip_set_status`, `admin_sim_drip_retry_lead`, `admin_sim_drip_update_pace`.
