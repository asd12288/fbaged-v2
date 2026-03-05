-- Fix type mismatch in get_monthly_financial_summary function
DROP FUNCTION get_monthly_financial_summary(uuid, integer);

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
$$;;
