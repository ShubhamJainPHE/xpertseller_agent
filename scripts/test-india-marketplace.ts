// Test SP-API connectivity with India marketplace
import { supabaseAdmin } from '../lib/database/connection'
import { createSPApiService } from '../lib/services/sp-api'

async function testIndiaMarketplace() {
  console.log('🧪 Testing SP-API connectivity with India marketplace...')
  
  // Get seller with updated India marketplace
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, marketplace_ids')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  console.log('👤 Testing with seller:', seller.email)
  console.log('🏷️ Amazon Seller ID:', seller.amazon_seller_id)
  console.log('🌐 Marketplace ID:', seller.marketplace_ids[0])
  
  try {
    // Create SP-API service with India configuration
    const spApi = await createSPApiService(seller.id)
    
    if (!spApi) {
      console.log('❌ Failed to create SP-API service')
      return
    }
    
    console.log('✅ SP-API service created with India configuration')
    
    // Test credentials validation
    const validation = await spApi.validateCredentials()
    console.log('🔑 Credential validation:', validation.valid ? '✅ VALID' : '❌ INVALID')
    
    if (!validation.valid) {
      console.log('❌ Error:', validation.error)
      return
    }
    
    // Test basic SP-API call - get all listings
    console.log('📋 Testing getAllListings() with India marketplace...')
    const listings = await spApi.getAllListings()
    
    console.log('✅ SUCCESS! SP-API call completed')
    console.log('📦 Response structure:', Object.keys(listings))
    
    if (listings.items) {
      console.log('📋 Found listings:', listings.items.length)
      if (listings.items.length > 0) {
        console.log('📄 First listing:', JSON.stringify(listings.items[0], null, 2))
      }
    } else {
      console.log('📭 No items in response')
      console.log('📋 Full response:', JSON.stringify(listings, null, 2))
    }
    
  } catch (error) {
    console.error('❌ SP-API test failed:', error.message)
    return
  }
}

testIndiaMarketplace().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })