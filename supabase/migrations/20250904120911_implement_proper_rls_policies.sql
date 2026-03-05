-- Implement proper Row Level Security policies for multi-user isolation
-- Replace emergency policies with final user-based access control

-- Drop emergency policies first
DROP POLICY IF EXISTS "emergency_admin_only_accounts" ON accounts;
DROP POLICY IF EXISTS "emergency_admin_only_campaigns" ON campaigns;
DROP POLICY IF EXISTS "emergency_admin_only_deposits" ON deposits;

-- ACCOUNTS TABLE POLICIES
-- Users can only see/modify their own accounts
CREATE POLICY "user_owns_accounts" ON accounts FOR ALL TO authenticated 
USING (user_id = auth.uid());

-- Admins can see/modify all accounts (for oversight and management)
CREATE POLICY "admin_full_access_accounts" ON accounts FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- CAMPAIGNS TABLE POLICIES  
-- Users can only see/modify their own campaigns
CREATE POLICY "user_owns_campaigns" ON campaigns FOR ALL TO authenticated 
USING (user_id = auth.uid());

-- Admins can see/modify all campaigns (for oversight and management)
CREATE POLICY "admin_full_access_campaigns" ON campaigns FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- DEPOSITS TABLE POLICIES
-- Users can only see/modify their own deposits
CREATE POLICY "user_owns_deposits" ON deposits FOR ALL TO authenticated 
USING (user_id = auth.uid());

-- Admins can see/modify all deposits (for financial oversight)
CREATE POLICY "admin_full_access_deposits" ON deposits FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Clean up: Remove duplicate campaigns table as mentioned in analysis
DROP TABLE IF EXISTS campaigns_duplicate;;
