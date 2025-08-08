import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function fetchIndiaSellerProducts() {
  try {
    console.log('🇮🇳 Fetching all products for India sellers...\n')
    
    // Get all active sellers - focus on India marketplace
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
    
    // Filter for India sellers only
    const indiaSellers = sellers.filter(seller => 
      seller.marketplace_ids?.includes('A21TJRUUN4KGV') || 
      seller.amazon_seller_id === 'A14IOOJN7DLJME'
    )
    
    console.log(`📊 Found ${indiaSellers.length} India sellers out of ${sellers.length} total\n`)
    
    for (const seller of indiaSellers) {
      console.log(`\n======= INDIA SELLER: ${seller.email} =======`)
      console.log(`Amazon Seller ID: ${seller.amazon_seller_id}`)
      console.log(`Marketplaces: ${seller.marketplace_ids?.join(', ') || 'A21TJRUUN4KGV'}`)
      
      try {
        // Update seller to ensure India marketplace
        await supabaseAdmin
          .from('sellers')
          .update({ 
            marketplace_ids: ['A21TJRUUN4KGV'] // India marketplace
          })
          .eq('id', seller.id)
        
        console.log('✅ Updated seller marketplace to India')
        
        // Create SP-API service
        const spApi = await createSPApiService(seller.id)
        if (!spApi) {
          console.log('❌ Failed to create SP-API service')
          continue
        }
        
        // Test credentials
        const validation = await spApi.validateCredentials()
        if (!validation.valid) {
          console.log(`❌ Invalid SP-API credentials: ${validation.error}`)
          continue
        }
        
        console.log('✅ SP-API credentials valid')
        
        // Test fact_stream table
        console.log('\n📝 Testing fact_stream table...')
        try {
          const testEvent = {
            seller_id: seller.id,
            event_type: 'test.india_sync',
            event_category: 'test',
            data: { message: 'Testing India sync', marketplace: 'A21TJRUUN4KGV' }
          }
          
          const { data: eventResult, error: eventError } = await supabaseAdmin
            .from('fact_stream')
            .insert(testEvent)
            .select()
          
          if (eventError) {
            console.log(`❌ fact_stream error: ${eventError.message}`)
          } else {
            console.log('✅ fact_stream table working!')
          }
        } catch (factError) {
          console.log(`❌ fact_stream test failed: ${factError}`)
        }
        
        // Get all listings for India
        console.log('\n📋 Fetching India listings...')
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
            
            // Get detailed info for each listing
            if (listings.length > 0) {
              console.log(`  🔍 Getting detailed info for first few listings...`)
              
              for (let i = 0; i < Math.min(3, listings.length); i++) {
                const listing = listings[i]
                if (listing.sku) {
                  try {
                    console.log(`    📄 Getting details for SKU: ${listing.sku}`)
                    const details = await spApi.getListingDetails(listing.sku)
                    
                    if (details) {
                      listing.detailsFromAPI = {
                        itemName: details.summaries?.[0]?.itemName,
                        asin: details.summaries?.[0]?.asin,
                        status: details.summaries?.[0]?.status,
                        fulfillmentChannel: details.summaries?.[0]?.fulfillmentChannel,
                        mainImage: details.summaries?.[0]?.mainImage?.link,
                        attributes: details.attributes
                      }
                      console.log(`    ✅ Got details: ${listing.detailsFromAPI.itemName}`)
                    }
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500))
                  } catch (detailError) {
                    console.log(`    ⚠️ Failed to get details for ${listing.sku}: ${detailError}`)
                  }
                }
              }
            }
            
            nextToken = response.pagination?.nextToken
            
            // Add delay to respect rate limits
            if (nextToken) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            // Safety limit
            if (pageCount >= 5) {
              console.log('  ⚠️ Reached page limit (5), stopping...')
              break
            }
            
          } while (nextToken)
          
          console.log(`\n📊 TOTAL INDIA LISTINGS: ${allListings.length}`)
          
          if (allListings.length > 0) {
            console.log('\n📝 DETAILED INDIA LISTINGS:')
            
            allListings.forEach((listing, index) => {
              console.log(`\n${index + 1}. SKU: ${listing.sku || 'No SKU'}`)
              
              if (listing.detailsFromAPI) {
                console.log(`   📦 Product: ${listing.detailsFromAPI.itemName || 'No Name'}`)
                console.log(`   🏷️ ASIN: ${listing.detailsFromAPI.asin || 'No ASIN'}`)
                console.log(`   ✅ Status: ${listing.detailsFromAPI.status || 'Unknown'}`)
                console.log(`   🚚 Fulfillment: ${listing.detailsFromAPI.fulfillmentChannel || 'Unknown'}`)
                console.log(`   🖼️ Image: ${listing.detailsFromAPI.mainImage ? 'Available' : 'No Image'}`)
                
                // Show some attributes
                if (listing.detailsFromAPI.attributes) {
                  console.log(`   🏷️ Brand: ${listing.detailsFromAPI.attributes.brand?.[0]?.value || 'No Brand'}`)
                  console.log(`   💰 Price: ${listing.detailsFromAPI.attributes.list_price?.[0]?.Amount || 'No Price'} ${listing.detailsFromAPI.attributes.list_price?.[0]?.CurrencyCode || ''}`)
                }
              } else {
                console.log(`   ⚠️ No detailed info available`)
              }
            })
            
            // Try to sync one product to database
            if (allListings.length > 0) {
              console.log('\n💾 Testing product sync to database...')
              const firstListing = allListings[0]
              
              if (firstListing.detailsFromAPI?.asin) {
                const productData = {
                  seller_id: seller.id,
                  asin: firstListing.detailsFromAPI.asin,
                  seller_sku: firstListing.sku,
                  marketplace_id: 'A21TJRUUN4KGV', // India
                  title: firstListing.detailsFromAPI.itemName || 'Unknown Product',
                  brand: firstListing.detailsFromAPI.attributes?.brand?.[0]?.value || null,
                  current_price: firstListing.detailsFromAPI.attributes?.list_price?.[0]?.Amount ? 
                    parseFloat(firstListing.detailsFromAPI.attributes.list_price[0].Amount) : null,
                  list_price: firstListing.detailsFromAPI.attributes?.list_price?.[0]?.Amount ? 
                    parseFloat(firstListing.detailsFromAPI.attributes.list_price[0].Amount) : null,
                  is_fba: firstListing.detailsFromAPI.fulfillmentChannel === 'AMAZON',
                  is_active: firstListing.detailsFromAPI.status === 'ACTIVE',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                
                const { data: syncedProduct, error: syncError } = await supabaseAdmin
                  .from('products')
                  .upsert(productData, { 
                    onConflict: 'seller_id,asin,marketplace_id' 
                  })
                  .select()
                
                if (syncError) {
                  console.log(`❌ Failed to sync product: ${syncError.message}`)
                } else {
                  console.log(`✅ Successfully synced product to database!`)
                  console.log(`   ASIN: ${productData.asin}`)
                  console.log(`   Title: ${productData.title}`)
                  console.log(`   Price: ₹${productData.current_price || 'N/A'}`)
                  
                  // Log success event to fact_stream
                  try {
                    await supabaseAdmin
                      .from('fact_stream')
                      .insert({
                        seller_id: seller.id,
                        asin: productData.asin,
                        event_type: 'product.synced',
                        event_category: 'inventory',
                        data: {
                          title: productData.title,
                          sku: productData.seller_sku,
                          price: productData.current_price,
                          marketplace: 'India'
                        }
                      })
                    
                    console.log(`✅ Logged sync event to fact_stream!`)
                  } catch (eventError) {
                    console.log(`⚠️ Failed to log event: ${eventError}`)
                  }
                }
              }
            }
            
          } else {
            console.log('❌ No listings found')
            
            // Try inventory as backup
            console.log('\n📦 Trying inventory summary...')
            try {
              const inventory = await spApi.getInventorySummary()
              console.log(`📦 Found ${inventory.length} inventory items`)
              
              if (inventory.length > 0) {
                inventory.slice(0, 3).forEach((item: any, index: number) => {
                  console.log(`\n${index + 1}. SKU: ${item.sellerSku || 'No SKU'}`)
                  console.log(`   ASIN: ${item.asin || 'No ASIN'}`)
                  console.log(`   FNSKU: ${item.fnSku || 'No FNSKU'}`)
                  console.log(`   Stock: ${item.totalQuantity || 0}`)
                  console.log(`   Available: ${item.inventoryDetails?.fulfillableQuantity || 0}`)
                })
              }
            } catch (inventoryError) {
              console.log(`❌ Inventory fetch failed: ${inventoryError}`)
            }
          }
          
        } catch (listingsError) {
          console.log(`❌ Failed to fetch listings: ${listingsError}`)
        }
        
      } catch (sellerError) {
        console.log(`❌ Error processing seller: ${sellerError}`)
      }
      
      console.log(`\n======= END OF ${seller.email} =======\n`)
    }
    
    console.log('🎉 Finished India product sync test!')
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

fetchIndiaSellerProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })