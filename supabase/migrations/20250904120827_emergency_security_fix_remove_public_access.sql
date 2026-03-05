-- 🚨 EMERGENCY SECURITY FIX 🚨
-- Remove dangerous public access policies that expose sensitive financial data

-- Drop dangerous "Enable read access for all users" policies (PUBLIC ACCESS!)
DROP POLICY IF EXISTS "Enable read access for all users" ON accounts;
DROP POLICY IF EXISTS "Enable read access for all users" ON campaigns;
DROP POLICY IF EXISTS "Enable read access for all users" ON deposits;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Drop overly permissive "all" policies
DROP POLICY IF EXISTS "all" ON accounts;
DROP POLICY IF EXISTS "all" ON campaigns;
DROP POLICY IF EXISTS "all" ON deposits;

-- Temporarily restrict to admin only until migration is complete
-- This ensures no data access interruption while we add user_id columns
CREATE POLICY "emergency_admin_only_accounts" ON accounts FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "emergency_admin_only_campaigns" ON campaigns FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "emergency_admin_only_deposits" ON deposits FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');;
