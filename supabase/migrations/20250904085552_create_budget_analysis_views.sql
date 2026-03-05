-- Create comprehensive budget analysis views and functions

-- 1. User Budget Summary View
CREATE OR REPLACE VIEW user_budget_summary AS
SELECT 
  u.id as user_id,
  COALESCE(d.total_deposits, 0) as total_deposits,
  COALESCE(c.total_campaign_spend, 0) as total_campaign_spend,
  COALESCE(a.total_account_costs, 0) as total_account_costs,
  COALESCE(d.total_deposits, 0) - 
    COALESCE(c.total_campaign_spend, 0) - 
    COALESCE(a.total_account_costs, 0) as available_balance,
  c.active_daily_budget,
  c.total_daily_budget,
  c.active_campaigns_count,
  c.paused_campaigns_count,
  c.canceled_campaigns_count,
  d.last_deposit_date,
  c.last_campaign_date
FROM auth.users u
LEFT JOIN (
  SELECT 
    user_id, 
    SUM(amount) as total_deposits,
    MAX(created_at) as last_deposit_date
  FROM deposits 
  GROUP BY user_id
) d ON u.id = d.user_id
LEFT JOIN (
  SELECT 
    user_id, 
    SUM(COALESCE("amountSpent", 0)) as total_campaign_spend,
    SUM(CASE WHEN status = 'Active' THEN "dailyBudget" ELSE 0 END) as active_daily_budget,
    SUM("dailyBudget") as total_daily_budget,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_campaigns_count,
    COUNT(CASE WHEN status = 'Paused' THEN 1 END) as paused_campaigns_count,
    COUNT(CASE WHEN status = 'Canceled' THEN 1 END) as canceled_campaigns_count,
    MAX(created_at) as last_campaign_date
  FROM campaigns 
  GROUP BY user_id
) c ON u.id = c.user_id
LEFT JOIN (
  SELECT 
    user_id, 
    SUM("totalCost") as total_account_costs
  FROM accounts 
  GROUP BY user_id
) a ON u.id = a.user_id;

-- Enable RLS on the view
ALTER VIEW user_budget_summary OWNER TO postgres;

-- 2. Monthly Financial Summary Function
CREATE OR REPLACE FUNCTION get_monthly_financial_summary(
  target_user_id uuid DEFAULT auth.uid(),
  months_back integer DEFAULT 12
)
RETURNS TABLE(
  month_year text,
  month_date date,
  total_deposits double precision,
  campaign_spend double precision,
  account_costs double precision,
  net_cashflow double precision,
  campaigns_launched bigint,
  avg_cpm double precision,
  avg_cpc double precision
) 
LANGUAGE plpgsql
SECURITY DEFINER
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
    COALESCE(SUM(d.amount), 0) as total_deposits,
    COALESCE(SUM(c."amountSpent"), 0) as campaign_spend,
    COALESCE(SUM(a."totalCost"), 0) as account_costs,
    COALESCE(SUM(d.amount), 0) - COALESCE(SUM(c."amountSpent"), 0) - COALESCE(SUM(a."totalCost"), 0) as net_cashflow,
    COUNT(c.id) as campaigns_launched,
    AVG(c.cpm) as avg_cpm,
    AVG(c.cpc) as avg_cpc
  FROM monthly_data md
  LEFT JOIN deposits d ON TO_CHAR(d.created_at, 'YYYY-MM') = md.month_year AND d.user_id = target_user_id
  LEFT JOIN campaigns c ON TO_CHAR(c.created_at, 'YYYY-MM') = md.month_year AND c.user_id = target_user_id
  LEFT JOIN accounts a ON TO_CHAR(a.created_at, 'YYYY-MM') = md.month_year AND a.user_id = target_user_id
  GROUP BY md.month_year, md.month_date
  ORDER BY md.month_date;
END;
$$;

-- 3. Campaign Performance Analysis Function
CREATE OR REPLACE FUNCTION get_campaign_performance_analysis(
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  campaign_name text,
  status text,
  amount_spent double precision,
  daily_budget bigint,
  results bigint,
  impressions bigint,
  clicks bigint,
  cpm double precision,
  cpc double precision,
  ctr double precision,
  cost_per_result double precision,
  efficiency_score double precision,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 4. Budget Health Check Function
CREATE OR REPLACE FUNCTION get_budget_health_metrics(
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  total_balance double precision,
  monthly_burn_rate double precision,
  estimated_runway_months double precision,
  active_campaign_spend_rate double precision,
  budget_utilization_rate double precision,
  avg_campaign_roi double precision
) 
LANGUAGE plpgsql
SECURITY DEFINER
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
      ubs.available_balance,
      ubs.active_daily_budget,
      ubs.total_campaign_spend,
      ubs.total_deposits,
      -- Calculate recent spending trend
      (SELECT COALESCE(SUM(c."amountSpent"), 0) 
       FROM campaigns c 
       WHERE c.user_id = target_user_id 
         AND c.created_at >= NOW() - INTERVAL '30 days') as last_30_days_spend,
      -- Calculate average ROI
      (SELECT AVG(
         CASE 
           WHEN c."amountSpent" > 0 AND c.results > 0 
           THEN c.results / c."amountSpent" 
           ELSE 0 
         END
       ) 
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
      THEN bm.available_balance / bm.last_30_days_spend 
      ELSE NULL 
    END as estimated_runway_months,
    bm.active_daily_budget as active_campaign_spend_rate,
    CASE 
      WHEN bm.total_deposits > 0 
      THEN (bm.total_campaign_spend / bm.total_deposits) * 100 
      ELSE 0 
    END as budget_utilization_rate,
    COALESCE(bm.avg_roi, 0) as avg_campaign_roi
  FROM budget_metrics bm;
END;
$$;;
