# Admin Leads Imports History Tab Design

**Date:** 2026-03-05
**Status:** Approved
**Owner:** Admin leads tooling

## Goal

Add an `Imports` tab under `Admin Dashboard -> Leads` so admins can download historical batch files for both:
- accepted/new leads
- duplicate leads

The duplicate historical file must include full original row columns plus `reason`.

## Confirmed Decisions

- Keep leads in admin dashboard only.
- Add a second tab in the leads area: `Upload` + `Imports`.
- Imports table is filtered to the currently selected user in admin scope.
- Historical duplicate CSV should contain full original row payload + `reason`.

## Architecture

- `AdminLeadsImportLayout` becomes a two-tab container.
- `Upload` tab keeps existing `LeadsImportForm`.
- `Imports` tab shows historical batches (from `lead_import_batches`) and row actions.
- Row actions:
  - Download New Leads
  - Download Duplicate Leads

## Data Model Update

Enhance duplicate rejection payload persistence so historical duplicate downloads can reconstruct original row columns:

- During `admin_leads_import_confirm`, when inserting into `lead_import_rejections.details`, persist:
  - `duplicate_in_file`
  - `duplicate_existing`
  - `payload_json` (`row_json - 'email'`)

This enables historical duplicate exports with dynamic payload columns.

## Service/API Behavior

- Keep existing `downloadLeadBatchCsv(batchId)` for accepted rows.
- Add `getLeadBatchDuplicateRows(batchId)` that queries `lead_import_rejections` by `batch_id` and maps:
  - `email` from `email_raw`
  - `reason` from duplicate flags
  - `payload_json` from `details.payload_json`
- Reuse `downloadDuplicateLeadsCsv(rows)` to generate duplicate CSV.

## UI Behavior

- Imports table columns:
  - import date
  - campaign
  - source file
  - inserted
  - duplicates
  - invalid
  - actions
- Actions per batch:
  - Download New Leads CSV
  - Download Duplicate Leads CSV (disabled when duplicate count is 0)
- If no selected admin scope user, show inline notice to select user.

## Error Handling

- If duplicate query returns no rows, show toast: no duplicates for this batch.
- Surface Supabase errors via toast.
- Keep admin-only access enforced by existing RLS + route gating.

## Testing

- Service test for `getLeadBatchDuplicateRows` mapping + reason translation.
- Imports UI test for rendering row actions and disabled duplicate action when count is 0.
- Keep existing post-import buttons and upload flow tests passing.

## Success Criteria

- Admin sees `Upload` and `Imports` tabs under Leads.
- Imports tab lists selected user’s batches.
- Old batch downloads work for:
  - accepted leads file
  - duplicates file with `reason` + original payload columns.
