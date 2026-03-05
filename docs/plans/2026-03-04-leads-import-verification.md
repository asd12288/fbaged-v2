# Leads Import Verification Notes

## Scope

Verification for the leads distribution feature:

- Admin preview + confirm import
- Global duplicate detection by normalized email
- Per-batch ownership and stats
- Admin-only leads navigation and route access
- Post-import CSV download actions for:
  - accepted (new) leads
  - duplicate leads with duplicate reason

## Automated Checks

### 1) Unit and component tests

Command:

```bash
npm run test
```

Result (latest targeted run):

- `4` test files passed
- `9` tests passed
- Includes:
- Leads API wrapper + CSV download helper tests
- Admin leads import form render test
- Admin leads preview/result dual-download test
- Main navigation test asserting `My Leads` does not render

### 2) Schema smoke check

Command:

```bash
docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql
```

Result:

- `public.lead_import_batches` exists
- `public.leads` exists
- `public.lead_import_rejections` exists
- `public.admin_leads_import_confirm(uuid,bigint,text,jsonb)` exists

## Functional Verification (Local DB)

Used SQL session simulation with JWT claim switching (`request.jwt.claim.sub`) against local Supabase/Postgres.

### Admin import preview and duplicate detection

Observed:

- Before import preview: `duplicate_count = 0`, `new_count = 2`
- After import preview (same emails): `duplicate_count = 2`, `new_count = 0`

### Import batch counts

Direct table verification:

- `inserted_rows = 2`
- `duplicate_rows = 1`
- `invalid_rows = 2`
- `total_rows = 5`
- `valid_rows = 3`

### RLS ownership checks

Observed:

- Alice (`user_id ...0002`) sees `1` batch
- Bob (`user_id ...0003`) sees `0` rows for Alice's imported batch

## Lint Status

`npm run lint` currently fails with many existing repository-wide issues unrelated to this feature branch (legacy prop-types and unused vars in untouched files). No additional lint baseline introduced for this feature was isolated as a separate failing category.

## Checklist

- [x] Admin can preview duplicate emails before import
- [x] Import inserts only new leads and records batch stats
- [x] Duplicate emails are globally blocked after first import
- [x] Leads entry is removed from user nav (`My Leads` removed)
- [x] `/my-leads` route is removed from app routing
- [x] Admin can download imported leads CSV after confirm
- [x] Admin can download duplicate leads CSV after confirm
- [x] Duplicate CSV contains `reason` column (`duplicate_in_file` / `duplicate_existing`)
