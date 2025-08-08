// Check authorization for India marketplace
import { supabaseAdmin } from '../lib/database/connection'

async function checkAuth() {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('sp_api_credentials')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
  
  if (error || !seller) {
    console.log('❌ Seller not found:', error)
    return
  }
  
  const creds = seller.sp_api_credentials as any
  console.log('🔍 Current authorization details:')
  console.log('Client ID:', creds.clientId)
  console.log('Has refresh token:', creds.refreshToken ? 'YES' : 'NO')
  console.log('Has access token:', creds.accessToken ? 'YES' : 'NO')
  
  if (creds.accessToken) {
    const url = `https://sellingpartnerapi-fe.amazon.com/listings/2021-08-01/items/A14IOOJN7DLJME?marketplaceIds=A21TJRUUN4KGV&includedData=summaries`
    
    console.log('🧪 Testing direct API call with India marketplace...')
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'x-amz-access-token': creds.accessToken,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`Response status: ${response.status} ${response.statusText}`)
      
      if (response.status === 403) {
        const errorText = await response.text()
        console.log('❌ 403 Error details:', errorText)
        console.log('💡 This suggests the seller needs to re-authorize for India marketplace')
        console.log('🔗 The current authorization might only be valid for US marketplace')
      } else if (response.ok) {
        const data = await response.json()
        console.log('✅ SUCCESS! Found data:', Object.keys(data))
      } else {
        const errorText = await response.text()
        console.log(`❌ ${response.status} Error:`, errorText)
      }
    } catch (error) {
      console.error('❌ Request failed:', (error as Error).message)
    }
  }
}

checkAuth().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })