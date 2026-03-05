# Admin Leads Imports History Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin-only `Imports` tab in Leads for historical downloads of accepted and duplicate CSV files per batch.

**Architecture:** Extend the existing leads admin layout into `Upload` and `Imports` tabs. Persist duplicate payload metadata in rejection details and expose a service query that reconstructs duplicate rows for any batch. Reuse existing CSV builders/download helpers for both historical actions.

**Tech Stack:** React, styled-components, TanStack Query, Supabase RPC/Postgres, Vitest.

---

### Task 1: Add failing tests for historical duplicate-row service mapping

**Files:**
- Modify: `src/features/leads/hooks/__tests__/leadsApi.test.js`
- Modify: `src/services/leadsApi.js`

**Step 1: Write failing test**
- Add test for `getLeadBatchDuplicateRows(batchId)` expecting mapped rows:
  - `email`
  - `reason` (`duplicate_in_file` / `duplicate_existing`)
  - `payload_json`

**Step 2: Run test (expect fail)**
- Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`

**Step 3: Implement minimal code**
- Add `getLeadBatchDuplicateRows` query against `lead_import_rejections` filtered by `batch_id` and `reason='duplicate'`.

**Step 4: Re-run test (expect pass)**
- Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`

**Step 5: Commit**
- `git add src/services/leadsApi.js src/features/leads/hooks/__tests__/leadsApi.test.js`
- `git commit -m "feat: add historical duplicate rows query for lead batches"`

### Task 2: Add DB migration to persist duplicate payload for historical export

**Files:**
- Create: `supabase/migrations/20260305142000_leads_rejection_payload_export.sql`

**Step 1: Write migration**
- Replace `admin_leads_import_confirm` insert into `lead_import_rejections.details` to include:
  - duplicate flags
  - `payload_json: coalesce(s.row_json - 'email', '{}'::jsonb)`

**Step 2: Apply and verify**
- Run: `supabase db reset --yes`
- Run: `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`

**Step 3: Commit**
- `git add supabase/migrations/20260305142000_leads_rejection_payload_export.sql`
- `git commit -m "feat: persist duplicate payload fields for historical duplicate exports"`

### Task 3: Build Admin Leads `Imports` tab UI

**Files:**
- Modify: `src/features/leads/admin/AdminLeadsImportLayout.jsx`
- Create: `src/features/leads/admin/AdminLeadImportsTable.jsx`
- Modify: `src/features/leads/hooks/useLeadBatches.js` (if needed)

**Step 1: Write failing component test**
- Add test file for imports table row actions and duplicate button disabled when `duplicate_rows` is 0.

**Step 2: Run test (expect fail)**
- Run: `npm run test -- src/features/leads/admin/__tests__/AdminLeadImportsTable.test.jsx`

**Step 3: Implement minimal UI**
- Add `Upload` / `Imports` tabs.
- `Imports` renders table for selected admin scope user.
- Row actions:
  - Download New Leads (existing helper)
  - Download Duplicate Leads (new query + duplicate CSV helper)

**Step 4: Re-run tests (expect pass)**
- Run: `npm run test -- src/features/leads/admin/__tests__/AdminLeadImportsTable.test.jsx src/features/leads/admin/__tests__/LeadsImportPreviewCard.test.jsx`

**Step 5: Commit**
- `git add src/features/leads/admin/AdminLeadsImportLayout.jsx src/features/leads/admin/AdminLeadImportsTable.jsx src/features/leads/admin/__tests__/AdminLeadImportsTable.test.jsx`
- `git commit -m "feat: add admin leads imports history tab with batch download actions"`

### Task 4: Update docs and run final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-04-leads-import-verification.md`

**Step 1: Update docs**
- Mention new Imports tab and historical duplicate download behavior.

**Step 2: Run final checks**
- `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js src/features/leads/admin/__tests__/LeadsImportPreviewCard.test.jsx src/features/leads/admin/__tests__/AdminLeadImportsTable.test.jsx src/ui/__tests__/MainNav.test.jsx`
- `supabase db reset --yes`
- `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`

**Step 3: Commit**
- `git add README.md docs/plans/2026-03-04-leads-import-verification.md`
- `git commit -m "docs: verify admin imports tab and historical duplicate downloads"`
