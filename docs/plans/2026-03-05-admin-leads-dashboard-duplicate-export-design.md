# Admin Leads Dashboard Migration + Duplicate Export Design

**Date:** 2026-03-05
**Status:** Approved
**Owner:** Admin leads tooling

## 1. Goal

Move all leads download capabilities to admin-only surfaces and add a second CSV export for duplicate leads, available immediately after import confirmation.

## 2. Confirmed Product Decisions

- `/my-leads` should be removed.
- Leads tooling should live only in `/admin-dashboard`.
- Admin import flow remains the source of truth for assigning leads to a specific `user + campaign`.
- Duplicate detection behavior remains unchanged (in-file + existing system duplicates).
- Add a separate duplicate CSV download.
- Duplicate CSV should include original row data plus duplicate reason.
- Duplicate download should be available only right after a successful import (not in historical tables).

## 3. Non-Goals

- Adding historical duplicate download per old batch.
- Reworking deduplication rules.
- Rebuilding admin tab architecture.

## 4. Architecture

1. Keep the existing admin import pipeline in `Admin Dashboard -> Leads`.
2. Remove user-facing route and navigation for `My Leads`.
3. Extend the import confirm RPC response with a duplicate export payload.
4. Generate duplicate CSV client-side from returned payload immediately after import success.

## 5. UI/Navigation Changes

- Remove route registration for `/my-leads`.
- Remove sidebar nav link for `My Leads`.
- Keep `Leads` tab inside admin dashboard as the only entry point.
- In import result area, expose two actions post-success:
  - Download newly imported leads CSV
  - Download duplicate leads CSV

## 6. Data Flow

### Existing

- Admin selects user and campaign.
- Admin uploads CSV and previews duplicates.
- Admin confirms import.
- Server writes accepted rows to `leads` and rejected rows to `lead_import_rejections`.

### Added

- Confirm response includes `duplicate_rows_export` array for that completed batch.
- Client uses this payload to generate and download duplicates CSV in-session.

## 7. API/RPC Contract Update

Extend `admin_leads_import_confirm(...)` response with:

- `duplicate_rows_export: []`

Each row shape:

- `email`: normalized/parsed email value used for duplicate decision
- `reason`: `duplicate_in_file` or `duplicate_existing`
- `payload_json`: original non-email row fields

Counters already returned (`inserted_rows`, `duplicate_rows`, etc.) remain unchanged.

## 8. CSV Export Rules

### New Leads CSV

- Continue existing behavior (email + dynamic payload columns).

### Duplicate Leads CSV

- Headers: `email`, `reason`, then dynamic payload keys from `payload_json` union.
- Rows: duplicate rows only.
- Filename pattern: `<source>-duplicates-batch-<batch_id>.csv`.

## 9. Error Handling

- Duplicate download button hidden or disabled if no duplicate export rows returned.
- CSV generation failure surfaces toast error.
- Admin authorization remains enforced server-side via role checks in RPC.

## 10. Testing Strategy

1. Unit tests
- CSV helper includes `reason` column for duplicate export.
- Dynamic payload headers are preserved.

2. UI tests
- Admin import result shows two download actions after success.
- Duplicate action appears only when duplicate payload exists.

3. Regression checks
- Admin preview/confirm flow still works.
- No non-admin path remains for leads download route/nav.

## 11. Success Criteria

- Non-admin users have no `my-leads` route or nav entry.
- Admin can import leads as before from admin dashboard.
- After import success, admin can download:
  - accepted/new leads CSV
  - duplicate leads CSV with reason field
- Duplicate CSV faithfully matches rows rejected as duplicates during that import.
