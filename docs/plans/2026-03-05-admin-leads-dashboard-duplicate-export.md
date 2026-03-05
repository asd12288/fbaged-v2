# Admin Leads Dashboard Duplicate Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove user-facing `my-leads` access and add admin-only immediate duplicate CSV export after lead import confirmation.

**Architecture:** Keep the existing admin import flow under `Admin Dashboard -> Leads` and extend only the confirm path. The backend RPC will return duplicate export rows for the just-created batch; the frontend will generate two client-side CSV downloads (new leads and duplicates). Route/nav cleanup removes all non-admin leads entry points.

**Tech Stack:** React 18, React Router, TanStack Query, Supabase RPC (Postgres PL/pgSQL), Vitest + Testing Library, styled-components.

---

**Implementation guardrails**
- Use @test-driven-development for each behavior change.
- Use @verification-before-completion before claiming done.
- Keep changes scoped (YAGNI): no historical duplicate download UI.

### Task 1: Expand service-layer contract tests for confirm + download helpers

**Files:**
- Modify: `src/features/leads/hooks/__tests__/leadsApi.test.js`
- Modify: `src/services/leadsApi.js`

**Step 1: Write the failing tests**

Add tests that assert:
1. `confirmLeadImport` calls `admin_leads_import_confirm` and preserves `duplicate_rows_export` in output.
2. New helper `buildLeadsCsvText(rows, { includeReason })` creates expected headers/rows for:
- new leads (no reason)
- duplicate rows (with `reason`)

```js
it("calls confirm rpc and returns duplicate export payload", async () => {
  supabase.rpc.mockResolvedValue({
    data: {
      batch_id: 9,
      inserted_rows: 2,
      duplicate_rows_export: [{
        email: "dup@example.com",
        reason: "duplicate_existing",
        payload_json: { name: "Dup" },
      }],
    },
    error: null,
  });

  const out = await confirmLeadImport({
    assignedUserId: "u1",
    campaignId: 3,
    sourceFilename: "leads.csv",
    rows: [{ email: "dup@example.com", name: "Dup" }],
  });

  expect(out.duplicate_rows_export).toHaveLength(1);
});

it("builds duplicate csv with reason column", () => {
  const csv = buildLeadsCsvText(
    [{ email: "dup@example.com", reason: "duplicate_existing", payload_json: { name: "Dup" } }],
    { includeReason: true }
  );
  expect(csv.split("\n")[0]).toBe("email,reason,name");
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: FAIL with missing exports/behavior for confirm payload + CSV helper.

**Step 3: Write minimal implementation**

In `src/services/leadsApi.js`:
- Export `confirmLeadImport` unchanged in signature but ensure returned object is not transformed away.
- Extract reusable CSV builder:

```js
export function buildLeadsCsvText(rows, { includeReason = false } = {}) {
  const payloadKeys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row.payload_json || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  const headers = ["email", ...(includeReason ? ["reason"] : []), ...payloadKeys];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        escapeCsvValue(row.email),
        ...(includeReason ? [escapeCsvValue(row.reason || "")] : []),
        ...payloadKeys.map((k) => escapeCsvValue(row.payload_json?.[k])),
      ].join(",")
    ),
  ];

  return lines.join("\n");
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/leadsApi.js src/features/leads/hooks/__tests__/leadsApi.test.js
git commit -m "test: cover confirm duplicate export payload and csv builder"
```

### Task 2: Add DB migration to return duplicate export rows from confirm RPC

**Files:**
- Create: `supabase/migrations/20260305130000_leads_confirm_duplicate_export.sql`
- Modify: `scripts/sql/leads_schema_smoke.sql` (optional function smoke assertion)

**Step 1: Write the failing verification query script**

Add a SQL snippet to validate updated function compiles and is callable:

```sql
select proname
from pg_proc
where proname = 'admin_leads_import_confirm';
```

**Step 2: Run migration/verification to see failure on missing field behavior**

Run: `supabase db reset --yes`
Expected: current function compiles but does not return `duplicate_rows_export`.

Run: `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`
Expected: PASS schema checks, no export field yet.

**Step 3: Write minimal migration implementation**

Create migration that `create or replace function public.admin_leads_import_confirm(...)` and appends response field:

```sql
'duplicate_rows_export', coalesce((
  select jsonb_agg(
    jsonb_build_object(
      'email', s.email_normalized,
      'reason', case
        when s.is_duplicate_in_file then 'duplicate_in_file'
        else 'duplicate_existing'
      end,
      'payload_json', coalesce(s.row_json - 'email', '{}'::jsonb)
    )
    order by s.row_number
  )
  from _lead_import_stage s
  where s.is_duplicate_in_file or s.is_duplicate_existing
), '[]'::jsonb)
```

Keep all existing counters unchanged.

**Step 4: Re-run DB verification**

Run: `supabase db reset --yes`
Expected: PASS migration application.

Run: `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`
Expected: PASS table/function smoke checks.

**Step 5: Commit**

```bash
git add supabase/migrations/20260305130000_leads_confirm_duplicate_export.sql scripts/sql/leads_schema_smoke.sql
git commit -m "feat: return duplicate rows export payload from leads confirm rpc"
```

### Task 3: Add explicit frontend CSV download helpers for new and duplicate files

**Files:**
- Modify: `src/services/leadsApi.js`
- Test: `src/features/leads/hooks/__tests__/leadsApi.test.js`

**Step 1: Write failing tests for download wrappers**

Add tests for:
- `downloadAcceptedLeadsCsv(rows, filename)`
- `downloadDuplicateLeadsCsv(rows, filename)`

Use `URL.createObjectURL` and `document.createElement` spies to assert download filenames.

**Step 2: Run tests to verify failure**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: FAIL due missing wrapper functions.

**Step 3: Implement minimal wrappers**

Add service helpers:

```js
export function downloadAcceptedLeadsCsv(rows, { filename }) {
  const csv = buildLeadsCsvText(rows, { includeReason: false });
  triggerCsvDownload(csv, filename);
}

