-- Bridge Fix: Map existing user_sessions to active_sessions interface
-- This fixes the authentication issue without breaking existing code

-- Create a view to map user_sessions to active_sessions structure
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  session_token as session_id,
  seller_id,
  s.email,
  created_at as login_time,
  ip_address,
  user_agent,
  expires_at,
  created_at
FROM user_sessions us
JOIN sellers s ON us.seller_id = s.id
WHERE is_active = true AND expires_at > NOW();

-- Create indexes on the underlying table for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup 
ON user_sessions(session_token, is_active, expires_at) 
WHERE is_active = true;

-- Grant necessary permissions
GRANT SELECT ON active_sessions TO authenticated;
GRANT SELECT ON active_sessions TO anon;