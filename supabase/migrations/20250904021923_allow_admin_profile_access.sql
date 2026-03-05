-- Add policy to allow admin users to read all profiles
CREATE POLICY "Admin users can read all profiles" ON profiles
FOR SELECT USING (
  auth.uid() = id OR  -- Users can read their own profile
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);;