export function downloadDuplicateLeadsCsv(rows, { filename }) {
  const csv = buildLeadsCsvText(rows, { includeReason: true });
  triggerCsvDownload(csv, filename);
}
```

Also refactor existing `downloadLeadBatchCsv` to reuse `triggerCsvDownload` internally (no behavior change).

**Step 4: Run tests to verify pass**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/leadsApi.js src/features/leads/hooks/__tests__/leadsApi.test.js
git commit -m "feat: add reusable accepted and duplicate leads csv download helpers"
```

### Task 4: Update admin import UI to show post-import dual downloads

**Files:**
- Modify: `src/features/leads/admin/LeadsImportForm.jsx`
- Modify: `src/features/leads/admin/LeadsImportPreviewCard.jsx`
- Modify: `src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
- Optional Test: `src/features/leads/admin/__tests__/LeadsImportPreviewCard.test.jsx` (new)

**Step 1: Write failing UI tests**

Add assertions that after import result is present:
- `Download New Leads CSV` button is shown.
- `Download Duplicate Leads CSV` button is shown only when duplicates array has rows.

```js
expect(screen.getByRole("button", { name: /download new leads csv/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /download duplicate leads csv/i })).toBeInTheDocument();
```

**Step 2: Run tests to verify failure**

Run: `npm run test -- src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
Expected: FAIL because buttons do not exist yet.

**Step 3: Implement minimal UI logic**

In `LeadsImportForm.jsx`:
- Preserve raw parsed rows from latest confirm so accepted rows can be derived if needed.
- On confirm success, pass import result data + filename to preview card.

In `LeadsImportPreviewCard.jsx`:
- Render two new buttons inside result area.
- Wire handlers to service functions:
  - accepted rows download
  - duplicate export download from `importResult.duplicate_rows_export`
- Guard duplicate button when array empty.

**Step 4: Run UI tests to verify pass**

Run: `npm run test -- src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/leads/admin/LeadsImportForm.jsx src/features/leads/admin/LeadsImportPreviewCard.jsx src/features/leads/admin/__tests__/LeadsImportForm.test.jsx src/features/leads/admin/__tests__/LeadsImportPreviewCard.test.jsx
git commit -m "feat: add post-import accepted and duplicate csv downloads in admin leads flow"
```

### Task 5: Remove `my-leads` route and navigation entry

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/ui/MainNav.jsx`
- Optional Delete: `src/pages/MyLeads.jsx`
- Optional Delete: `src/features/leads/user/MyLeadsTable.jsx`
- Optional Delete: `src/features/leads/user/MyLeadsRow.jsx`
- Optional Delete: `src/features/leads/user/__tests__/MyLeadsTable.test.jsx`
- Modify: `README.md`

**Step 1: Write failing test for nav visibility**

Add or update nav tests to assert no `My Leads` entry exists for regular users.

```js
expect(screen.queryByText(/my leads/i)).not.toBeInTheDocument();
```

If no nav test harness exists, add a small unit test for `MainNav` with mocked `useUser`.

**Step 2: Run test to verify failure**

Run: `npm run test -- src/ui/__tests__/MainNav.test.jsx`
Expected: FAIL before nav removal.

**Step 3: Implement minimal route/nav cleanup**

- Remove `MyLeads` import and `<Route path="my-leads" ... />` from `App.jsx`.
- Remove `My Leads` link from `MainNav.jsx`.
- If files become unused, remove dead code/tests.
- Update README leads section: admin-only workflow and immediate duplicate CSV export.

**Step 4: Run test(s) to verify pass**

Run: `npm run test -- src/ui/__tests__/MainNav.test.jsx src/features/leads/admin/__tests__/LeadsImportForm.test.jsx src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.jsx src/ui/MainNav.jsx src/ui/__tests__/MainNav.test.jsx src/pages/MyLeads.jsx src/features/leads/user/MyLeadsTable.jsx src/features/leads/user/MyLeadsRow.jsx src/features/leads/user/__tests__/MyLeadsTable.test.jsx README.md
git commit -m "refactor: make leads download admin-only and remove my-leads route"
```

### Task 6: End-to-end verification and release notes update

**Files:**
- Modify: `docs/plans/2026-03-04-leads-import-verification.md`

**Step 1: Write verification checklist updates first**

Add checklist items for:
- no `/my-leads` route
- duplicate CSV post-import download
- reason column correctness

**Step 2: Run full targeted verification**

Run:
- `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js src/features/leads/admin/__tests__/LeadsImportForm.test.jsx src/ui/__tests__/MainNav.test.jsx`
- `supabase db reset --yes`
- `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`

Expected: all PASS.

**Step 3: Confirm manual UI behavior**

Manual checks:
- Admin imports CSV with duplicates.
- Success card shows both download buttons.
- Duplicate file contains `email,reason,...` and correct reason values.
- Non-admin has no leads download page entry.

**Step 4: Capture verification notes**

Document exact command outputs and manual screenshots/observations in verification file.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-04-leads-import-verification.md
git commit -m "docs: update verification for admin-only leads and duplicate csv export"
```
