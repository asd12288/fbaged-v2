


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_list_users"() RETURNS TABLE("id" "uuid", "username" "text", "role" "text", "created_at" timestamp with time zone, "email" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.username, p.role, p.created_at, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id <> auth.uid() -- exclude current user
    and exists (
      select 1 from public.profiles ap 
      where ap.id = auth.uid() and ap.role = 'admin'
    )
  order by p.created_at desc;
$$;


ALTER FUNCTION "public"."admin_list_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_impersonation_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  UPDATE admin_impersonation_sessions 
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND expires_at <= now();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_impersonation_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users_with_auth"() RETURNS TABLE("id" "uuid", "username" "text", "role" "text", "created_at" timestamp with time zone, "email" character varying, "last_sign_in_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.role,
        p.created_at,
        au.email,
        au.last_sign_in_at,
        au.email_confirmed_at
    FROM profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_users_with_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_budget_health_metrics"("target_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("total_balance" double precision, "monthly_burn_rate" double precision, "estimated_runway_months" double precision, "active_campaign_spend_rate" double precision, "budget_utilization_rate" double precision, "avg_campaign_roi" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Security check
  IF target_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: cannot access other user data';
  END IF;

  RETURN QUERY
  WITH budget_metrics AS (
    SELECT 
      ubs.available_balance::double precision,
      ubs.active_daily_budget::double precision,
      ubs.total_campaign_spend::double precision,
      ubs.total_deposits::double precision,
      -- Calculate recent spending trend
      (SELECT COALESCE(SUM(c."amountSpent"), 0)::double precision 
       FROM campaigns c 
       WHERE c.user_id = target_user_id 
         AND c.created_at >= NOW() - INTERVAL '30 days') as last_30_days_spend,
      -- Calculate average ROI
      (SELECT COALESCE(AVG(
         CASE 
           WHEN c."amountSpent" > 0 AND c.results > 0 
           THEN c.results::double precision / c."amountSpent"::double precision 
           ELSE 0 
         END
       ), 0)::double precision
       FROM campaigns c 
       WHERE c.user_id = target_user_id 
         AND c."amountSpent" > 0) as avg_roi
    FROM user_budget_summary ubs
    WHERE ubs.user_id = target_user_id
  )
  SELECT 
    bm.available_balance as total_balance,
    bm.last_30_days_spend as monthly_burn_rate,
    CASE 
      WHEN bm.last_30_days_spend > 0 
      THEN (bm.available_balance / bm.last_30_days_spend)::double precision 
      ELSE NULL::double precision 
    END as estimated_runway_months,
    bm.active_daily_budget as active_campaign_spend_rate,
    CASE 
      WHEN bm.total_deposits > 0 
      THEN ((bm.total_campaign_spend / bm.total_deposits) * 100)::double precision 
      ELSE 0::double precision 
    END as budget_utilization_rate,
    bm.avg_roi as avg_campaign_roi
  FROM budget_metrics bm;
END;
$$;


ALTER FUNCTION "public"."get_budget_health_metrics"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_performance_analysis"("target_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("campaign_name" "text", "status" "text", "amount_spent" double precision, "daily_budget" bigint, "results" bigint, "impressions" bigint, "clicks" bigint, "cpm" double precision, "cpc" double precision, "ctr" double precision, "cost_per_result" double precision, "efficiency_score" double precision, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Security check
  IF target_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: cannot access other user data';
  END IF;

  RETURN QUERY
  SELECT 
    c."campaignName",
    c.status,
    COALESCE(c."amountSpent", 0),
    c."dailyBudget",
    c.results,
    c.impressions,
    c.clicks,
    c.cpm,
    c.cpc,
    c.ctr,
    c."costPerResults",
    -- Efficiency score based on results per dollar spent
    CASE 
      WHEN c."amountSpent" > 0 AND c.results > 0 THEN 
        (c.results / c."amountSpent") * 100
      ELSE 0 
    END as efficiency_score,
    c.created_at
  FROM campaigns c
  WHERE c.user_id = target_user_id
    AND c."amountSpent" IS NOT NULL
  ORDER BY efficiency_score DESC, c."amountSpent" DESC;
END;
$$;


ALTER FUNCTION "public"."get_campaign_performance_analysis"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_financial_summary"("target_user_id" "uuid" DEFAULT "auth"."uid"(), "months_back" integer DEFAULT 12) RETURNS TABLE("month_year" "text", "month_date" "date", "total_deposits" double precision, "campaign_spend" double precision, "account_costs" double precision, "net_cashflow" double precision, "campaigns_launched" bigint, "avg_cpm" double precision, "avg_cpc" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Security check: users can only access their own data unless they're admin
  IF target_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: cannot access other user data';
  END IF;

  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      TO_CHAR(date_series, 'YYYY-MM') as month_year,
      date_series::date as month_date
    FROM generate_series(
      DATE_TRUNC('month', NOW() - (months_back || ' months')::interval),
      DATE_TRUNC('month', NOW()),
      '1 month'::interval
    ) as date_series
  )
  SELECT 
    md.month_year,
    md.month_date,
    COALESCE(SUM(d.amount)::double precision, 0) as total_deposits,
    COALESCE(SUM(c."amountSpent")::double precision, 0) as campaign_spend,
    COALESCE(SUM(a."totalCost")::double precision, 0) as account_costs,
    (COALESCE(SUM(d.amount), 0) - COALESCE(SUM(c."amountSpent"), 0) - COALESCE(SUM(a."totalCost"), 0))::double precision as net_cashflow,
    COUNT(c.id) as campaigns_launched,
    AVG(c.cpm)::double precision as avg_cpm,
    AVG(c.cpc)::double precision as avg_cpc
  FROM monthly_data md
  LEFT JOIN deposits d ON TO_CHAR(d.created_at, 'YYYY-MM') = md.month_year AND d.user_id = target_user_id
  LEFT JOIN campaigns c ON TO_CHAR(c.created_at, 'YYYY-MM') = md.month_year AND c.user_id = target_user_id
  LEFT JOIN accounts a ON TO_CHAR(a.created_at, 'YYYY-MM') = md.month_year AND a.user_id = target_user_id
  GROUP BY md.month_year, md.month_date
  ORDER BY md.month_date;
END;
$$;


ALTER FUNCTION "public"."get_monthly_financial_summary"("target_user_id" "uuid", "months_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user'); -- 'user' is the default role
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_snapshot_accounts_ownership" (
    "id" bigint,
    "old_user_id" "uuid"
);


ALTER TABLE "public"."_snapshot_accounts_ownership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_snapshot_campaigns_ownership" (
    "id" bigint,
    "old_user_id" "uuid"
);


ALTER TABLE "public"."_snapshot_campaigns_ownership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_snapshot_deposits_ownership" (
    "id" bigint,
    "old_user_id" "uuid"
);


ALTER TABLE "public"."_snapshot_deposits_ownership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nameAccount" "text",
    "numAccounts" bigint,
    "cost" smallint,
    "totalCost" bigint,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


ALTER TABLE "public"."accounts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."accounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_impersonation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "impersonated_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '08:00:00'::interval),
    "is_active" boolean DEFAULT true,
    "session_metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."admin_impersonation_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_impersonation_sessions" IS 'Tracks active admin user impersonation sessions for secure user context switching';



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "campaignName" "text",
    "status" "text",
    "dailyBudget" bigint,
    "results" bigint,
    "reaches" bigint,
    "impressions" bigint,
    "linkClicks" bigint,
    "cpm" double precision,
    "cpc" double precision,
    "ctr" double precision,
    "clicks" bigint,
    "costPerResults" double precision,
    "amountSpent" double precision,
    "image" "text",
    "dailyResults" smallint,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


ALTER TABLE "public"."campaigns" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."campaigns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."deposits" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "amount" double precision,
    "dateAdded" "text",
    "type" "text",
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."deposits" OWNER TO "postgres";


ALTER TABLE "public"."deposits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."deposits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "username" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'the profiles of users';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "isMaintenanceMode" boolean
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE "public"."settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."user_budget_summary" AS
 SELECT "u"."id" AS "user_id",
    COALESCE("d"."total_deposits", (0)::double precision) AS "total_deposits",
    COALESCE("c"."total_campaign_spend", (0)::double precision) AS "total_campaign_spend",
    COALESCE("a"."total_account_costs", (0)::numeric) AS "total_account_costs",
    ((COALESCE("d"."total_deposits", (0)::double precision) - COALESCE("c"."total_campaign_spend", (0)::double precision)) - (COALESCE("a"."total_account_costs", (0)::numeric))::double precision) AS "available_balance",
    "c"."active_daily_budget",
    "c"."total_daily_budget",
    "c"."active_campaigns_count",
    "c"."paused_campaigns_count",
    "c"."canceled_campaigns_count",
    "d"."last_deposit_date",
    "c"."last_campaign_date"
   FROM ((("auth"."users" "u"
     LEFT JOIN ( SELECT "deposits"."user_id",
            "sum"("deposits"."amount") AS "total_deposits",
            "max"("deposits"."created_at") AS "last_deposit_date"
           FROM "public"."deposits"
          GROUP BY "deposits"."user_id") "d" ON (("u"."id" = "d"."user_id")))
     LEFT JOIN ( SELECT "campaigns"."user_id",
            "sum"(COALESCE("campaigns"."amountSpent", (0)::double precision)) AS "total_campaign_spend",
            "sum"(
                CASE
                    WHEN ("campaigns"."status" = 'Active'::"text") THEN "campaigns"."dailyBudget"
                    ELSE (0)::bigint
                END) AS "active_daily_budget",
            "sum"("campaigns"."dailyBudget") AS "total_daily_budget",
            "count"(
                CASE
                    WHEN ("campaigns"."status" = 'Active'::"text") THEN 1
                    ELSE NULL::integer
                END) AS "active_campaigns_count",
            "count"(
                CASE
                    WHEN ("campaigns"."status" = 'Paused'::"text") THEN 1
                    ELSE NULL::integer
                END) AS "paused_campaigns_count",
            "count"(
                CASE
                    WHEN ("campaigns"."status" = 'Canceled'::"text") THEN 1
                    ELSE NULL::integer
                END) AS "canceled_campaigns_count",
            "max"("campaigns"."created_at") AS "last_campaign_date"
           FROM "public"."campaigns"
          GROUP BY "campaigns"."user_id") "c" ON (("u"."id" = "c"."user_id")))
     LEFT JOIN ( SELECT "accounts"."user_id",
            "sum"("accounts"."totalCost") AS "total_account_costs"
           FROM "public"."accounts"
          GROUP BY "accounts"."user_id") "a" ON (("u"."id" = "a"."user_id")));


ALTER TABLE "public"."user_budget_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_impersonation_sessions"
    ADD CONSTRAINT "admin_impersonation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposits"
    ADD CONSTRAINT "deposits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_name_trgm" ON "public"."accounts" USING "gin" ("nameAccount" "public"."gin_trgm_ops");



CREATE INDEX "idx_accounts_user_cost" ON "public"."accounts" USING "btree" ("user_id", "totalCost" DESC);



CREATE INDEX "idx_accounts_user_created" ON "public"."accounts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_accounts_user_id" ON "public"."accounts" USING "btree" ("user_id");



CREATE INDEX "idx_admin_impersonation_active" ON "public"."admin_impersonation_sessions" USING "btree" ("admin_user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_admin_impersonation_sessions_admin_active" ON "public"."admin_impersonation_sessions" USING "btree" ("admin_user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_admin_impersonation_sessions_expires_at" ON "public"."admin_impersonation_sessions" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_campaigns_name_trgm" ON "public"."campaigns" USING "gin" ("campaignName" "public"."gin_trgm_ops");



CREATE INDEX "idx_campaigns_performance_metrics" ON "public"."campaigns" USING "btree" ("user_id", "amountSpent" DESC, "results" DESC) WHERE ("amountSpent" IS NOT NULL);



CREATE INDEX "idx_campaigns_user_budget" ON "public"."campaigns" USING "btree" ("user_id", "dailyBudget") WHERE ("dailyBudget" IS NOT NULL);



CREATE INDEX "idx_campaigns_user_date_performance" ON "public"."campaigns" USING "btree" ("user_id", "created_at" DESC, "status");



CREATE INDEX "idx_campaigns_user_id" ON "public"."campaigns" USING "btree" ("user_id");



CREATE INDEX "idx_campaigns_user_status" ON "public"."campaigns" USING "btree" ("user_id", "status");



CREATE INDEX "idx_deposits_latest" ON "public"."deposits" USING "btree" ("user_id", "created_at" DESC) WHERE ("type" IS NOT NULL);



CREATE INDEX "idx_deposits_user_date_type" ON "public"."deposits" USING "btree" ("user_id", "created_at" DESC, "type");



CREATE INDEX "idx_deposits_user_dateadded" ON "public"."deposits" USING "btree" ("user_id", "dateAdded");



CREATE INDEX "idx_deposits_user_id" ON "public"."deposits" USING "btree" ("user_id");



CREATE INDEX "idx_deposits_user_type_amount" ON "public"."deposits" USING "btree" ("user_id", "type", "amount") WHERE ("amount" IS NOT NULL);



CREATE INDEX "idx_impersonation_expiry" ON "public"."admin_impersonation_sessions" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role") WHERE ("role" IS NOT NULL);



CREATE OR REPLACE TRIGGER "update_admin_impersonation_sessions_updated_at" BEFORE UPDATE ON "public"."admin_impersonation_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_impersonation_sessions"
    ADD CONSTRAINT "admin_impersonation_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_impersonation_sessions"
    ADD CONSTRAINT "admin_impersonation_sessions_impersonated_user_id_fkey" FOREIGN KEY ("impersonated_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."deposits"
    ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Admins can manage impersonation sessions" ON "public"."admin_impersonation_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all sessions" ON "public"."admin_impersonation_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated users can read profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_full_access_accounts" ON "public"."accounts" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_full_access_campaigns" ON "public"."campaigns" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_full_access_deposits" ON "public"."deposits" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



ALTER TABLE "public"."admin_impersonation_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "all" ON "public"."settings" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deposits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_owns_accounts" ON "public"."accounts" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_owns_campaigns" ON "public"."campaigns" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_owns_deposits" ON "public"."deposits" TO "authenticated" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_impersonation_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_impersonation_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_impersonation_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_users_with_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_with_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_with_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_health_metrics"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_health_metrics"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_health_metrics"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_performance_analysis"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_analysis"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_performance_analysis"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_financial_summary"("target_user_id" "uuid", "months_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_financial_summary"("target_user_id" "uuid", "months_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_financial_summary"("target_user_id" "uuid", "months_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";



























GRANT ALL ON TABLE "public"."_snapshot_accounts_ownership" TO "anon";
GRANT ALL ON TABLE "public"."_snapshot_accounts_ownership" TO "authenticated";
GRANT ALL ON TABLE "public"."_snapshot_accounts_ownership" TO "service_role";



GRANT ALL ON TABLE "public"."_snapshot_campaigns_ownership" TO "anon";
GRANT ALL ON TABLE "public"."_snapshot_campaigns_ownership" TO "authenticated";
GRANT ALL ON TABLE "public"."_snapshot_campaigns_ownership" TO "service_role";



GRANT ALL ON TABLE "public"."_snapshot_deposits_ownership" TO "anon";
GRANT ALL ON TABLE "public"."_snapshot_deposits_ownership" TO "authenticated";
GRANT ALL ON TABLE "public"."_snapshot_deposits_ownership" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_impersonation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_impersonation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_impersonation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deposits" TO "anon";
GRANT ALL ON TABLE "public"."deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."deposits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deposits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deposits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deposits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_budget_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_budget_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_budget_summary" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";































