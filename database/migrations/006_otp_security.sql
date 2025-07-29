-- OTP Authentication & Security Tables

-- Create OTP codes table for email verification
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login attempts table for security monitoring
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create security settings table
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  login_alerts BOOLEAN DEFAULT TRUE,
  session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
  max_concurrent_sessions INTEGER DEFAULT 3,
  ip_whitelist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add security fields to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_expires ON otp_codes(email, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_verified ON otp_codes(verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_seller_active ON user_sessions(seller_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sellers_email_verified ON sellers(email, email_verified);

-- Create function to auto-cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS VOID AS $$
BEGIN
  DELETE FROM otp_codes 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  DELETE FROM login_attempts 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  UPDATE user_sessions 
  SET is_active = FALSE 
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to check rate limiting
CREATE OR REPLACE FUNCTION check_otp_rate_limit(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM otp_codes
  WHERE email = user_email 
  AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN recent_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate session
CREATE OR REPLACE FUNCTION validate_session(token TEXT)
RETURNS TABLE(seller_id UUID, is_valid BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.seller_id,
    (us.is_active AND us.expires_at > NOW()) as is_valid
  FROM user_sessions us
  WHERE us.session_token = token;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_activity on session use
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- Create RLS (Row Level Security) policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Policies for otp_codes (only allow access during verification)
CREATE POLICY "OTP codes are private" ON otp_codes
  USING (FALSE);

-- Policies for login_attempts (only allow inserts for logging)
CREATE POLICY "Login attempts are write-only" ON login_attempts
  FOR INSERT WITH CHECK (TRUE);

-- Policies for user_sessions (users can only see their own sessions)
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = seller_id::text);

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid()::text = seller_id::text);

-- Policies for security_settings (users can manage their own settings)
CREATE POLICY "Users can view own security settings" ON security_settings
  FOR SELECT USING (auth.uid()::text = seller_id::text);

CREATE POLICY "Users can update own security settings" ON security_settings
  FOR UPDATE USING (auth.uid()::text = seller_id::text);

-- Insert default security settings for existing sellers
INSERT INTO security_settings (seller_id)
SELECT id FROM sellers
WHERE id NOT IN (SELECT seller_id FROM security_settings WHERE seller_id IS NOT NULL);