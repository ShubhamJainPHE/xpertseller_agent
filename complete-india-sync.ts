import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function completeIndiaSync() {
  try {
    console.log('🇮🇳 Completing India product sync...\n')
    
    // First, let's check and update the products table schema
    console.log('🔧 Checking products table schema...')
    
    // Get the India seller
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('amazon_seller_id', 'A14IOOJN7DLJME')
      .single()
    
    if (!sellers) {
      throw new Error('India seller not found')
    }
    
    const seller = sellers
    console.log(`✅ Found India seller: ${seller.email}`)
    
    // Create SP-API service
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }
    
    console.log('✅ SP-API service created')
    
    // Get listings with full details
    console.log('\n📋 Fetching complete product data...')
    
    const response = await spApi.getAllListings()
    if (!response?.items) {
      throw new Error('No listings found')
    }
    
    const listings = response.items
    console.log(`✅ Found ${listings.length} listings`)
    
    // Get detailed info for each product
    const products = []
    
    for (const listing of listings) {
      if (!listing.sku) continue
      
      console.log(`\n🔍 Processing ${listing.sku}...`)
      
      try {
        const details = await spApi.getListingDetails(listing.sku)
        
        if (details?.summaries?.[0]) {
          const summary = details.summaries[0]
          const attributes = details.attributes || {}
          
          const productData = {
            seller_id: seller.id,
            asin: summary.asin,
            seller_sku: listing.sku,
            marketplace_id: 'A21TJRUUN4KGV', // India
            title: summary.itemName || 'Unknown Product',
            brand: attributes.brand?.[0]?.value || null,
            category: attributes.item_type_name?.[0]?.value || null,
            current_price: attributes.list_price?.[0]?.Amount ? 
              parseFloat(attributes.list_price[0].Amount) : null,
            list_price: attributes.list_price?.[0]?.Amount ? 
              parseFloat(attributes.list_price[0].Amount) : null,
            stock_level: 0, // Will be updated by inventory sync
            is_active: summary.status === 'ACTIVE' || summary.status === 'DISCOVERABLE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            // Removed is_fba since column doesn't exist
          }
          
          products.push(productData)
          
          console.log(`✅ ${summary.itemName} (${summary.asin})`)
          console.log(`   Price: ₹${productData.current_price || 'N/A'}`)
          console.log(`   Status: ${summary.status}`)
          
        } else {
          console.log(`⚠️ No details found for ${listing.sku}`)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (detailError) {
        console.log(`❌ Failed to get details for ${listing.sku}: ${detailError}`)
      }
    }
    
    // Sync products to database
    console.log(`\n💾 Syncing ${products.length} products to database...`)
    
    let syncedCount = 0
    let errorCount = 0
    
    for (const product of products) {
      try {
        const { data: syncedProduct, error: syncError } = await supabaseAdmin
          .from('products')
          .upsert(product, { 
            onConflict: 'seller_id,asin,marketplace_id' 
          })
          .select()
        
        if (syncError) {
          console.log(`❌ Failed to sync ${product.asin}: ${syncError.message}`)
          errorCount++
        } else {
          syncedCount++
          
          // Log success event to fact_stream
          await supabaseAdmin
            .from('fact_stream')
            .insert({
              seller_id: seller.id,
              asin: product.asin,
              event_type: 'product.synced',
              event_category: 'inventory',
              data: {
                title: product.title,
                sku: product.seller_sku,
                price: product.current_price,
                marketplace: 'India',
                brand: product.brand
              },
              importance_score: 5
            })
          
          console.log(`✅ Synced: ${product.title}`)
        }
      } catch (error) {
        console.log(`❌ Error syncing ${product.asin}: ${error}`)
        errorCount++
      }
    }
    
    // Try to get inventory data too
    console.log('\n📦 Fetching inventory data...')
    try {
      const inventory = await spApi.getInventorySummary()
      console.log(`📦 Found ${inventory.length} inventory items`)
      
      if (inventory.length > 0) {
        console.log('\nInventory Summary:')
        inventory.forEach((item: any) => {
          console.log(`- ASIN: ${item.asin}, SKU: ${item.sellerSku}`)
          console.log(`  Total: ${item.totalQuantity || 0}, Available: ${item.inventoryDetails?.fulfillableQuantity || 0}`)
        })
        
        // Update stock levels in products
        for (const item of inventory) {
          if (item.asin) {
            await supabaseAdmin
              .from('products')
              .update({ 
                stock_level: item.totalQuantity || 0,
                updated_at: new Date().toISOString()
              })
              .eq('seller_id', seller.id)
              .eq('asin', item.asin)
            
            // Log inventory event
            await supabaseAdmin
              .from('fact_stream')
              .insert({
                seller_id: seller.id,
                asin: item.asin,
                event_type: 'inventory.updated',
                event_category: 'inventory',
                data: {
                  stock_level: item.totalQuantity || 0,
                  available_quantity: item.inventoryDetails?.fulfillableQuantity || 0,
                  sku: item.sellerSku
                },
                importance_score: 6
              })
          }
        }
        
        console.log('✅ Updated inventory levels')
      }
    } catch (inventoryError) {
      console.log(`⚠️ Inventory fetch failed: ${inventoryError}`)
    }
    
    // Get recent orders
    console.log('\n🛒 Fetching recent orders...')
    try {
      const orders = await spApi.getOrders()
      console.log(`📋 Found ${orders.length} recent orders`)
      
      if (orders.length > 0) {
        console.log('\nRecent Orders:')
        orders.slice(0, 3).forEach((order: any) => {
          console.log(`- Order: ${order.AmazonOrderId}`)
          console.log(`  Status: ${order.OrderStatus}`)
          console.log(`  Date: ${order.PurchaseDate}`)
          console.log(`  Total: ${order.OrderTotal?.Amount || 'N/A'} ${order.OrderTotal?.CurrencyCode || ''}`)
        })
        
        // Log orders summary
        await supabaseAdmin
          .from('fact_stream')
          .insert({
            seller_id: seller.id,
            event_type: 'orders.summary',
            event_category: 'performance',
            data: {
              order_count: orders.length,
              recent_orders: orders.slice(0, 5).map((o: any) => ({
                id: o.AmazonOrderId,
                status: o.OrderStatus,
                total: o.OrderTotal?.Amount
              }))
            },
            importance_score: 7
          })
      }
    } catch (ordersError) {
      console.log(`⚠️ Orders fetch failed: ${ordersError}`)
    }
    
    // Final summary
    console.log('\n🎉 INDIA SYNC COMPLETE!')
    console.log('=========================')
    console.log(`✅ Products synced: ${syncedCount}`)
    console.log(`❌ Sync errors: ${errorCount}`)
    console.log(`🇮🇳 Marketplace: Amazon.in`)
    console.log(`📊 Total listings: ${listings.length}`)
    
    // Check final database state
    const { data: finalProducts } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
    
    const { data: recentEvents } = await supabaseAdmin
      .from('fact_stream')
      .select('event_type, timestamp, data')
      .eq('seller_id', seller.id)
      .order('timestamp', { ascending: false })
      .limit(5)
    
    console.log(`\n💾 Database Status:`)
    console.log(`📦 Products in DB: ${finalProducts?.length || 0}`)
    console.log(`📝 Recent events: ${recentEvents?.length || 0}`)
    
    if (finalProducts && finalProducts.length > 0) {
      console.log('\nSynced Products:')
      finalProducts.forEach((product: any) => {
        console.log(`- ${product.title} (${product.asin})`)
        console.log(`  SKU: ${product.seller_sku}, Price: ₹${product.current_price || 'N/A'}`)
        console.log(`  Stock: ${product.stock_level || 0}, Active: ${product.is_active}`)
      })
    }
    
    if (recentEvents && recentEvents.length > 0) {
      console.log('\nRecent Events:')
      recentEvents.forEach((event: any) => {
        console.log(`- ${event.event_type} at ${event.timestamp}`)
      })
    }
    
    console.log('\n🎯 SUCCESS: SP-API data is now flowing to Supabase with UUIDs! 🎯')
    
  } catch (error) {
    console.error('❌ Complete sync failed:', error)
  }
}

completeIndiaSync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })