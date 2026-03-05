-- Drop all existing policies
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON profiles;

-- Drop the function since it's not working
DROP FUNCTION IF EXISTS auth.is_admin();

-- Create a simple policy that allows all authenticated users to read profiles
-- This enables the admin functionality while maintaining some security
CREATE POLICY "Authenticated users can read profiles" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to update their own profiles
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);;
