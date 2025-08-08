// Test different SP-API endpoints to identify region restrictions
import { supabaseAdmin } from '../lib/database/connection'

async function testDifferentEndpoints() {
  console.log('🧪 Testing different SP-API endpoints for region restrictions...')
  
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('sp_api_credentials, amazon_seller_id')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  const creds = seller.sp_api_credentials as any
  const sellerId = seller.amazon_seller_id
  
  const endpoints = [
    {
      name: 'North America',
      url: `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${sellerId}?marketplaceIds=ATVPDKIKX0DER&includedData=summaries`,
      marketplace: 'ATVPDKIKX0DER (US)'
    },
    {
      name: 'Europe',
      url: `https://sellingpartnerapi-eu.amazon.com/listings/2021-08-01/items/${sellerId}?marketplaceIds=A1PA6795UKMFR9&includedData=summaries`,
      marketplace: 'A1PA6795UKMFR9 (Germany)'
    },
    {
      name: 'Far East (for India)',
      url: `https://sellingpartnerapi-fe.amazon.com/listings/2021-08-01/items/${sellerId}?marketplaceIds=A21TJRUUN4KGV&includedData=summaries`,
      marketplace: 'A21TJRUUN4KGV (India)'
    }
  ]
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing ${endpoint.name} (${endpoint.marketplace}):`)
    console.log(`URL: ${endpoint.url.substring(0, 80)}...`)
    
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
        console.log(`✅ SUCCESS! Found ${data.items?.length || 0} items`)
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
  
  console.log(`\n💡 Analysis:`)
  console.log(`   If North America works: Your app is registered for North America only`)
  console.log(`   If all fail: Token/credentials issue`)
  console.log(`   If Far East works: India marketplace is properly configured`)
}

testDifferentEndpoints().then(() => process.exit(0))