# Per-User Leads Import Scale Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make leads import/deduplication work reliably for this admin workflow by enforcing per-user duplicate checks and removing 1000-row retrieval bottlenecks.

**Architecture:** Keep the current admin upload UX and RPC flow for recurring small files, but fix dedupe scope to `assigned_user_id` and add paginated reads for historical/download queries. Add a simple bootstrap path for large first-time imports through documented script workflow rather than moving the whole product to async jobs now.

**Tech Stack:** React, Supabase JS, Postgres SQL migrations, Vitest.

---

### Task 1: Add failing tests for pagination-aware leads data retrieval

**Files:**
- Modify: `src/features/leads/hooks/__tests__/leadsApi.test.js`

1. Add failing tests that expect `getLeadBatches`, `getLeadBatchDuplicateRows`, and `downloadLeadBatchCsv` to iterate in pages (`range`) and merge all rows.
2. Run the targeted test file and confirm failures.

### Task 2: Implement paginated reads in leads API service

**Files:**
- Modify: `src/services/leadsApi.js`

1. Add a small reusable helper to fetch paged rows from Supabase queries.
2. Use helper in:
- `getLeadBatches`
- `getLeadBatchDuplicateRows`
- `downloadLeadBatchCsv`
3. Keep behavior unchanged for CSV formatting and row mapping.

### Task 3: Enforce per-user duplicate semantics in database

**Files:**
- Create: `supabase/migrations/20260305173000_leads_per_user_dedupe_and_uniqueness.sql`

1. Add unique index on `(assigned_user_id, email_normalized)`.
2. Replace preview RPC so duplicate check only considers rows for `p_assigned_user_id`.
3. Replace confirm RPC so `is_duplicate_existing` checks only leads owned by `p_assigned_user_id`.
4. Keep current output contract (`duplicate_rows_export`, counters).

### Task 4: Add large-bootstrap documentation for one-time imports

**Files:**
- Modify: `README.md`

1. Add short “Large initial import (20k+)” section with recommended one-time path.
2. Clarify recurring uploads path and per-user dedupe semantics.

### Task 5: Verify

**Files:**
- No code changes expected.

1. Run targeted tests for `leadsApi`.
2. Run a broader relevant suite if fast.
3. Report what passed and what still needs runtime/manual verification (e.g., SQL migration apply in Supabase environment).
