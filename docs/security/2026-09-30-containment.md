# Security containment migration sync

This PR records Supabase migration `20260930072740`, applied on 2026-09-30.
It does not deploy, merge, change authentication settings, or alter user data.

## Scope

- Remove client UPDATE on profile role, ID, and creation time; preserve username updates and existing ownership RLS.
- Remove client privileges from three internal ownership snapshots and enable RLS without client policies.
- Remove direct client access to the privileged budget summary view.
- Remove anonymous execution of nine privileged functions; also make the unguarded user-list and internal cleanup/trigger functions backend-only.
- Preserve authenticated access to the guarded admin RPCs and user analytics, plus service-role access.
- Pin four privileged functions' search paths.

The containment statements match the production change. The verification loop is deliberately narrowed to the nine affected function signatures. Production had nine SECURITY DEFINER functions when the migration ran, while this repository also contains newer simulator functions, including intentionally backend-only functions. A schema-wide assertion would incorrectly reject those during a rebuild; no simulator permissions are changed.

## Verification

Before production application, 21 isolated checks passed using live object definitions and synthetic records. After scoping the repository verification loop, 22 checks passed, including an unrelated backend-only function regression. Coverage included role escalation prevention, own username editing, admin listing, authenticated analytics, anonymous denial, backend access, signup trigger, and transaction rollback. The isolated engine was PostgreSQL 17.5/WASM; production is PostgreSQL 15.14. This is not a full production-version or UI test.

After production application, metadata checks confirmed the expected privileges, snapshot RLS and enabled signup trigger. Advisors reported zero ERROR findings and no anonymous SECURITY DEFINER findings. Existing signed-in RPC warnings and unrelated authentication/extension hardening items remain.

Run the repository's existing local Supabase reset workflow, then execute the metadata smoke assertions:

```sh
supabase db reset --yes
# Use the local container name printed by the local Supabase stack.
docker exec -i supabase_db_local-dev-setup psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f - < scripts/sql/security_containment_smoke.sql
```

These commands are for local development only. Do not reset or run application tests against production. The full local Supabase stack was not available in the sync environment, so a complete reset including simulator extensions/cron was not performed.

## Repository checks

- `npm run lint`: passed
- `npm run build`: passed with the existing large-bundle warning
- `npm run test`: 87 tests across 17 files passed with `VITE_SUPABASE_URL=http://127.0.0.1:54321` and a non-secret placeholder key
- Initial test attempt without local environment placeholders failed to load three suites; the local-only rerun passed
- `git diff --check`: passed

## Application dependency review

At main commit `70c81d9e0655352d2693ce756d072aa231252f7a`:

- Budget UI computes from accounts, campaigns and deposits instead of the quarantined view.
- User listing calls retained `admin_list_users`.
- Deployed `admin-users` uses a service-role client for profile creation.
- The profile update helper exists, but the user-row edit button is unwired; payloads attempting protected columns will now fail.

Source inspection does not establish the deployed frontend revision. Unknown clients using the quarantined objects may need a properly scoped replacement. Prior admin assignments and historical access were not audited.

## Deployment and recovery

The live database already records this version. Do not replay it there or rewrite migration history. Merge only after review; this PR does not authorize a merge or deployment.

A blanket rollback restores the vulnerabilities. If compatibility repair is needed, add a narrowly scoped forward migration or backend path rather than restoring public access.
