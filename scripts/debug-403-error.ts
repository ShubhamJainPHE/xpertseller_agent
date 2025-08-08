// Debug 403 error details
import { supabaseAdmin } from '../lib/database/connection'

async function debug403Error() {
  console.log('🔍 Debugging 403 error details...')
  
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('sp_api_credentials, amazon_seller_id')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  const creds = seller.sp_api_credentials as any
  const url = `https://sellingpartnerapi-fe.amazon.com/listings/2021-08-01/items/${seller.amazon_seller_id}?marketplaceIds=A21TJRUUN4KGV&includedData=summaries`
  
  console.log(`🔗 Testing URL: ${url}`)
  console.log(`🔑 Access Token (first 20 chars): ${creds.accessToken.substring(0, 20)}...`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'x-amz-access-token': creds.accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Response: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`📋 Full Response Body:`)
    console.log(responseText)
    
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText)
        console.log(`📝 Parsed Error:`, JSON.stringify(parsed, null, 2))
      } catch (e) {
        console.log(`📝 Raw Response:`, responseText)
      }
    }
    
  } catch (error) {
    console.error(`❌ Fetch Error:`, (error as Error).message)
  }
}

debug403Error().then(() => process.exit(0))