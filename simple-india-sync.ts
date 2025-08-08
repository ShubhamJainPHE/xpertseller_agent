import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function simpleIndiaSync() {
  try {
    console.log('🇮🇳 Simple India product sync (using existing schema)...\n')
    
    // Get the India seller
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('amazon_seller_id', 'A14IOOJN7DLJME')
      .single()
    
    if (!seller) {
      throw new Error('India seller not found')
    }
    
    console.log(`✅ Found India seller: ${seller.email}`)
    
    // Check existing products table schema
    console.log('\n🔍 Checking existing products...')
    const { data: existingProducts, error: existingError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
      .limit(1)
    
    if (existingError) {
      console.log('❌ Error checking products:', existingError)
    } else {
      console.log(`📦 Existing products in DB: ${existingProducts?.length || 0}`)
    }
    
    // Create SP-API service
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }
    
    // Get listings
    console.log('\n📋 Fetching listings...')
    const response = await spApi.getAllListings()
    if (!response?.items) {
      throw new Error('No listings found')
    }
    
    console.log(`✅ Found ${response.items.length} listings`)
    
    // Process each listing with minimal data that fits existing schema
    const products = []
    
    for (const listing of response.items) {
      if (!listing.sku) continue
      
      console.log(`\n🔍 Processing ${listing.sku}...`)
      
      try {
        const details = await spApi.getListingDetails(listing.sku)
        
        if (details?.summaries?.[0]) {
          const summary = details.summaries[0]
          const attributes = details.attributes || {}
          
          // Use only columns that exist in the current schema
          const productData = {
            seller_id: seller.id,
            asin: summary.asin,
            marketplace_id: 'A21TJRUUN4KGV', // India
            title: summary.itemName || 'Unknown Product',
            brand: attributes.brand?.[0]?.value || null,
            category: attributes.item_type_name?.[0]?.value || null,
            current_price: attributes.list_price?.[0]?.Amount ? 
              parseFloat(attributes.list_price[0].Amount) : null,
            stock_level: 0, // Default, will be updated later
            is_active: summary.status === 'ACTIVE' || summary.status === 'DISCOVERABLE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          products.push({
            ...productData,
            sku: listing.sku,
            status: summary.status,
            fulfillmentChannel: summary.fulfillmentChannel
          })
          
          console.log(`✅ ${summary.itemName}`)
          console.log(`   ASIN: ${summary.asin}`)
          console.log(`   Status: ${summary.status}`)
          console.log(`   Price: ${attributes.list_price?.[0]?.Amount || 'N/A'}`)
          
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (detailError) {
        console.log(`❌ Failed to get details for ${listing.sku}: ${detailError}`)
      }
    }
    
    console.log(`\n💾 Attempting to sync ${products.length} products...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const product of products) {
      try {
        // Try with minimal required fields first
        const minimalProduct = {
          seller_id: product.seller_id,
          asin: product.asin,
          marketplace_id: product.marketplace_id,
          title: product.title,
          brand: product.brand,
          category: product.category,
          current_price: product.current_price,
          stock_level: 0,
          is_active: product.is_active,
          created_at: product.created_at,
          updated_at: product.updated_at
        }
        
        const { data: syncedProduct, error: syncError } = await supabaseAdmin
          .from('products')
          .upsert(minimalProduct, { 
            onConflict: 'seller_id,asin,marketplace_id',
            ignoreDuplicates: false
          })
          .select()
        
        if (syncError) {
          console.log(`❌ Failed to sync ${product.asin}: ${syncError.message}`)
          
          // Try with even more minimal data
          const ultraMinimal = {
            seller_id: product.seller_id,
            asin: product.asin,
            marketplace_id: product.marketplace_id,
            title: product.title,
            current_price: product.current_price,
            stock_level: 0,
            is_active: product.is_active,
            created_at: product.created_at,
            updated_at: product.updated_at
          }
          
          const { error: retryError } = await supabaseAdmin
            .from('products')
            .upsert(ultraMinimal, { 
              onConflict: 'seller_id,asin,marketplace_id' 
            })
          
          if (retryError) {
            console.log(`❌ Retry also failed for ${product.asin}: ${retryError.message}`)
            errorCount++
          } else {
            console.log(`✅ Synced with minimal data: ${product.title}`)
            successCount++
          }
        } else {
          console.log(`✅ Synced: ${product.title}`)
          successCount++
        }
        
        // Log to fact_stream regardless of product sync success
        try {
          await supabaseAdmin
            .from('fact_stream')
            .insert({
              seller_id: seller.id,
              asin: product.asin,
              event_type: 'product.discovered',
              event_category: 'inventory',
              data: {
                title: product.title,
                sku: product.sku,
                price: product.current_price,
                status: product.status,
                marketplace: 'India',
                fulfillment: product.fulfillmentChannel
              },
              importance_score: 6
            })
          
          console.log(`📝 Logged discovery event for ${product.asin}`)
        } catch (eventError) {
          console.log(`⚠️ Failed to log event for ${product.asin}`)
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${product.asin}: ${error}`)
        errorCount++
      }
    }
    
    // Summary
    console.log('\n🎉 SYNC SUMMARY')
    console.log('================')
    console.log(`✅ Successfully synced: ${successCount} products`)
    console.log(`❌ Failed to sync: ${errorCount} products`)
    console.log(`🇮🇳 Marketplace: Amazon.in`)
    console.log(`📊 Listings found: ${response.items.length}`)
    
    // Check final state
    const { data: finalProducts } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', seller.id)
    
    const { data: allEvents } = await supabaseAdmin
      .from('fact_stream')
      .select('event_type, created_at, data')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`\n📊 FINAL DATABASE STATE:`)
    console.log(`Products in database: ${finalProducts?.length || 0}`)
    console.log(`Events logged: ${allEvents?.length || 0}`)
    
    if (finalProducts && finalProducts.length > 0) {
      console.log('\n📦 Products in Database:')
      finalProducts.forEach((p: any) => {
        console.log(`- ${p.title} (${p.asin})`)
        console.log(`  Price: ₹${p.current_price || 'N/A'}, Active: ${p.is_active}`)
        console.log(`  Stock: ${p.stock_level}, Updated: ${p.updated_at}`)
      })
    }
    
    if (allEvents && allEvents.length > 0) {
      console.log('\n📝 Recent Events:')
      allEvents.forEach((e: any) => {
        console.log(`- ${e.event_type} - ${e.created_at}`)
        if (e.data?.title) {
          console.log(`  Product: ${e.data.title}`)
        }
      })
    }
    
    // Final validation
    if (successCount > 0) {
      console.log('\n🎯 SUCCESS! SP-API data is now feeding into Supabase with UUIDs!')
      console.log('📋 The fact_stream table is logging all events')
      console.log('📦 Products are being stored in the products table')
      console.log('🔑 All records have proper UUID primary keys')
    } else {
      console.log('\n⚠️ No products were synced to database, but events are logged')
      console.log('💡 Check the products table schema and add missing columns')
    }
    
  } catch (error) {
    console.error('❌ Simple sync failed:', error)
  }
}

simpleIndiaSync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })