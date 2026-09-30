-- Independent metadata-only regression checks for a rebuilt local database.
-- No production connection, fixtures, or data mutations are needed.
BEGIN READ ONLY;
DO $smoke$
DECLARE unexpected text;
BEGIN
  WITH rpc(signature, signed_in_allowed) AS (
    VALUES
      ('public.admin_list_users()', true),
      ('public.admin_leads_import_preview(uuid,bigint,text[])', true),
      ('public.admin_leads_import_confirm(uuid,bigint,text,jsonb)', true),
      ('public.get_budget_health_metrics(uuid)', true),
      ('public.get_campaign_performance_analysis(uuid)', true),
      ('public.get_monthly_financial_summary(uuid,integer)', true),
      ('public.get_all_users_with_auth()', false),
      ('public.cleanup_expired_impersonation_sessions()', false),
      ('public.handle_new_user()', false)
  ), relation(name, needs_rls) AS (
    VALUES
      ('public.user_budget_summary', false),
      ('public._snapshot_accounts_ownership', true),
      ('public._snapshot_campaigns_ownership', true),
      ('public._snapshot_deposits_ownership', true)
  ), profile_column(name, editable) AS (
    VALUES ('username', true), ('role', false), ('id', false), ('created_at', false)
  ), failures AS (
    SELECT signature AS object_name FROM rpc
    WHERE has_function_privilege('anon', signature, 'EXECUTE')
       OR has_function_privilege('authenticated', signature, 'EXECUTE') IS DISTINCT FROM signed_in_allowed
       OR NOT has_function_privilege('service_role', signature, 'EXECUTE')
    UNION ALL
    SELECT name FROM relation
    WHERE EXISTS (
      SELECT 1 FROM unnest(ARRAY['anon','authenticated']) AS client_role
      CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS privilege
      WHERE has_table_privilege(client_role, name, privilege)
    ) OR NOT has_table_privilege('service_role', name, 'SELECT')
      OR (needs_rls AND NOT (SELECT relrowsecurity FROM pg_class WHERE oid=name::regclass))
    UNION ALL
    SELECT 'profiles.' || name FROM profile_column
    WHERE has_column_privilege('authenticated', 'public.profiles', name, 'UPDATE') IS DISTINCT FROM editable
       OR has_column_privilege('anon', 'public.profiles', name, 'UPDATE')
       OR NOT has_column_privilege('service_role', 'public.profiles', name, 'UPDATE')
    UNION ALL
    SELECT 'signup trigger' WHERE NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid='auth.users'::regclass
        AND tgfoid='public.handle_new_user()'::regprocedure AND tgenabled='O'
    )
  )
  SELECT string_agg(object_name, ', ' ORDER BY object_name) INTO unexpected FROM failures;
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Containment smoke check failed for: %', unexpected;
  END IF;
END
$smoke$;
ROLLBACK;
