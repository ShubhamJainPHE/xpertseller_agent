-- Migration: Update sellers table for new onboarding flow
-- Description: Add fields for the new login-first onboarding flow

-- Add new fields to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS amazon_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS amazon_connection_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS oauth_tokens JSONB;

-- Update existing records to have default values
UPDATE sellers 
SET amazon_connected = CASE 
  WHEN sp_api_credentials IS NOT NULL AND sp_api_credentials != '{}' THEN TRUE 
  ELSE FALSE 
END
WHERE amazon_connected IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sellers_amazon_connected ON sellers(amazon_connected);
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_phone ON sellers(phone_number);

-- Add comments for documentation
COMMENT ON COLUMN sellers.full_name IS 'Full name of the seller';
COMMENT ON COLUMN sellers.phone_number IS 'Phone number for contact';
COMMENT ON COLUMN sellers.amazon_connected IS 'Whether Amazon account is connected';
COMMENT ON COLUMN sellers.amazon_connection_time IS 'When Amazon account was connected';
COMMENT ON COLUMN sellers.oauth_tokens IS 'Encrypted OAuth tokens from Amazon';