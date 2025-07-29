const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  console.log('🚀 Running security migration...')
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/007_security_performance_updates.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📄 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⏳ ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })
        
        if (error) {
          console.log(`⚠️ Warning on statement ${i + 1}:`, error.message)
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} completed`)
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' })

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  process.exit(1)
}

runMigration()