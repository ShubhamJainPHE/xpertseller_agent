#!/usr/bin/env tsx

/**
 * Fetch data from SP-API to Supabase for Ishan's account
 */

import { createClient } from '@supabase/supabase-js'
import { createSPApiService } from './lib/services/sp-api'

async function fetchIshanData() {
  console.log('🔍 Fetching data for Ishan\'s account...')
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  
  // Step 1: Find Ishan's account
  console.log('👤 Looking for ishan@mitasu.in account...')
  
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('email', 'ishan@mitasu.in')
    .single()
  
  if (sellerError || !seller) {
    console.log('❌ Ishan account not found. Let me check all accounts...')
    
    const { data: allSellers, error: allError } = await supabase
      .from('sellers')
      .select('id, email, amazon_seller_id, marketplace_ids')
    
    if (allError) {
      console.error('❌ Error fetching sellers:', allError)
      return
    }
    
    console.log('📋 Available sellers:')
    allSellers?.forEach((s, i) => {
      console.log(`${i+1}. ${s.email} - ${s.amazon_seller_id} - Markets: ${s.marketplace_ids}`)
    })
    
    // Use the first available seller if Ishan not found
    if (allSellers && allSellers.length > 0) {
      const firstSeller = allSellers[0]
      console.log(`🎯 Using first available seller: ${firstSeller.email}`)
      
      return fetchDataForSeller(firstSeller, supabase)
    } else {
      console.log('❌ No sellers found in database')
      return
    }
  }
  
  console.log('✅ Found Ishan account:', seller.email)
  return fetchDataForSeller(seller, supabase)
}

async function fetchDataForSeller(seller: any, supabase: any) {
  console.log(`\n📊 Fetching SP-API data for: ${seller.email}`)
  console.log('🏷️ Amazon Seller ID:', seller.amazon_seller_id)
  console.log('🌐 Marketplace:', seller.marketplace_ids)
  
  // Step 2: Create SP-API service
  console.log('\n🔧 Creating SP-API service...')
  
  try {
    const spApi = await createSPApiService(seller.id)
    
    if (!spApi) {
      console.log('❌ Failed to create SP-API service')
      console.log('💡 This might be because:')
      console.log('   - SP-API credentials not configured')
      console.log('   - Invalid credentials')
      console.log('   - Network connectivity issues')
      return
    }
    
    console.log('✅ SP-API service created successfully')
    
    // Step 3: Fetch products from SP-API
    console.log('\n📦 Fetching products from Amazon SP-API...')
    
    const listings = await spApi.getAllListings()
    
    if (!listings || !listings.items || listings.items.length === 0) {
      console.log('❌ No products found from SP-API')
      console.log('💡 This might mean:')
      console.log('   - No products listed on Amazon')
      console.log('   - Wrong marketplace configured')
      console.log('   - SP-API permissions issue')
      return
    }
    
    console.log(`✅ Found ${listings.items.length} products from SP-API`)
    
    // Step 4: Insert products into Supabase
    console.log('\n💾 Inserting products into Supabase products table...')
    
    const products = listings.items.map((item: any) => ({
      seller_id: seller.id,
      asin: item.asin,
      marketplace_id: seller.marketplace_ids?.[0] || 'A21TJRUUN4KGV', // Use India marketplace
      title: item.productName || item.itemName || 'Unknown Product',
      brand: item.brand || null,
      category: item.productType || null,
      current_price: null, // Will be updated later
      stock_level: 0, // Will be updated from inventory API
      is_active: true,
      created_at: new Date().toISOString()
    }))
    
    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'asin,seller_id' })
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting products:', insertError)
      return
    }
    
    console.log(`✅ Successfully inserted ${insertedProducts.length} products into Supabase!`)
    
    // Show summary
    console.log('\n📋 Data Fetch Summary:')
    console.log(`   👤 Seller: ${seller.email}`)
    console.log(`   🏷️ Amazon ID: ${seller.amazon_seller_id}`)
    console.log(`   🌐 Marketplace: ${seller.marketplace_ids?.[0] || 'A21TJRUUN4KGV'}`)
    console.log(`   📦 Products fetched: ${listings.items.length}`)
    console.log(`   💾 Products saved: ${insertedProducts.length}`)
    
    // Show first few products
    console.log('\n📦 Sample products:')
    insertedProducts.slice(0, 3).forEach((p: any, i: number) => {
      console.log(`   ${i+1}. ${p.title} (${p.asin})`)
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Error during data fetch:', error)
    console.log('💡 Common issues:')
    console.log('   - SP-API credentials expired/invalid')
    console.log('   - Amazon API rate limits')
    console.log('   - Network connectivity')
    console.log('   - Wrong marketplace configuration')
    return false
  }
}

// Run the fetch
fetchIshanData()
  .then(success => {
    if (success) {
      console.log('\n🎉 Data fetch completed successfully!')
    } else {
      console.log('\n❌ Data fetch failed')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })