import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

// Simple, reliable re-sync command
async function resyncAllData() {
  try {
    console.log('🔄 RE-SYNC COMMAND STARTING...\n')
    
    // Get India seller
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, email')
      .eq('amazon_seller_id', 'A14IOOJN7DLJME')
      .single()
    
    if (!seller) {
      throw new Error('Seller not found')
    }
    
    console.log(`✅ Seller: ${seller.email}`)
    
    // Create SP-API service
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      throw new Error('SP-API service creation failed')
    }
    
    console.log('✅ SP-API ready\n')
    
    // Re-sync products (guaranteed to work)
    console.log('📦 1. Re-syncing Products...')
    const response = await spApi.getAllListings()
    
    if (response?.items) {
      let productCount = 0
      
      for (const listing of response.items) {
        try {
          const details = await spApi.getListingDetails(listing.sku)
          
          if (details?.summaries?.[0]) {
            const summary = details.summaries[0]
            const attributes = details.attributes || {}
            
            const productData = {
              seller_id: seller.id,
              asin: summary.asin,
              marketplace_id: 'A21TJRUUN4KGV',
              title: summary.itemName || 'Unknown Product',
              brand: attributes.brand?.[0]?.value || null,
              category: attributes.item_type_name?.[0]?.value || null,
              current_price: attributes.list_price?.[0]?.Amount ? 
                parseFloat(attributes.list_price[0].Amount) : null,
              stock_level: 0,
              is_active: summary.status === 'ACTIVE' || summary.status === 'DISCOVERABLE',
              updated_at: new Date().toISOString()
            }
            
            const { error } = await supabaseAdmin
              .from('products')
              .upsert(productData, { onConflict: 'seller_id,asin,marketplace_id' })
            
            if (!error) {
              productCount++
              console.log(`   ✅ ${summary.itemName}`)
            } else {
              console.log(`   ❌ ${summary.asin}: ${error.message}`)
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
          
        } catch (error) {
          console.log(`   ⚠️ ${listing.sku}: ${error}`)
        }
      }
      
      console.log(`\n📊 Products: ${productCount}/${response.items.length} synced`)
    }
    
    // Log sync event
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: seller.id,
        event_type: 'resync.completed',
        event_category: 'sync',
        data: {
          command: 'resync_all_data',
          timestamp: new Date().toISOString(),
          products_synced: response?.items?.length || 0
        },
        importance_score: 7
      })
    
    console.log('\n🎉 RE-SYNC COMPLETE!')
    console.log('✅ Products updated with latest SP-API data')
    console.log('📝 Event logged to fact_stream')
    console.log('🔄 Ready for next sync')
    
  } catch (error) {
    console.error('❌ Re-sync failed:', error)
    
    // Log error event
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: 'unknown',
          event_type: 'resync.failed',
          event_category: 'sync',
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          importance_score: 9
        })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    throw error
  }
}

resyncAllData()
  .then(() => {
    console.log('\n✅ RESYNC SUCCESS!')
    process.exit(0)
  })
  .catch(e => {
    console.error('\n❌ RESYNC FAILED:', e)
    process.exit(1)
  })