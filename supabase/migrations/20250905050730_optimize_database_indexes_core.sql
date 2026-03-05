-- Core Database Index Optimization for Cache Migration
-- Essential indexes for optimal direct database query performance

-- =============================================================================
-- CAMPAIGNS TABLE OPTIMIZATION
-- =============================================================================

-- Composite index for user queries with date filtering (most common pattern)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_date_performance 
ON campaigns (user_id, created_at DESC, status);

-- Text search index for campaign names (using trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_campaigns_name_trgm 
ON campaigns USING gin ("campaignName" gin_trgm_ops);

-- Status filtering index (for active/inactive campaign queries)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status 
ON campaigns (user_id, status);

-- Performance metrics index for top campaign queries
CREATE INDEX IF NOT EXISTS idx_campaigns_performance_metrics 
ON campaigns (user_id, "amountSpent" DESC, results DESC) 
WHERE "amountSpent" IS NOT NULL;

-- Daily budget index for budget calculations
CREATE INDEX IF NOT EXISTS idx_campaigns_user_budget 
ON campaigns (user_id, "dailyBudget") 
WHERE "dailyBudget" IS NOT NULL;

-- =============================================================================
-- ACCOUNTS TABLE OPTIMIZATION
-- =============================================================================

-- Text search index for account names (using trigram similarity)
CREATE INDEX IF NOT EXISTS idx_accounts_name_trgm 
ON accounts USING gin ("nameAccount" gin_trgm_ops);

-- Composite index for user queries with cost sorting
CREATE INDEX IF NOT EXISTS idx_accounts_user_cost 
ON accounts (user_id, "totalCost" DESC);

-- Account management queries
CREATE INDEX IF NOT EXISTS idx_accounts_user_created 
ON accounts (user_id, created_at DESC);

-- =============================================================================
-- DEPOSITS TABLE OPTIMIZATION
-- =============================================================================

-- Composite index for user queries with date filtering and type
CREATE INDEX IF NOT EXISTS idx_deposits_user_date_type 
ON deposits (user_id, created_at DESC, type);

-- Financial calculations index (deposits vs withdrawals)
CREATE INDEX IF NOT EXISTS idx_deposits_user_type_amount 
ON deposits (user_id, type, amount) 
WHERE amount IS NOT NULL;

-- Date range queries for time period filtering (using dateAdded text field)
CREATE INDEX IF NOT EXISTS idx_deposits_user_dateadded 
ON deposits (user_id, "dateAdded");

-- Latest transactions index
CREATE INDEX IF NOT EXISTS idx_deposits_latest 
ON deposits (user_id, created_at DESC) 
WHERE type IS NOT NULL;

-- =============================================================================
-- PROFILES TABLE OPTIMIZATION
-- =============================================================================

-- Role-based queries index (for admin access checks)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles (role) 
WHERE role IS NOT NULL;;
