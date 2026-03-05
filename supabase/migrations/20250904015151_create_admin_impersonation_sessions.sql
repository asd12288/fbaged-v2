-- Create admin impersonation sessions table
CREATE TABLE admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  impersonated_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '8 hours'),
  is_active BOOLEAN DEFAULT true,
  session_metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_admin_impersonation_active 
ON admin_impersonation_sessions(admin_user_id, is_active) 
WHERE is_active = true;

CREATE INDEX idx_impersonation_expiry 
ON admin_impersonation_sessions(expires_at) 
WHERE is_active = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_impersonation_sessions_updated_at
BEFORE UPDATE ON admin_impersonation_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE admin_impersonation_sessions IS 'Tracks active admin user impersonation sessions for secure user context switching';;
