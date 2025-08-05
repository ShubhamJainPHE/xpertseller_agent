import { createClient } from '@supabase/supabase-js'

async function testTableDiscovery() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  
  console.log('🔍 Testing table discovery...')
  
  // Test a few known tables
  const testTables = [
    'sellers', 'products', 'orders', 'order_items', 'fba_inventory', 
    'financial_events', 'pricing', 'reports', 'listings', 'notifications',
    'oauth_tokens', 'brand_analytics', 'pricing_history', 'shipping_labels',
    'api_error_logs', 'marketplace_configs', 'catalog_items'
  ]
  
  const existingTables: string[] = []
  
  for (const tableName of testTables) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(1)
      if (!error) {
        existingTables.push(tableName)
        console.log(`✅ ${tableName}`)
      } else {
        console.log(`❌ ${tableName} - ${error.message}`)
      }
    } catch (e) {
      console.log(`❌ ${tableName} - Exception: ${e}`)
    }
  }
  
  console.log(`\n📊 Found ${existingTables.length} existing tables:`)
  existingTables.forEach(table => console.log(`  • ${table}`))
  
  return existingTables
}

testTableDiscovery().catch(console.error)