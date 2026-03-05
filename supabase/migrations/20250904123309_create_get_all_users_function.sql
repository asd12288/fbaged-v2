-- Create a function to get all users with email data for admin use
-- This function can access both public.profiles and auth.users safely

CREATE OR REPLACE FUNCTION get_all_users_with_auth()
RETURNS TABLE (
    id UUID,
    username TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    email TEXT,
    last_sign_in_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.role,
        p.created_at,
        au.email,
        au.last_sign_in_at,
        au.email_confirmed_at
    FROM profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
END;
$$;;
