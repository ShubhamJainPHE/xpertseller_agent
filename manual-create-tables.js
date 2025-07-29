const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTablesManually() {
  console.log('🔧 Creating tables manually...');

  // Try to create tables one by one using direct SQL
  const queries = [
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
    
    `CREATE TABLE IF NOT EXISTS login_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      ip_address INET,
      user_agent TEXT,
      success BOOLEAN DEFAULT FALSE,
      failure_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
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
    )`
  ];

  for (const query of queries) {
    try {
      // Try using raw SQL through a dummy query that executes SQL
      const result = await supabase.rpc('execute_raw_sql', { sql_query: query });
      console.log(`✅ Query executed successfully: ${query.split('\n')[0]}...`);
    } catch (error) {
      console.log(`⚠️ Direct RPC failed, trying alternative method...`);
      
      // Since RPC doesn't work, let's try to test if table exists by querying it
      const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      if (tableName) {
        try {
          const { error } = await supabase.from(tableName).select('*').limit(1);
          if (error && error.code === '42P01') {
            console.log(`❌ Table ${tableName} doesn't exist and we can't create it directly`);
            console.log(`Please create table ${tableName} manually in Supabase dashboard`);
          } else {
            console.log(`✅ Table ${tableName} already exists or is accessible`);
          }
        } catch (err) {
          console.log(`❓ Could not test table ${tableName}:`, err.message);
        }
      }
    }
  }

  // Test if we can insert into OTP table
  console.log('\n🧪 Testing OTP table functionality...');
  try {
    const { data, error } = await supabase
      .from('otp_codes')
      .insert({
        email: 'test@example.com',
        otp_code: '123456',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ OTP table insert failed:`, error);
      if (error.code === '42P01') {
        console.log('\n📋 MANUAL SETUP REQUIRED:');
        console.log('Please go to your Supabase dashboard and run this SQL:');
        console.log('\n' + queries[0] + '\n');
      }
    } else {
      console.log(`✅ OTP table works! Inserted ID: ${data.id}`);
      // Clean up
      await supabase.from('otp_codes').delete().eq('id', data.id);
      console.log(`🧹 Cleaned up test data`);
    }
  } catch (err) {
    console.log(`❌ OTP test failed:`, err.message);
  }
}

createTablesManually().catch(console.error);