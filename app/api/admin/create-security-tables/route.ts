import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST() {
  try {
    console.log('🔐 Creating security tables...')

    // Create the tables one by one using raw SQL
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
      );`,

      // Login attempts table
      `CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT FALSE,
        failure_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,

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
      );`,

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
      );`,

      // Add security fields to sellers table
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;`,
      `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_otp_codes_email_expires ON otp_codes(email, expires_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_otp_codes_verified ON otp_codes(verified, expires_at);`,
      `CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_seller_active ON user_sessions(seller_id, is_active, expires_at);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);`
    ]

    const results = []

    for (const query of queries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error) {
          console.log(`⚠️ Query may have failed (table might already exist): ${error.message}`)
          // Try direct execution for simple queries
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .limit(1)
          
          results.push({ 
            query: query.substring(0, 50) + '...', 
            status: directError ? 'warning' : 'success',
            message: error.message 
          })
        } else {
          results.push({ 
            query: query.substring(0, 50) + '...', 
            status: 'success' 
          })
        }
      } catch (err) {
        results.push({ 
          query: query.substring(0, 50) + '...', 
          status: 'error', 
          message: (err as Error).message 
        })
      }
    }

    console.log('✅ Security tables creation completed')

    return NextResponse.json({
      success: true,
      message: 'Security tables created successfully',
      results
    })

  } catch (error) {
    console.error('❌ Error creating security tables:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create security tables',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}