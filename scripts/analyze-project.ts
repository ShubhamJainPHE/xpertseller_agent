import { supabaseAdmin } from '../lib/database/connection'

async function analyzeProjectIssues() {
  console.log('🔍 COMPREHENSIVE PROJECT ANALYSIS...')
  
  try {
    // Check sellers
    const { data: sellers, error: sellersError } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, marketplace_ids, sp_api_credentials')
    
    if (sellersError) {
      console.error('❌ Database error:', sellersError)
      return
    }
    
    console.log(`👤 Total sellers in DB: ${sellers?.length || 0}`)
    
    if (sellers && sellers.length > 0) {
      const seller = sellers[0]
      console.log(`\n📋 SELLER DETAILS:`)
      console.log(`  📧 Email: ${seller.email}`)
      console.log(`  🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
      console.log(`  🌐 Marketplace IDs: ${JSON.stringify(seller.marketplace_ids)}`)
      
      const creds = seller.sp_api_credentials as any
      if (creds) {
        console.log(`\n🔑 SP-API CREDENTIALS:`)
        console.log(`  Client ID: ${creds.clientId ? creds.clientId.substring(0, 20) + '...' : 'MISSING'}`)
        console.log(`  Client Secret: ${creds.clientSecret ? '✅ Present' : '❌ Missing'}`)
        console.log(`  Access Token: ${creds.accessToken ? '✅ Present' : '❌ Missing'}`)
        console.log(`  Refresh Token: ${creds.refreshToken ? '✅ Present' : '❌ Missing'}`)
        console.log(`  Needs Auth: ${creds.needsAuth ? '⚠️ YES' : '✅ NO'}`)
      } else {
        console.log(`\n❌ NO SP-API CREDENTIALS FOUND`)
      }
    }
    
    // Check environment variables
    console.log(`\n🔧 ENVIRONMENT VARIABLES:`)
    console.log(`  AMAZON_CLIENT_ID: ${process.env.AMAZON_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
    console.log(`  AMAZON_CLIENT_SECRET: ${process.env.AMAZON_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`  SP_API_BASE_URL: ${process.env.SP_API_BASE_URL || 'Not set'}`)
    console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`)
    
    // Check data counts
    const { count: productsCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      
    const { count: salesCount } = await supabaseAdmin
      .from('sales_data')
      .select('*', { count: 'exact' })
      
    console.log(`\n📊 DATA STATUS:`)
    console.log(`  📦 Products: ${productsCount || 0}`)
    console.log(`  💰 Sales records: ${salesCount || 0}`)
    
    // Analyze configuration issues
    console.log(`\n🚨 IDENTIFIED ISSUES:`)
    
    if (!sellers || sellers.length === 0) {
      console.log(`  1. ❌ NO SELLERS CONNECTED - Need to complete OAuth flow`)
    }
    
    if (sellers?.[0]?.marketplace_ids?.includes('ATVPDKIKX0DER')) {
      console.log(`  2. ⚠️ MARKETPLACE MISMATCH - Seller has US marketplace but you want India`)
    }
    
    if (process.env.SP_API_BASE_URL === 'https://sellingpartnerapi-na.amazon.com') {
      console.log(`  3. ❌ WRONG BASE URL - Using North America endpoint instead of Europe for India`)
    }
    
    console.log(`\n💡 RECOMMENDATIONS:`)
    console.log(`  1. Update .env.local with correct India configuration`)
    console.log(`  2. Re-authorize seller with India marketplace`)
    console.log(`  3. Test SP-API connectivity with corrected setup`)
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

analyzeProjectIssues().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })