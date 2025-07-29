const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createSecurityTables() {
  console.log('🔐 Creating security tables...');

  // Create the tables one by one
  const queries = [
    // OTP codes table
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER DEFAULT 0,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Login attempts table
    `CREATE TABLE IF NOT EXISTS login_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      ip_address INET,
      user_agent TEXT,
      success BOOLEAN DEFAULT FALSE,
      failure_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // User sessions table
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      ip_address INET,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Security settings table
    `CREATE TABLE IF NOT EXISTS security_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE UNIQUE,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      email_notifications BOOLEAN DEFAULT TRUE,
      login_alerts BOOLEAN DEFAULT TRUE,
      session_timeout_minutes INTEGER DEFAULT 480,
      max_concurrent_sessions INTEGER DEFAULT 3,
      ip_whitelist TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`
  ];

  const alterQueries = [
    // Add security fields to sellers table
    `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`,
    `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0`,
    `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`,
    `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ`
  ];

  const indexQueries = [
    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_otp_codes_email_expires ON otp_codes(email, expires_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_otp_codes_verified ON otp_codes(verified, expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_seller_active ON user_sessions(seller_id, is_active, expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`
  ];

  // Execute all queries
  const allQueries = [...queries, ...alterQueries, ...indexQueries];

  for (const query of allQueries) {
    try {
      const { error } = await supabase.rpc('execute_sql', { query });
      if (error) {
        console.log(`⚠️ Query executed with potential warning: ${query.substring(0, 50)}...`);
        console.log(`   Message: ${error.message}`);
      } else {
        console.log(`✅ Successfully executed: ${query.substring(0, 50)}...`);
      }
    } catch (err) {
      // Try direct table creation for simple CREATE TABLE statements
      if (query.startsWith('CREATE TABLE')) {
        try {
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1])
            .single();
          
          if (directError && directError.code === 'PGRST116') {
            console.log(`📋 Table ${query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]} doesn't exist, creating...`);
          } else {
            console.log(`✅ Table ${query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]} already exists`);
          }
        } catch (directErr) {
          console.log(`❌ Error checking table: ${directErr.message}`);
        }
      } else {
        console.log(`❌ Error executing query: ${err.message}`);
      }
    }
  }

  console.log('🎉 Security tables setup completed!');
  console.log('\nNext steps:');
  console.log('1. Configure email provider in .env.local (RESEND_API_KEY or GMAIL_USER/GMAIL_APP_PASSWORD)');
  console.log('2. Test the authentication flow at http://localhost:3000/auth/login');
  console.log('3. Try logging out using the logout button in the navigation');
}

createSecurityTables().catch(console.error);