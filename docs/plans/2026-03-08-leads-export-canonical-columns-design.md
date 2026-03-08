# Leads Export Canonical Columns Design

**Date:** 2026-03-08
**Status:** Approved
**Owner:** Admin leads tooling

## 1. Goal

Make lead import downloads produce a consistent, cleaned CSV shape regardless of the original uploaded header names.

## 2. Confirmed Product Decisions

- Clean lead downloads must use this exact column order:
  - `full name`
  - `email`
  - `tel`
  - `answer`
  - `date`
  - `campaign`
- Duplicate filtering remains unchanged.
- Duplicate downloads should keep a `reason` column so admins can still see why a row was skipped.
- Source files mainly come from Meta Ads style exports, so the alias mapper should favor common Meta header variants.

## 3. Non-Goals

- Changing the duplicate-detection rules.
- Reworking the leads table schema.
- Canonicalizing every payload key stored in the database.
- Adding new UI beyond the existing import and download actions.

## 4. Architecture

1. Keep the database payload format as-is for now.
2. Add a frontend export-normalization layer that maps messy source headers into canonical export fields.
3. Reuse that same normalization path for:
   - new imported leads downloads,
   - duplicate leads downloads,
   - historical batch downloads,
   - stored file generation after import confirm.

## 5. Field Mapping Rules

### Full name

- Prefer explicit full-name aliases such as `full name`, `full_name`, and `name`.
- Otherwise combine first-name and last-name aliases such as `first name`, `first_name`, `last name`, and `last_name`.

### Email

- Use the lead row `email` field directly.

### Tel

- Support aliases such as `tel`, `telephone`, `telephone num`, `phone`, `phone number`, `phone_number`, and similar normalized variants from Meta-style exports.

### Date

- Support aliases such as `date`, `created_time`, `created at`, and `created_at`.

### Campaign

- Prefer campaign-like payload fields when present, including Meta-style campaign naming variants.
- Fall back to the assigned campaign name from the app when the uploaded row does not include a campaign field.

### Answer

- Prefer direct aliases such as `answer`, `response`, and `reply`.
- If none are present, infer the answer from the remaining non-system payload field that is most likely to represent the lead's answer. This should exclude obvious system columns such as ids, tracking columns, campaign columns, and contact fields.

## 6. Data Flow

### Upload and import

- Admin uploads a CSV file.
- Existing preview and confirm logic still parse the full row and keep duplicate filtering based on email.
- The row continues to be stored as `email` plus raw payload JSON.

### Download and storage

- When building CSV text, the export helper converts each row into the canonical six-column shape.
- Duplicate exports append `reason` after the six standard columns.
- Stored clean and duplicate files use the same formatter, so fresh downloads and historical downloads stay consistent.

## 7. Error Handling

- If a canonical field cannot be found, export an empty string for that column.
- If both full-name and first-name/last-name data exist, prefer the explicit full-name field to avoid accidental duplication.
- If multiple possible answer fields exist, prefer explicit answer aliases before heuristic fallback.

## 8. Testing Strategy

1. Add formatter tests covering:
   - `full_name` vs `first_name` + `last_name`
   - `phone_number`
   - `created_time`
   - campaign fallback from assigned campaign
   - answer inference from Meta-style question columns
2. Update download tests to assert the exact canonical header order.
3. Verify duplicate exports still include `reason`.

## 9. Success Criteria

- Exported clean lead files always use the same six columns in the approved order.
- Duplicate files use the same six columns plus `reason`.
- Existing batches with mixed payload keys can still be exported cleanly.
- Meta Ads style uploads produce meaningful `answer`, `date`, `tel`, and `campaign` values without manual cleanup.
