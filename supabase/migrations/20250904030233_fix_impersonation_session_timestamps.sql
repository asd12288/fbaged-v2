-- Fix timestamp columns to use timestamptz (timestamp with time zone) for proper timezone handling
-- This ensures consistent behavior across different timezones and prevents session expiry issues

ALTER TABLE admin_impersonation_sessions 
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- Update default values to use proper timezone-aware functions
ALTER TABLE admin_impersonation_sessions 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '8 hours');

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_admin_impersonation_sessions_admin_active 
  ON admin_impersonation_sessions(admin_user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_admin_impersonation_sessions_expires_at 
  ON admin_impersonation_sessions(expires_at) 
  WHERE is_active = true;

-- Add a cleanup function to remove expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  UPDATE admin_impersonation_sessions 
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND expires_at <= now();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_impersonation_sessions() TO authenticated;;
