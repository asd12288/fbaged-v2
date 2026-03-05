-- Fix type mismatch in get_budget_health_metrics function
DROP FUNCTION get_budget_health_metrics(uuid);

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
$$;;
