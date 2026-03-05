# Leads Bootstrap Import Runbook

Use this runbook for one-time large imports such as `20k-30k` leads for a single user. The app UI remains the source of truth for the import logic, duplicate handling, and stored output files.

## When to use this

- Initial migration of a large historical leads file
- Bulk import for one assigned user where browser JSON upload would be too large

## Goal

Process a large CSV in safe chunks while preserving:

- per-user duplicate detection
- duplicate-in-file detection inside each chunk
- stored clean CSV output
- stored duplicate CSV output

## Requirements

- CSV contains an `email` column
- You know the target `user` and `campaign`
- Production app is deployed with the latest import flow

## Recommended chunk size

Use `500-1000` rows per file. This keeps uploads responsive and still moves quickly.

## Steps

1. Split the source CSV into chunks that all keep the original header row.
2. Name chunks clearly, for example:
   - `user-a-bootstrap-001.csv`
   - `user-a-bootstrap-002.csv`
3. In the app, go to `Admin Dashboard -> Leads -> Upload`.
4. Select the target user.
5. Select one of that user's campaigns.
6. Upload the first chunk and preview duplicates.
7. Confirm import.
8. Verify the result summary and download actions.
9. Repeat for each remaining chunk.

## Why this works

- Duplicates are checked against existing leads for the selected user.
- After each chunk is imported, the next chunk will compare against all leads already imported for that same user.
- New imports persist generated files to Storage, so each chunk keeps:
  - `clean.csv`
  - `duplicates.csv` when duplicates exist

## Verification after each chunk

Check:

- inserted count looks reasonable
- duplicate count looks reasonable
- invalid count looks reasonable
- `Download New Leads CSV` works
- `Download Duplicate Leads CSV` works when duplicates exist

## Optional post-processing

If you need one final combined clean file for the user, merge the downloaded chunk-level clean CSV files outside the app after the import is complete.
