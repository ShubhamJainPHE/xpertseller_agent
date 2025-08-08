import { DataIngestionService } from '../lib/jobs/data-ingestion'
import { supabaseAdmin } from '../lib/database/connection'

async function syncAllConnectedAccounts() {
  console.log('🚀 Starting data sync for all connected accounts...')
  
  // Get all active sellers with valid credentials
  const { data: sellers, error } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, sp_api_credentials, onboarding_completed')
    .eq('status', 'active')
    .eq('onboarding_completed', true)
  
  if (error) {
    console.error('❌ Failed to fetch sellers:', error)
    return
  }
  
  if (!sellers || sellers.length === 0) {
    console.log('📭 No active sellers found')
    return
  }
  
  console.log(`📊 Found ${sellers.length} active sellers to sync`)
  
  for (const seller of sellers) {
    console.log(`\n🔄 Syncing data for seller: ${seller.email} (${seller.amazon_seller_id})`)
    
    // Check if seller has valid credentials
    const credentials = seller.sp_api_credentials as any
    if (!credentials || credentials.needsAuth) {
      console.log(`⚠️ Skipping ${seller.email} - needs authentication`)
      continue
    }
    
    try {
      await DataIngestionService.syncSellerData(seller.id)
      console.log(`✅ Successfully synced data for ${seller.email}`)
    } catch (error) {
      console.error(`❌ Failed to sync ${seller.email}:`, error)
    }
    
    // Add delay between sellers to respect rate limits
    console.log('⏱️ Waiting 3 seconds before next seller...')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  console.log('\n🎉 Data sync completed for all connected accounts!')
}

syncAllConnectedAccounts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })