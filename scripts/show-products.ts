import { createSPApiService } from '../lib/services/sp-api'
import { supabaseAdmin } from '../lib/database/connection'

async function showProductDetails() {
  console.log('🔍 FETCHING DETAILED PRODUCT INFORMATION...')
  
  // Get seller
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
    
  if (!seller) {
    console.log('❌ Seller not found')
    return
  }
  
  // Create SP-API service
  const spApi = await createSPApiService(seller.id)
  
  if (!spApi) {
    console.log('❌ Failed to create SP-API service')
    return
  }
  
  try {
    console.log('📋 Fetching all listings with detailed information...')
    const listings = await spApi.getAllListings()
    
    console.log('\n🎯 FOUND PRODUCTS:')
    console.log('Total results:', listings.numberOfResults || 'Unknown')
    console.log('Items returned:', listings.items?.length || 0)
    
    if (listings.items && listings.items.length > 0) {
      listings.items.forEach((item, index) => {
        console.log('\n' + '='.repeat(60))
        console.log(`📦 PRODUCT ${index + 1}:`)
        console.log('='.repeat(60))
        
        // Basic product info
        console.log('🏷️  SKU:', item.sku || 'N/A')
        console.log('📱  ASIN:', item.asin || 'N/A')
        console.log('🌐  Marketplace:', item.marketplaceId || 'N/A')
        
        // Product details
        if (item.summaries && item.summaries.length > 0) {
          const summary = item.summaries[0]
          console.log('\n📋 SUMMARY:')
          console.log('  Title:', summary.itemName || 'N/A')
          console.log('  Condition:', summary.conditionType || 'N/A')
          console.log('  Status:', summary.status || 'N/A')
          
          if (summary.mainImage) {
            console.log('  🖼️  Main Image:', summary.mainImage.link || 'N/A')
          }
        }
        
        // Attributes
        if (item.attributes) {
          console.log('\n🔧 ATTRIBUTES:')
          Object.entries(item.attributes).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              console.log(`  ${key}:`, JSON.stringify(value, null, 4))
            } else {
              console.log(`  ${key}:`, value)
            }
          })
        }
        
        // Fulfillment
        if (item.fulfillmentAvailability) {
          console.log('\n📦 FULFILLMENT:')
          item.fulfillmentAvailability.forEach((fulfillment, i) => {
            console.log(`  Channel ${i+1}:`, fulfillment.fulfillmentChannelCode || 'N/A')
            console.log('    Quantity:', fulfillment.quantity || 'N/A')
          })
        }
        
        // Full JSON for debugging
        console.log('\n🔍 FULL JSON DATA:')
        console.log(JSON.stringify(item, null, 2))
      })
    } else {
      console.log('❌ No product items found in response')
      console.log('Full response:', JSON.stringify(listings, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch products:', error.message)
    console.error('Error details:', error)
  }
}

showProductDetails().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })