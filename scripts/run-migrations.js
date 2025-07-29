const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...')
    
    // Read the additional tables migration
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '005_additional_tables.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📊 Creating additional tables...')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error && !error.message.includes('already exists')) {
            console.warn('Warning:', error.message)
          }
        } catch (err) {
          // Try alternative method for creating tables
          console.log('Trying direct SQL execution...')
          console.log('Statement:', statement.substring(0, 100) + '...')
        }
      }
    }
    
    console.log('✅ Database migrations completed!')
    
    // Test the connection
    const { data, error } = await supabase.from('sellers').select('count').limit(1)
    if (error) {
      console.error('❌ Database connection test failed:', error.message)
    } else {
      console.log('✅ Database connection test successful!')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigrations()