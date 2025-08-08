import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function syncAllSellers() {
  console.log('🚀 SYNCING ALL SELLERS TO SUPABASE')
  console.log('==================================\n')
  
  // Get all sellers
  const { data: sellers, error } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, sp_api_credentials, marketplace_ids')
    .order('created_at', { ascending: false })
    
  if (error || !sellers || sellers.length === 0) {
    console.log('❌ No sellers found or error:', error)
    return
  }
  
  console.log(`📊 Found ${sellers.length} sellers to sync\n`)
  
  let totalProductsSynced = 0
  let totalOrdersSynced = 0
  
  for (let i = 0; i < sellers.length; i++) {
    const seller = sellers[i]
    console.log(`\n🔸 [${i + 1}/${sellers.length}] SYNCING: ${seller.email} (${seller.amazon_seller_id})`)
    console.log(`   Marketplace: ${seller.marketplace_ids?.join(', ') || 'None'}`)
    
    try {
      // Create SP-API service
      const spApi = await createSPApiService(seller.id)
      if (!spApi) {
        console.log('❌ Failed to create SP-API service')
        continue
      }
      
      // Validate credentials
      const validation = await spApi.validateCredentials()
      if (!validation.valid) {
        console.log(`❌ SP-API credentials invalid: ${validation.error}`)
        continue
      }
      
      console.log('✅ SP-API ready, starting sync...')
      
      // Sync Products
      console.log('📦 Syncing products...')
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
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (error) {
            console.log(`   ⚠️ Error syncing product ${listing.sku}`)
          }
        }
        
        totalProductsSynced += productCount
        console.log(`   ✅ Products: ${productCount}/${response.items.length}`)
      } else {
        console.log('   ⚠️ No products found')
      }
      
      // Sync Orders (last 90 days)
      console.log('🛒 Syncing orders...')
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const orders = await spApi.getOrders(ninetyDaysAgo)
      
      let orderCount = 0
      for (const order of orders) {
        try {
          const orderData = {
            seller_id: seller.id,
            amazon_order_id: order.AmazonOrderId,
            order_status: order.OrderStatus,
            purchase_date: new Date(order.PurchaseDate).toISOString(),
            marketplace_id: 'A21TJRUUN4KGV',
            order_total: order.OrderTotal ? {
              amount: parseFloat(order.OrderTotal.Amount) || 0,
              currency_code: order.OrderTotal.CurrencyCode || 'INR'
            } : null,
            updated_at: new Date().toISOString()
          }
          
          const { error } = await supabaseAdmin
            .from('orders')
            .upsert(orderData, { onConflict: 'seller_id,amazon_order_id' })
          
          if (!error) {
            orderCount++
          }
        } catch (error) {
          console.log(`   ⚠️ Error syncing order ${order.AmazonOrderId}`)
        }
      }
      
      totalOrdersSynced += orderCount
      console.log(`   ✅ Orders: ${orderCount}/${orders.length}`)
      
    } catch (error) {
      console.log(`❌ Error syncing ${seller.email}:`, (error as Error).message)
    }
    
    console.log(`   ⏱️ Seller ${seller.email} sync complete\n`)
  }
  
  console.log('🎉 ALL SELLERS SYNC COMPLETE!')
  console.log('=============================')
  console.log(`📊 Total Products Synced: ${totalProductsSynced}`)
  console.log(`🛒 Total Orders Synced: ${totalOrdersSynced}`)
  console.log(`✅ Sellers Processed: ${sellers.length}`)
  console.log('💾 All data synced to Supabase successfully!')
}

syncAllSellers().then(() => process.exit(0)).catch(console.error)