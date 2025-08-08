// Test basic SP-API endpoints that should work in draft status
import { supabaseAdmin } from '../lib/database/connection'

async function testBasicEndpoints() {
  console.log('🧪 Testing basic SP-API endpoints that should work in draft status...')
  
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('sp_api_credentials, amazon_seller_id')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  const creds = seller.sp_api_credentials as any
  
  // Test endpoints that should work in draft
  const endpoints = [
    {
      name: 'Account Status',
      url: 'https://sellingpartnerapi-na.amazon.com/sellers/v1/account'
    },
    {
      name: 'Marketplace Participations',
      url: 'https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations'
    }
  ]
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing ${endpoint.name}:`)
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'x-amz-access-token': creds.accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ SUCCESS!`)
        console.log(`📋 Response:`, JSON.stringify(data, null, 2))
      } else {
        const errorText = await response.text()
        try {
          const parsed = JSON.parse(errorText)
          console.log(`❌ Error: ${parsed.errors?.[0]?.message || 'Unknown error'}`)
          if (parsed.errors?.[0]?.details) {
            console.log(`   Details: ${parsed.errors[0].details}`)
          }
        } catch (e) {
          console.log(`❌ Raw Error: ${errorText}`)
        }
      }
    } catch (error) {
      console.error(`❌ Fetch Error: ${(error as Error).message}`)
    }
  }
}

testBasicEndpoints().then(() => process.exit(0))