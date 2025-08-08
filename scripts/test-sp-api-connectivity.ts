// Test SP-API connectivity with real seller
import { createSPApiService } from '../lib/services/sp-api'
import { supabaseAdmin } from '../lib/database/connection'

async function testSPAPIConnectivity() {
  console.log('🔌 Testing SP-API connectivity...')
  
  try {
    // Get first active seller
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
      .limit(1)
    
    if (!sellers || sellers.length === 0) {
      console.log('❌ No active sellers found')
      return
    }
    
    const seller = sellers[0]
    console.log(`📊 Testing with seller: ${seller.email}`)
    console.log(`🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
    
    // Create SP-API service
    console.log('\n🔧 Creating SP-API service...')
    const spApi = await createSPApiService(seller.id)
    
    if (!spApi) {
      console.log('❌ Failed to create SP-API service')
      return
    }
    
    console.log('✅ SP-API service created successfully')
    
    // Test 1: Validate credentials
    console.log('\n🔐 Testing credential validation...')
    const credValidation = await spApi.validateCredentials()
    
    if (credValidation.valid) {
      console.log('✅ SP-API credentials are valid')
    } else {
      console.log('❌ SP-API credentials validation failed:', credValidation.error)
      return
    }
    
    // Test 2: Get basic inventory summary (lightweight test)
    console.log('\n📦 Testing inventory summary fetch...')
    try {
      const inventory = await spApi.getInventorySummary()
      console.log(`✅ Successfully fetched inventory for ${inventory.length} items`)
      
      if (inventory.length > 0) {
        console.log('📋 Sample inventory item:')
        console.log(`   ASIN: ${inventory[0].asin}`)
        console.log(`   SKU: ${inventory[0].sellerSku}`)
        console.log(`   Quantity: ${inventory[0].totalQuantity}`)
      }
    } catch (invError) {
      console.log('⚠️ Inventory fetch failed:', invError.message)
    }
    
    // Test 3: Get orders (last 7 days)
    console.log('\n🛒 Testing orders fetch...')
    try {
      const orders = await spApi.getOrders()
      console.log(`✅ Successfully fetched ${orders.length} orders`)
      
      if (orders.length > 0) {
        console.log('📋 Sample order:')
        console.log(`   Order ID: ${orders[0].AmazonOrderId}`)
        console.log(`   Status: ${orders[0].OrderStatus}`)
        console.log(`   Total: ${orders[0].OrderTotal?.Amount || 'N/A'} ${orders[0].OrderTotal?.CurrencyCode || ''}`)
      }
    } catch (ordersError) {
      console.log('⚠️ Orders fetch failed:', ordersError.message)
    }
    
    console.log('\n🎉 SP-API connectivity test completed!')
    console.log('✅ Ready to run comprehensive data sync')
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', error)
  }
}

testSPAPIConnectivity().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })