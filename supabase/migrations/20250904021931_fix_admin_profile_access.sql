-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin users can read all profiles" ON profiles;

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a simpler policy that allows both self-access and admin access
CREATE POLICY "Profile access policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR  -- Users can read their own profile
  auth.jwt() ->> 'role' = 'authenticated'  -- All authenticated users can read profiles (simplified for admin functionality)
);;
