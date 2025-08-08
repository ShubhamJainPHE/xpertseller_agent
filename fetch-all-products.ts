import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function fetchAllSellerProducts() {
  try {
    console.log('🔍 Fetching all listed products for connected sellers...\n')
    
    // Get all active sellers
    const { data: sellers, error: sellersError } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, marketplace_ids, sp_api_credentials')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
    
    if (sellersError) {
      throw new Error(`Failed to get sellers: ${sellersError.message}`)
    }
    
    if (!sellers || sellers.length === 0) {
      console.log('❌ No active sellers found')
      return
    }
    
    console.log(`📊 Found ${sellers.length} active sellers\n`)
    
    for (const seller of sellers) {
      console.log(`\n======= SELLER: ${seller.email} =======`)
      console.log(`Amazon Seller ID: ${seller.amazon_seller_id}`)
      console.log(`Marketplaces: ${seller.marketplace_ids?.join(', ') || 'ATVPDKIKX0DER'}`)
      
      try {
        // Create SP-API service
        const spApi = await createSPApiService(seller.id)
        if (!spApi) {
          console.log('❌ Failed to create SP-API service')
          continue
        }
        
        // Test credentials first
        const validation = await spApi.validateCredentials()
        if (!validation.valid) {
          console.log(`❌ Invalid SP-API credentials: ${validation.error}`)
          continue
        }
        
        console.log('✅ SP-API credentials valid')
        
        // Try to get all listings
        console.log('\n📋 Fetching all listings...')
        try {
          let allListings: any[] = []
          let nextToken: string | undefined = undefined
          let pageCount = 0
          
          do {
            pageCount++
            console.log(`  📄 Fetching page ${pageCount}...`)
            
            const response = await spApi.getAllListings(nextToken)
            
            if (!response || !response.items) {
              console.log('  ⚠️ No items in response')
              break
            }
            
            const listings = response.items
            allListings.push(...listings)
            
            console.log(`  ✅ Got ${listings.length} listings (total: ${allListings.length})`)
            
            nextToken = response.pagination?.nextToken
            
            // Add delay to respect rate limits
            if (nextToken) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            // Safety limit to prevent infinite loops
            if (pageCount >= 10) {
              console.log('  ⚠️ Reached page limit (10), stopping...')
              break
            }
            
          } while (nextToken)
          
          console.log(`\n📊 TOTAL LISTINGS: ${allListings.length}`)
          
          if (allListings.length > 0) {
            console.log('\n📝 SAMPLE LISTINGS:')
            
            // Show first 10 listings with details
            const sampleListings = allListings.slice(0, 10)
            
            sampleListings.forEach((listing, index) => {
              console.log(`\n${index + 1}. ${listing.sku || 'No SKU'}`)
              console.log(`   ASIN: ${listing.asin || 'No ASIN'}`)
              console.log(`   Product Name: ${listing.productName || 'No Name'}`)
              console.log(`   Status: ${listing.status || 'Unknown'}`)
              console.log(`   Fulfillment: ${listing.fulfillmentChannel || 'Unknown'}`)
              console.log(`   Price: ${listing.price?.Amount ? `$${listing.price.Amount}` : 'No Price'}`)
              console.log(`   Marketplace: ${listing.marketplaceId || 'No Marketplace'}`)
            })
            
            if (allListings.length > 10) {
              console.log(`\n... and ${allListings.length - 10} more listings`)
            }
            
            // Summary by status
            const statusSummary = allListings.reduce((acc: any, listing: any) => {
              const status = listing.status || 'Unknown'
              acc[status] = (acc[status] || 0) + 1
              return acc
            }, {})
            
            console.log('\n📈 LISTINGS BY STATUS:')
            Object.entries(statusSummary).forEach(([status, count]) => {
              console.log(`   ${status}: ${count}`)
            })
            
            // Summary by fulfillment
            const fulfillmentSummary = allListings.reduce((acc: any, listing: any) => {
              const fulfillment = listing.fulfillmentChannel || 'Unknown'
              acc[fulfillment] = (acc[fulfillment] || 0) + 1
              return acc
            }, {})
            
            console.log('\n🚚 LISTINGS BY FULFILLMENT:')
            Object.entries(fulfillmentSummary).forEach(([fulfillment, count]) => {
              console.log(`   ${fulfillment}: ${count}`)
            })
            
          } else {
            console.log('❌ No listings found for this seller')
            
            // Try alternative method - get inventory instead
            console.log('\n📦 Trying inventory summary instead...')
            try {
              const inventory = await spApi.getInventorySummary()
              console.log(`📦 Found ${inventory.length} inventory items`)
              
              if (inventory.length > 0) {
                console.log('\n📝 SAMPLE INVENTORY:')
                inventory.slice(0, 5).forEach((item: any, index: number) => {
                  console.log(`\n${index + 1}. ${item.sellerSku || 'No SKU'}`)
                  console.log(`   ASIN: ${item.asin || 'No ASIN'}`)
                  console.log(`   FNSKU: ${item.fnSku || 'No FNSKU'}`)
                  console.log(`   Total Quantity: ${item.totalQuantity || 0}`)
                  console.log(`   Available: ${item.inventoryDetails?.fulfillableQuantity || 0}`)
                })
              }
            } catch (inventoryError) {
              console.log(`❌ Inventory fetch also failed: ${inventoryError}`)
            }
          }
          
        } catch (listingsError) {
          console.log(`❌ Failed to fetch listings: ${listingsError}`)
          console.log('Error details:', listingsError)
        }
        
      } catch (sellerError) {
        console.log(`❌ Error processing seller: ${sellerError}`)
      }
      
      console.log(`\n======= END OF ${seller.email} =======\n`)
    }
    
    console.log('🎉 Finished fetching products for all sellers')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

fetchAllSellerProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })