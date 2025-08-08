import { supabaseAdmin } from './lib/database/connection'

async function createSessionsTable() {
  console.log('🚀 CREATING ACTIVE_SESSIONS TABLE')
  console.log('=================================\n')
  
  try {
    // Method 1: Try to insert the table creation via raw SQL
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')  
      .select('table_name')
      .eq('table_name', 'active_sessions')
      .eq('table_schema', 'public')
    
    if (data && data.length > 0) {
      console.log('✅ active_sessions table already exists!')
    } else {
      console.log('❌ Table does not exist')
      console.log('\n📋 MANUAL CREATION REQUIRED:')
      console.log('Go to your Supabase Dashboard → SQL Editor and run:')
      console.log('\n' + '='.repeat(60))
      console.log(`
CREATE TABLE active_sessions (
  session_id VARCHAR PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  email VARCHAR,
  login_time TIMESTAMPTZ,
  ip_address VARCHAR,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON active_sessions TO authenticated;
GRANT ALL ON active_sessions TO service_role;

-- Create index for performance
CREATE INDEX idx_active_sessions_seller_id ON active_sessions(seller_id);
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);
      `)
      console.log('='.repeat(60))
    }
    
    // Test if we can access sellers table to verify connection
    const { data: testSellers } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .limit(1)
    
    if (testSellers) {
      console.log(`\n✅ Database connection working (${testSellers.length} seller found)`)
    }
    
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

createSessionsTable().then(() => process.exit(0))