import { DataIngestionService } from '../lib/jobs/data-ingestion'
import { supabaseAdmin } from '../lib/database/connection'

async function testComprehensiveSync() {
  console.log('🧪 Testing comprehensive SP-API data sync...')
  
  try {
    // Get one test seller
    const { data: sellers, error } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, sp_api_credentials, onboarding_completed')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
      .limit(1)
    
    if (error) {
      console.error('❌ Failed to fetch test seller:', error)
      return
    }
    
    if (!sellers || sellers.length === 0) {
      console.log('📭 No active sellers found for testing')
      return
    }
    
    const testSeller = sellers[0]
    console.log(`🧪 Testing with seller: ${testSeller.email} (${testSeller.amazon_seller_id})`)
    
    // Check credentials
    const credentials = testSeller.sp_api_credentials as any
    if (!credentials || credentials.needsAuth) {
      console.log(`⚠️ Seller ${testSeller.email} needs authentication - skipping`)
      return
    }
    
    console.log('🔑 Credentials validated, starting comprehensive sync...')
    
    // Record start time
    const startTime = Date.now()
    
    // Test the new comprehensive sync
    await DataIngestionService.syncSellerData(testSeller.id)
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log(`⏱️ Sync completed in ${duration} seconds`)
    
    // Check results
    await checkSyncResults(testSeller.id, testSeller.email)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function checkSyncResults(sellerId: string, email: string) {
  console.log(`\n📊 Checking sync results for ${email}...`)
  
  try {
    // Check products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, asin, title, current_price, stock_level, is_fba')
      .eq('seller_id', sellerId)
      .limit(10)
    
    console.log(`📦 Products synced: ${products?.length || 0}`)
    if (products && products.length > 0) {
      console.log('📋 Sample products:')
      products.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.asin} - ${product.title?.substring(0, 50)}... ($${product.current_price}) [${product.is_fba ? 'FBA' : 'FBM'}]`)
      })
    }
    
    // Check sales data - Fixed SQL injection vulnerability
    const productIds = products?.map(p => p.id) || []
    let sales: any[] = []
    
    if (productIds.length > 0) {
      const { data: salesData } = await supabaseAdmin
        .from('sales_data')
        .select('date, revenue, units_sold')
        .in('product_id', productIds)
        .order('date', { ascending: false })
        .limit(5)
      
      sales = salesData || []
    }
    
    console.log(`💰 Sales records: ${sales?.length || 0}`)
    if (sales && sales.length > 0) {
      console.log('📈 Recent sales:')
      sales.forEach((sale, index) => {
        console.log(`  ${index + 1}. ${sale.date}: $${sale.revenue} (${sale.units_sold} units)`)
      })
    }
    
    // Check fact stream events
    const { data: events } = await supabaseAdmin
      .from('fact_stream')
      .select('event_type, event_category, created_at, importance_score')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`📝 Fact stream events: ${events?.length || 0}`)
    if (events && events.length > 0) {
      console.log('🔄 Recent events:')
      events.slice(0, 5).forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.event_type} (${event.event_category}) - Score: ${event.importance_score}`)
      })
    }
    
    // Summary
    console.log('\n📊 SYNC SUMMARY:')
    console.log(`✅ Products: ${products?.length || 0}`)
    console.log(`✅ Sales records: ${sales?.length || 0}`) 
    console.log(`✅ Events logged: ${events?.length || 0}`)
    
    if ((products?.length || 0) > 0 || (events?.length || 0) > 0) {
      console.log('🎉 Comprehensive sync test SUCCESSFUL!')
    } else {
      console.log('⚠️ No data synced - may indicate API permission issues')
    }
    
  } catch (error) {
    console.error('❌ Failed to check sync results:', error)
  }
}

// Run the test
testComprehensiveSync()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch(e => {
    console.error('\n❌ Test failed:', e)
    process.exit(1)
  })