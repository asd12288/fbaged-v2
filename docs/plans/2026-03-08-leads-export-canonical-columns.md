# Leads Export Canonical Columns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce clean lead export CSVs with the canonical column order `full name, email, tel, answer, date, campaign` while preserving duplicate filtering and duplicate export reasons.

**Architecture:** Keep import storage unchanged and normalize rows only when exporting. Add a shared export formatter that understands common Meta Ads header aliases, then route every clean and duplicate CSV builder through that formatter so new and historical downloads stay aligned.

**Tech Stack:** React 18, Supabase JS, Vitest, Testing Library, Papa Parse, styled-components.

---

**Implementation guardrails**
- Use @test-driven-development for each behavior change.
- Use @verification-before-completion before claiming done.
- Keep the scope limited to the leads import/export path.

### Task 1: Cover canonical export mapping behavior

**Files:**
- Modify: `src/features/leads/hooks/__tests__/leadsApi.test.js`
- Modify: `src/services/leadsApi.js`

**Step 1: Write the failing test**

Add tests proving `buildLeadsCsvText` emits:
- `full name,email,tel,answer,date,campaign` for clean exports
- `full name,email,tel,answer,date,campaign,reason` for duplicate exports
- support for `full_name`
- support for `first_name` + `last_name`
- support for `phone_number`
- support for `created_time`
- support for explicit and inferred answer fields
- campaign fallback from the assigned campaign name when payload data is missing

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: FAIL because exports currently output `email` plus arbitrary payload keys.

**Step 3: Write minimal implementation**

Add a canonical export-row normalizer in `src/services/leadsApi.js` that:
- resolves values through alias lists,
- combines first and last name when needed,
- excludes known system fields when inferring `answer`,
- appends `reason` only for duplicate exports,
- accepts optional campaign fallback context.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

### Task 2: Route all lead downloads through the canonical formatter

**Files:**
- Modify: `src/services/leadsApi.js`
- Modify: `src/features/leads/admin/LeadsImportPreviewCard.jsx`
- Modify: `src/features/leads/admin/AdminLeadImportsTable.jsx`
- Modify: `src/pages/MyLeads.jsx`

**Step 1: Write the failing test**

Extend the leads API tests so historical batch downloads and generated files use the canonical headers even when rows only contain raw payload keys and a campaign fallback is required.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: FAIL because download helpers do not currently pass campaign context into the formatter.

**Step 3: Write minimal implementation**

- Update the clean and duplicate download helpers to pass campaign name when available.
- Update stored-file generation during import confirm so `clean.csv` and `duplicates.csv` use the same canonical formatter.
- Keep filenames and download behavior unchanged.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

### Task 3: Verify the targeted leads flow

**Files:**
- No code changes required if tests pass

**Step 1: Run focused verification**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js src/features/leads/admin/__tests__/LeadsImportPreviewCard.test.jsx src/features/leads/admin/__tests__/AdminLeadImportsTable.test.jsx src/features/leads/user/__tests__/MyLeadsTable.test.jsx`
Expected: PASS.

**Step 2: Run broader leads verification**

Run: `npm run test -- src/features/leads`
Expected: PASS.

**Step 3: Review output**

Check that:
- clean CSV header order is fixed,
- duplicate CSV adds `reason`,
- campaign fallback works for rows with no campaign payload.
