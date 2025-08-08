// Check new seller authorization and fix marketplace if needed
import { supabaseAdmin } from '../lib/database/connection'

async function checkNewSeller() {
  console.log('🔍 Checking new seller authorization for India...')
  
  const { data: sellers } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, marketplace_ids, sp_api_credentials')
    
  if (!sellers || sellers.length === 0) {
    console.log('❌ No sellers found after re-authorization')
    return
  }
  
  const seller = sellers[0]
  console.log(`👤 Found seller: ${seller.email}`)
  console.log(`🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
  console.log(`🌐 Marketplace IDs: ${JSON.stringify(seller.marketplace_ids)}`)
  
  // Check if it defaults to US
  if (seller.marketplace_ids && seller.marketplace_ids.includes('ATVPDKIKX0DER')) {
    console.log('⚠️ ISSUE: Seller has US marketplace by default!')
    console.log('🔄 Updating to India marketplace...')
    
    const { error } = await supabaseAdmin
      .from('sellers')
      .update({ marketplace_ids: ['A21TJRUUN4KGV'] })
      .eq('id', seller.id)
    
    if (error) {
      console.error('❌ Failed to update:', error)
    } else {
      console.log('✅ Updated marketplace to India A21TJRUUN4KGV')
    }
  } else if (seller.marketplace_ids && seller.marketplace_ids.includes('A21TJRUUN4KGV')) {
    console.log('✅ Seller already has India marketplace!')
  }
  
  const creds = seller.sp_api_credentials
  console.log(`🔑 Has credentials: ${creds ? 'YES' : 'NO'}`)
  if (creds) {
    console.log(`🎫 Has access token: ${creds.accessToken ? 'YES' : 'NO'}`)
    console.log(`🔄 Needs auth: ${creds.needsAuth ? 'YES' : 'NO'}`)
  }
  
  return seller.id
}

checkNewSeller().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })