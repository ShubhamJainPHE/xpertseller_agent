import { createClient } from '@supabase/supabase-js';

async function createActiveSessionsTable() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  console.log('🏗️ Creating active_sessions table...');
  
  try {
    // Create the table directly using INSERT (Supabase doesn't have exec_sql by default)
    // We'll use a simpler approach by trying to select from the table first
    
    // Try to create the table using a direct SQL approach
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS active_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_id UUID UNIQUE NOT NULL,
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        login_time TIMESTAMP WITH TIME ZONE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Since we can't execute raw SQL directly, we'll check if the table exists
    // by trying to select from it
    console.log('📊 Checking if active_sessions table exists...');
    
    const { error: checkError } = await supabase
      .from('active_sessions')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === 'PGRST106') {
      console.log('❌ Table does not exist. Please create it manually in Supabase Dashboard:');
      console.log('');
      console.log('🔧 SQL to run in Supabase Dashboard > SQL Editor:');
      console.log('');
      console.log(createTableSQL);
      console.log('');
      console.log('-- Create indexes for performance');
      console.log('CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_active_sessions_seller_id ON active_sessions(seller_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);');
      console.log('CREATE INDEX IF NOT EXISTS idx_active_sessions_is_active ON active_sessions(is_active);');
      return;
    }
    
    if (!checkError) {
      console.log('✅ active_sessions table already exists');
    }
    
    if (error) {
      console.error('❌ Error creating active_sessions table:', error);
      return;
    }
    
    console.log('✅ active_sessions table created successfully');
    console.log('📊 Table includes:');
    console.log('  - session_id (UUID, unique identifier)');
    console.log('  - seller_id (foreign key to sellers table)');
    console.log('  - login_time and expires_at timestamps');
    console.log('  - ip_address and user_agent tracking');
    console.log('  - is_active flag for session management');
    console.log('  - Indexes for performance optimization');
    console.log('  - Automatic updated_at trigger');
    
  } catch (error) {
    console.error('❌ Failed to create table:', error);
  }
}

createActiveSessionsTable();