-- Records production migration 20260930072740, applied 2026-09-30.
-- Containment DDL matches production. Verification is scoped to the nine
-- affected functions so unrelated, backend-only simulator RPCs remain untouched.
-- No data changes. Do not reapply this version to an already-migrated project.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- 1. Stop self-promotion through profiles.role; keep ordinary username editing.
-- Current column ACLs are null; current table UPDATE is broad.
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (username) ON TABLE public.profiles TO authenticated;
-- Existing own-row RLS continues to apply. Server service_role privileges unchanged.

-- 2. Quarantine internal ownership snapshots: no client access or write path.
REVOKE ALL PRIVILEGES ON TABLE
  public._snapshot_accounts_ownership,
  public._snapshot_campaigns_ownership,
  public._snapshot_deposits_ownership
FROM PUBLIC, anon, authenticated;
ALTER TABLE public._snapshot_accounts_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._snapshot_campaigns_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._snapshot_deposits_ownership ENABLE ROW LEVEL SECURITY;
-- Deliberately no client policies: these contain old ownership mappings.
-- Existing postgres/service_role backend access is retained.

-- 3. Close the cross-user budget view directly to both client roles.
-- Do NOT simply set security_invoker=true: auth.users is not selectable by clients,
-- so that would break reads too, without providing a replacement access model.
REVOKE ALL PRIVILEGES ON TABLE public.user_budget_summary
FROM PUBLIC, anon, authenticated;
-- Existing SECURITY DEFINER analytics can still query this as postgres.

-- 4. Remove anonymous/default-PUBLIC execution from all nine flagged functions.
-- Explicit authenticated/service_role grants exist today and survive this revoke.
REVOKE EXECUTE ON FUNCTION
  public.admin_leads_import_confirm(uuid,bigint,text,jsonb),
  public.admin_leads_import_preview(uuid,bigint,text[]),
  public.admin_list_users(),
  public.cleanup_expired_impersonation_sessions(),
  public.get_all_users_with_auth(),
  public.get_budget_health_metrics(uuid),
  public.get_campaign_performance_analysis(uuid),
  public.get_monthly_financial_summary(uuid,integer),
  public.handle_new_user()
FROM PUBLIC, anon;

-- 5. Also close unguarded/internal endpoints to signed-in clients.
REVOKE EXECUTE ON FUNCTION
  public.get_all_users_with_auth(),
  public.cleanup_expired_impersonation_sessions(),
  public.handle_new_user()
FROM authenticated;
-- Existing handle_new_user auth trigger remains; do not remove/recreate it.
-- The guarded admin_list_users/admin import endpoints retain authenticated EXECUTE.
-- They depend on profiles.role, which step 1 makes non-user-editable.

-- 6. Pin mutable search paths without breaking existing unqualified public tables.
ALTER FUNCTION public.cleanup_expired_impersonation_sessions()
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_budget_health_metrics(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_campaign_performance_analysis(uuid)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_monthly_financial_summary(uuid,integer)
  SET search_path = pg_catalog, public, pg_temp;
-- public has no CREATE grant for anon/authenticated in the observed state.
-- update_updated_at_column is a separate non-definer warning; inspect before altering.


DO $verify$
DECLARE f record; t regclass;
BEGIN
  IF has_column_privilege('authenticated','public.profiles','role','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','id','UPDATE')
    OR has_column_privilege('authenticated','public.profiles','created_at','UPDATE')
    OR NOT has_column_privilege('authenticated','public.profiles','username','UPDATE')
    OR NOT has_table_privilege('service_role','public.profiles','UPDATE') THEN
    RAISE EXCEPTION 'Profile privilege verification failed';
  END IF;
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.oid IN (
      'public.admin_leads_import_confirm(uuid,bigint,text,jsonb)'::regprocedure,
      'public.admin_leads_import_preview(uuid,bigint,text[])'::regprocedure,
      'public.admin_list_users()'::regprocedure,
      'public.cleanup_expired_impersonation_sessions()'::regprocedure,
      'public.get_all_users_with_auth()'::regprocedure,
      'public.get_budget_health_metrics(uuid)'::regprocedure,
      'public.get_campaign_performance_analysis(uuid)'::regprocedure,
      'public.get_monthly_financial_summary(uuid,integer)'::regprocedure,
      'public.handle_new_user()'::regprocedure
    ) LOOP
    IF has_function_privilege('anon',f.oid,'EXECUTE') OR NOT has_function_privilege('service_role',f.oid,'EXECUTE') THEN RAISE EXCEPTION 'Function privilege verification failed: %',f.proname; END IF;
    IF has_function_privilege('authenticated',f.oid,'EXECUTE') <> (f.proname NOT IN ('get_all_users_with_auth','cleanup_expired_impersonation_sessions','handle_new_user')) THEN RAISE EXCEPTION 'Authenticated function verification failed: %',f.proname; END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['public._snapshot_accounts_ownership'::regclass,'public._snapshot_campaigns_ownership'::regclass,'public._snapshot_deposits_ownership'::regclass] LOOP
    IF has_table_privilege('anon',t,'SELECT') OR has_table_privilege('authenticated',t,'SELECT') OR NOT has_table_privilege('service_role',t,'SELECT') OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=t) THEN RAISE EXCEPTION 'Snapshot verification failed: %',t; END IF;
  END LOOP;
  IF has_table_privilege('anon','public.user_budget_summary','SELECT') OR has_table_privilege('authenticated','public.user_budget_summary','SELECT') THEN RAISE EXCEPTION 'View privilege verification failed'; END IF;
END
$verify$;
