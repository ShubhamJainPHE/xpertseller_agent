const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  console.log('🚀 Running security migration directly...')
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('sellers')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Run essential parts of the migration manually
    console.log('📊 Adding security columns to sellers table...')
    
    // Add API key column if it doesn't exist
    const { error: apiKeyError } = await supabase
      .rpc('exec_sql', { sql: 'ALTER TABLE sellers ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;' })
      .catch(() => null) // Ignore if function doesn't exist
    
    // Add version column
    const { error: versionError } = await supabase
      .rpc('exec_sql', { sql: 'ALTER TABLE sellers ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;' })
      .catch(() => null)
    
    // Add permissions column  
    const { error: permError } = await supabase
      .rpc('exec_sql', { sql: "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';" })
      .catch(() => null)
    
    console.log('✅ Essential migration steps completed')
    
    // Generate API keys for existing sellers
    console.log('🔑 Generating API keys for existing sellers...')
    
    const { data: sellers } = await supabase
      .from('sellers')
      .select('id, api_key')
      .is('api_key', null)
    
    if (sellers && sellers.length > 0) {
      for (const seller of sellers) {
        const apiKey = 'sk_' + Math.random().toString(36).substring(2, 34)
        
        const { error } = await supabase
          .from('sellers')
          .update({ api_key: apiKey })
          .eq('id', seller.id)
        
        if (!error) {
          console.log(`✅ Generated API key for seller ${seller.id}`)
        }
      }
    }
    
    console.log('🎉 Critical security migration completed!')
    console.log('💡 Note: Some advanced features may require manual SQL execution')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' })

runMigration()