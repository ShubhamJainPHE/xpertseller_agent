import { config } from 'dotenv'
import { supabaseAdmin } from '../lib/database/connection'

// Load environment variables
config({ path: '.env.local' })

async function querySellers() {
  try {
    console.log('🔍 Querying all entries from sellers table...')
    
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log('📭 No entries found in sellers table')
    } else {
      console.log(`📊 Found ${data.length} entries in sellers table:`)
      console.log(JSON.stringify(data, null, 2))
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to query sellers table:', error)
    process.exit(1)
  }
}

querySellers()