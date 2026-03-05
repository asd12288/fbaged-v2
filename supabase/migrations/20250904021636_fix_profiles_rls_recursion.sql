-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Create a simple policy that allows users to read their own profile
-- and lets service role access everything for admin operations
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Create a separate policy for admin operations (will be handled by service role)
CREATE POLICY "Service role can manage all profiles" ON profiles
FOR ALL USING (auth.role() = 'service_role');;
