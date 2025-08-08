import { config } from 'dotenv'
import { supabaseAdmin } from '../lib/database/connection'

// Load environment variables
config({ path: '.env.local' })

async function clearSellers() {
  try {
    console.log('🔄 Clearing all entries from sellers table...')
    
    const { error } = await supabaseAdmin
      .from('sellers')
      .delete()
      .gt('created_at', '1900-01-01') // This ensures we delete all records
    
    if (error) {
      throw error
    }
    
    console.log('✅ Successfully cleared all sellers table entries')
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to clear sellers table:', error)
    process.exit(1)
  }
}

clearSellers()