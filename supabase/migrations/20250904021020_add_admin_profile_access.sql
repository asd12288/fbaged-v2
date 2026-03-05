-- Allow admins to read all profiles for impersonation functionality
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT
  USING (
    -- Allow if user is reading their own profile (existing functionality)
    id = auth.uid()
    OR
    -- Allow if user is an admin (for impersonation)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );;
