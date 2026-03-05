-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profile access policy" ON profiles;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data ->> 'role' = 'admin'
  );
$$;

-- Create policy using the function
CREATE POLICY "Users can read own profile or admin can read all" ON profiles
FOR SELECT USING (
  auth.uid() = id OR auth.is_admin()
);;
