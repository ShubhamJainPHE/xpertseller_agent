// Test alternative SP-API endpoints that might work in Draft mode
import { supabaseAdmin } from '../lib/database/connection'

async function testAlternativeEndpoints() {
  console.log('🧪 Testing alternative SP-API endpoints for Draft apps...')
  
  try {
    // Get fresh token
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('sp_api_credentials')
      .eq('email', 'shubhjjj66@gmail.com')
      .single()
    
    if (!seller?.sp_api_credentials) {
      console.log('❌ No credentials found')
      return
    }
    
    const creds = seller.sp_api_credentials as any
    const accessToken = creds.accessToken
    
    console.log('🔑 Using fresh access token...')
    
    // Test different endpoints that Draft apps might allow
    const testEndpoints = [
      {
        name: 'Seller Account Info',
        url: 'https://sellingpartnerapi-na.amazon.com/sellers/v1/account',
        description: 'Basic account information'
      },
      {
        name: 'Application Authorization',
        url: 'https://sellingpartnerapi-na.amazon.com/authorization/v1/authorizationCode',
        description: 'App authorization status'
      },
      {
        name: 'Restricted Data Token',
        url: 'https://sellingpartnerapi-na.amazon.com/tokens/2021-03-01/restrictedDataToken',
        method: 'POST',
        body: {
          restrictedResources: [{
            method: 'GET',
            path: '/orders/v0/orders',
            dataElements: ['buyerInfo']
          }]
        },
        description: 'Generate restricted access token'
      }
    ]
    
    for (const endpoint of testEndpoints) {
      console.log(`\n🧪 Testing: ${endpoint.name}`)
      console.log(`📝 ${endpoint.description}`)
      
      try {
        const options = {
          method: endpoint.method || 'GET',
          headers: {
            'x-amz-access-token': accessToken,
            'Content-Type': 'application/json'
          },
          ...(endpoint.body && { body: JSON.stringify(endpoint.body) })
        }
        
        const response = await fetch(endpoint.url, options)
        console.log(`Status: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ SUCCESS!')
          console.log('Response keys:', Object.keys(data))
          if (data.payload) {
            console.log('Payload type:', typeof data.payload)
          }
        } else {
          const errorText = await response.text()
          console.log('❌ Failed:', errorText.substring(0, 200))
        }
        
      } catch (error) {
        console.log('❌ Request error:', error.message)
      }
    }
    
    console.log('\n📋 If all endpoints fail with 403:')
    console.log('1. Your SP-API app needs IAM Role configuration')
    console.log('2. Or the app needs to be submitted for review (even for Draft)')
    console.log('3. Or there might be a setup issue in Developer Console')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAlternativeEndpoints().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })