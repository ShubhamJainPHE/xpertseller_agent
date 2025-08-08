// Comprehensive SP-API diagnostic to find the real issue
import { supabaseAdmin } from '../lib/database/connection'

async function diagnoseSPAPI() {
  console.log('🔍 COMPREHENSIVE SP-API DIAGNOSIS...')
  
  try {
    // Get seller credentials
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, sp_api_credentials, marketplace_ids')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
      .limit(1)
    
    if (!sellers?.[0]) {
      console.log('❌ No sellers found')
      return
    }
    
    const seller = sellers[0]
    const creds = seller.sp_api_credentials as any
    
    console.log(`📊 Seller: ${seller.email}`)
    console.log(`🏷️ Amazon Seller ID: ${seller.amazon_seller_id}`)
    console.log(`🌐 Marketplace IDs: ${JSON.stringify(seller.marketplace_ids)}`)
    
    // Step 1: Test LWA token generation
    console.log('\n🔐 Step 1: Testing LWA Token Generation...')
    
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret
    })

    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    })
    
    console.log(`Token response status: ${tokenResponse.status}`)
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.log('❌ LWA Token Failed:', errorText)
      return
    }
    
    const tokenData = await tokenResponse.json()
    console.log('✅ LWA Token Success')
    console.log(`Token type: ${tokenData.token_type}`)
    console.log(`Expires in: ${tokenData.expires_in} seconds`)
    
    const accessToken = tokenData.access_token
    
    // Step 2: Test different SP-API endpoints with proper headers
    console.log('\n🌐 Step 2: Testing Different SP-API Endpoints...')
    
    const endpoints = [
      {
        name: 'Marketplace Participations',
        url: 'https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations'
      },
      {
        name: 'Orders (basic)',
        url: `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER&CreatedAfter=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`
      },
      {
        name: 'Inventory Summary',
        url: 'https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId=ATVPDKIKX0DER'
      }
    ]
    
    for (const endpoint of endpoints) {
      console.log(`\n🧪 Testing: ${endpoint.name}`)
      console.log(`URL: ${endpoint.url}`)
      
      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json',
            'User-Agent': 'XpertSeller/1.0 (Language=JavaScript)'
          }
        })
        
        console.log(`Status: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ SUCCESS - Data keys: ${Object.keys(data)}`)
          if (data.payload) {
            console.log(`📦 Payload type: ${Array.isArray(data.payload) ? 'Array' : typeof data.payload}`)
            if (Array.isArray(data.payload)) {
              console.log(`📊 Items count: ${data.payload.length}`)
            }
          }
        } else {
          const errorText = await response.text()
          console.log(`❌ FAILED - Error: ${errorText}`)
          
          // Parse specific error
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.errors?.[0]) {
              console.log(`🔍 Error Code: ${errorData.errors[0].code}`)
              console.log(`🔍 Error Message: ${errorData.errors[0].message}`)
            }
          } catch (e) {
            // Not JSON error
          }
        }
        
      } catch (fetchError) {
        console.log(`❌ Request failed: ${fetchError.message}`)
      }
    }
    
    // Step 3: Check seller authorization
    console.log('\n🔑 Step 3: Authorization Analysis...')
    console.log('Possible Issues:')
    console.log('1. Seller needs to re-authorize your SP-API app')
    console.log('2. Refresh token may be expired')
    console.log('3. App may not have the right permissions for this seller')
    console.log('4. Seller ID mismatch between authorization and database')
    
    console.log('\n📋 Next Steps:')
    console.log('- Check if seller needs to re-connect/authorize')
    console.log('- Verify seller ID matches the one who authorized your app')
    console.log('- Check Amazon Seller Central for authorization status')
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  }
}

diagnoseSPAPI().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })