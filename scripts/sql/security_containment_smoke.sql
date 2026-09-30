-- Read-only metadata assertions after the containment migration.
-- Run against a local database rebuilt with this repository, not production.
BEGIN READ ONLY;
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

ROLLBACK;
