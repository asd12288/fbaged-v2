# Leads Import Distribution Design

**Date:** 2026-03-04
**Status:** Approved
**Owner:** Admin workflow / leads distribution

## 1. Goal

Allow admins to upload a CSV lead list, preview duplicates before import, assign the import to exactly one user and one of that user's campaigns, and let normal users download leads by import cycle (batch) so cycles remain separated.

## 2. Confirmed Product Decisions

- Duplicate scope: global across the full system by email.
- Duplicate action: skip duplicates; import only new leads.
- Ownership model: each imported lead is immutably owned by the selected `user + campaign`.
- File format in V1: CSV only.
- Required CSV columns in V1: `email` only.
- Invalid emails: skip invalid rows and report counts/examples.
- User experience: show import history with per-batch download (not global merged download).
- Campaign selector: admin can choose only existing campaigns for the selected user.

## 3. Non-Goals (V1)

- XLSX import.
- In-app lead editing workflow.
- Reassignment of leads between users/campaigns after import.
- Custom column mapping UI.

## 4. Architecture

Use a hybrid two-step import flow:

1. Client-side preview preparation for fast UX.
- Parse CSV in browser.
- Normalize and basic-validate emails.
- Show preliminary counts and sample issues.

2. Server-side authoritative preview and confirm.
- Preview endpoint checks global duplicates and returns summary.
- Confirm endpoint re-runs validation/deduplication and performs transactional insert.
- Server is source of truth for duplicate enforcement and ownership checks.

3. User delivery by batch.
- Every import creates a batch record.
- Downloads are generated per `batch_id` only.

## 5. Data Model

### Table: `lead_import_batches`

Represents one import cycle.

- `id` bigint identity primary key
- `created_at` timestamptz default now()
- `uploaded_by_admin_id` uuid not null references `auth.users(id)`
- `assigned_user_id` uuid not null references `auth.users(id)`
- `campaign_id` bigint not null references `campaigns(id)`
- `source_filename` text not null
- `total_rows` integer not null
- `valid_rows` integer not null
- `inserted_rows` integer not null
- `duplicate_rows` integer not null
- `invalid_rows` integer not null
- `meta` jsonb default '{}'::jsonb

Indexes:
- `idx_lead_batches_assigned_user_created_at (assigned_user_id, created_at desc)`
- `idx_lead_batches_campaign_created_at (campaign_id, created_at desc)`

### Table: `leads`

Accepted lead rows.

- `id` bigint identity primary key
- `created_at` timestamptz default now()
- `batch_id` bigint not null references `lead_import_batches(id)` on delete cascade
- `assigned_user_id` uuid not null references `auth.users(id)`
- `campaign_id` bigint not null references `campaigns(id)`
- `email` text not null
- `email_normalized` text not null
- `payload_json` jsonb default '{}'::jsonb

Constraints and indexes:
- Unique index on `email_normalized` (global dedupe rule)
- `idx_leads_batch_id (batch_id)`
- `idx_leads_assigned_user_created_at (assigned_user_id, created_at desc)`
- Check constraint: `email_normalized = lower(trim(email_normalized))`

### Table: `lead_import_rejections` (recommended)

Audit of skipped rows.

- `id` bigint identity primary key
- `created_at` timestamptz default now()
- `batch_id` bigint not null references `lead_import_batches(id)` on delete cascade
- `row_number` integer not null
- `email_raw` text
- `reason` text not null check (`reason in ('duplicate','invalid_email','missing_email')`)
- `details` jsonb default '{}'::jsonb

## 6. Security and Ownership Rules

- `assigned_user_id` and `campaign_id` are set on import and never updated in V1.
- Server must reject import if selected campaign does not belong to selected user.
- RLS policies:
- Admin: full read/write on `lead_import_batches`, `leads`, `lead_import_rejections`.
- User: select-only where `assigned_user_id = auth.uid()`.
- Confirm endpoint must not trust client counts.

## 7. API / RPC Surface

Suggested endpoints (Edge Function or RPC-backed service):

1. `POST /leads/import-preview`
- Input: selected user, campaign, filename, parsed rows.
- Output: total rows, valid candidates, invalid count, duplicate count, duplicate samples.

2. `POST /leads/import-confirm`
- Input: selected user, campaign, filename, parsed rows.
- Behavior: transactional import with authoritative checks.
- Output: `batch_id`, inserted count, duplicate count, invalid count, optional samples.

3. `GET /leads/batches?scope=me`
- For users: only their batches.
- For admins: optionally filtered by selected user.

4. `GET /leads/batches/:batchId/download`
- Returns CSV built from rows in `leads where batch_id = :batchId`.
- Must enforce ownership/admin authorization.

## 8. UI/UX Flow

### Admin

New `Leads` tab in Admin dashboard:

1. Select `User`.
2. Select `Campaign` (filtered to that user).
3. Upload CSV file.
4. Preview card/modal with:
- total rows
- valid rows
- duplicates to skip
- invalid rows to skip
- sample duplicate emails
5. Confirm import.
6. Result summary + link to download imported batch.

### Normal User

New `My Leads` page:

- Import history table columns:
- import date
- campaign
- source file name
- inserted/new count
- duplicates skipped count
- invalid skipped count
- Row action: `Download CSV` for that exact batch.

## 9. Error Handling

- Parse errors: show row-level guidance (missing email column, malformed CSV row).
- Validation errors: skip invalid rows and report examples.
- Confirm errors: return actionable message; do not produce partial ambiguous state.
- Download errors: explicit unauthorized/not-found messages.

## 10. Testing Strategy

1. Unit tests
- Email normalization and validation.
- In-file duplicate detection.

2. Integration tests (DB/RPC)
- Global duplicate skip across previous batches.
- Campaign-user mismatch rejected.
- RLS ownership enforcement for reads/download.

3. UI tests
- Admin upload -> preview -> confirm happy path.
- User sees only own batches and downloads per batch.

## 11. Rollout Plan

1. Add schema + RLS migration.
2. Build server import preview/confirm and download endpoints.
3. Build admin import UI.
4. Build user import history and download UI.
5. Run integration and UI verification against local Supabase.
6. Ship behind admin-only navigation entry first; then release user page.

## 12. Success Criteria

- Admin can import CSV, preview duplicates, and confirm import.
- Duplicate emails already in system are not inserted.
- Each batch is tied to one user and one campaign.
- User can download leads per batch/cycle and only for their own data.
- Import summaries are auditable and reproducible.
