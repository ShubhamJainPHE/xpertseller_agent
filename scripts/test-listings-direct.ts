// Test direct SP-API listings call to check for products
import { supabaseAdmin } from '../lib/database/connection'

async function testDirectListingsCall() {
  console.log('🔍 Testing direct SP-API listings call...')
  
  // Get seller credentials directly
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('sp_api_credentials, amazon_seller_id')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  if (!seller || !seller.sp_api_credentials) {
    console.log('❌ No credentials found')
    return
  }
  
  const creds = seller.sp_api_credentials as any
  const accessToken = creds.accessToken
  const sellerId = seller.amazon_seller_id
  
  console.log('✅ Found credentials')
  console.log('🏷️ Seller ID:', sellerId)
  
  // Test direct SP-API call with US region
  const url = `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${sellerId}?marketplaceIds=ATVPDKIKX0DER&includedData=summaries,attributes,fulfillmentAvailability,procurement`
  
  console.log('🔗 Testing URL:', url.substring(0, 100) + '...')
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ SUCCESS!')
      console.log('📋 Response keys:', Object.keys(data))
      
      if (data.items) {
        console.log(`📦 Found ${data.items.length} listings!`)
        if (data.items.length > 0) {
          console.log('📋 First item:', JSON.stringify(data.items[0], null, 2))
        }
      } else {
        console.log('📭 No items array in response')
        console.log('Full response:', JSON.stringify(data, null, 2))
      }
    } else {
      const errorText = await response.text()
      console.log('❌ Error Response:', errorText)
    }
    
  } catch (fetchError) {
    console.log('❌ Fetch Error:', fetchError.message)
  }
}

testDirectListingsCall().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })