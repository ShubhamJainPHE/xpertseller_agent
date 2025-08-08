// Test basic SP-API functionality with minimal requests
import { createSPApiService } from '../lib/services/sp-api'
import { supabaseAdmin } from '../lib/database/connection'

async function testBasicSPAPI() {
  console.log('🔍 Testing basic SP-API functionality...')
  
  try {
    // Get first active seller
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, sp_api_credentials')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
      .limit(1)
    
    if (!sellers || sellers.length === 0) {
      console.log('❌ No active sellers found')
      return
    }
    
    const seller = sellers[0]
    console.log(`📊 Testing with seller: ${seller.email}`)
    console.log(`🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
    
    // Examine credentials more closely
    console.log('\n🔍 Examining SP-API credentials...')
    const creds = seller.sp_api_credentials as any
    console.log('Credential fields:', Object.keys(creds))
    console.log('Client ID present:', !!creds.clientId)
    console.log('Client Secret present:', !!creds.clientSecret)
    console.log('Refresh Token present:', !!creds.refreshToken)
    console.log('Marketplace ID:', creds.marketplaceId)
    console.log('Needs Auth:', creds.needsAuth)
    
    // Create SP-API service
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      console.log('❌ Failed to create SP-API service')
      return
    }
    
    // Test LWA token generation directly
    console.log('\n🔐 Testing LWA token generation...')
    try {
      const tokenResult = await spApi.validateCredentials()
      if (tokenResult.valid) {
        console.log('✅ LWA token generation successful')
      } else {
        console.log('❌ LWA token generation failed:', tokenResult.error)
        return
      }
    } catch (tokenError) {
      console.log('❌ LWA token error:', tokenError.message)
      return
    }
    
    // Try the simplest possible SP-API endpoint - Marketplace Participations
    console.log('\n🌐 Testing marketplace participations...')
    try {
      const response = await fetch(`https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations`, {
        method: 'GET',
        headers: {
          'x-amz-access-token': await spApi['getLWAToken'](),
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response status text:', response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Marketplace participations successful')
        console.log('Marketplaces:', data.payload?.length || 0)
      } else {
        const errorText = await response.text()
        console.log('❌ Marketplace participations failed:', errorText)
      }
      
    } catch (marketplaceError) {
      console.log('❌ Marketplace participations error:', marketplaceError.message)
    }
    
    console.log('\n📋 Possible Issues:')
    console.log('1. SP-API app may not be approved for production')
    console.log('2. Seller may not have granted necessary permissions')
    console.log('3. Refresh token may be expired')
    console.log('4. SP-API app may be missing required role assignments')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBasicSPAPI().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })