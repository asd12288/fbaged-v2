# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Leads Distribution (Admin -> Users)

The app now includes a leads import and distribution flow:

- Admin uploads a CSV (`email` column required).
- System previews duplicates (global by normalized email) before import.
- Admin assigns import to one user and one of that user's campaigns.
- Each import is tracked as a separate batch/cycle.
- Leads downloads are admin-only from `Admin Dashboard -> Leads`.
- After confirm import, admin can download:
  - Imported (new) leads CSV
  - Duplicate leads CSV (separate file, includes duplicate reason)
- Admin Leads now has:
  - `Upload` tab for new imports
  - `Imports` tab for historical batch downloads
- Historical duplicates download from `Imports` also includes original row columns + duplicate reason.

### Local verification

- Run tests: `npm run test`
- Reset local DB with migrations: `supabase db reset --yes`
- Schema smoke check: `docker exec -i supabase_db_local-dev-setup psql -U postgres -d postgres -f - < scripts/sql/leads_schema_smoke.sql`
