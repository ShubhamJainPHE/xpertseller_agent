// Run comprehensive data sync for all connected accounts
import { DataIngestionService } from '../lib/jobs/data-ingestion'
import { supabaseAdmin } from '../lib/database/connection'

async function runComprehensiveSync() {
  console.log('🚀 Starting comprehensive SP-API data sync...')
  
  try {
    // Get all active sellers
    const { data: sellers, error } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
    
    if (error) {
      console.error('❌ Error fetching sellers:', error)
      return
    }
    
    if (!sellers || sellers.length === 0) {
      console.log('📭 No active sellers found')
      return
    }
    
    console.log(`📊 Found ${sellers.length} active seller(s) to sync`)
    
    // Sync each seller
    for (const [index, seller] of sellers.entries()) {
      console.log(`\n🔄 [${index + 1}/${sellers.length}] Syncing ${seller.email}...`)
      console.log(`🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
      
      try {
        const startTime = Date.now()
        
        // Run comprehensive sync for this seller
        await DataIngestionService.syncSellerData(seller.id)
        
        const duration = (Date.now() - startTime) / 1000
        console.log(`✅ [${index + 1}/${sellers.length}] Completed ${seller.email} in ${duration}s`)
        
        // Add delay between sellers to respect rate limits
        if (index < sellers.length - 1) {
          console.log('⏱️ Waiting 10 seconds before next seller...')
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
        
      } catch (syncError) {
        console.error(`❌ [${index + 1}/${sellers.length}] Failed to sync ${seller.email}:`, syncError.message)
        
        // Continue with next seller
        continue
      }
    }
    
    console.log('\n🎉 Comprehensive sync completed for all sellers!')
    
    // Show summary statistics
    const { data: productCount } = await supabaseAdmin
      .from('products')
      .select('count(*)', { count: 'exact' })
    
    const { data: salesCount } = await supabaseAdmin
      .from('sales_data')
      .select('count(*)', { count: 'exact' })
    
    console.log('\n📈 Data Summary:')
    console.log(`📦 Products: ${productCount?.[0]?.count || 0}`)
    console.log(`💰 Sales Records: ${salesCount?.[0]?.count || 0}`)
    
  } catch (error) {
    console.error('❌ Comprehensive sync failed:', error)
  }
}

runComprehensiveSync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })