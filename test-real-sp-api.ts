import { createClient } from '@supabase/supabase-js'
import { SPApiService } from './lib/services/sp-api.js'

async function testWithRealCredentials() {
  try {
    const supabase = createClient(
      'https://uvfjofawxsmrdpaxxptg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5NjgzMywiZXhwIjoyMDY5MzcyODMzfQ.vZngCRA4_TyRSfzrfhhaXle532LRbtfxd5FFgQEOXYo'
    )
    
    console.log('🔍 Getting real credentials from database...')
    
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('sp_api_credentials, amazon_seller_id')
      .eq('id', '134629c6-98a6-4e46-a6bc-865bc29cda2c')
      .single()
      
    if (error || !seller) {
      console.error('Failed to get seller:', error)
      return
    }
    
    const creds = seller.sp_api_credentials
    console.log('📋 Using real credentials from OAuth flow...')
    
    // Create SP-API service with real credentials
    const spApiCredentials = {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken: creds.refreshToken,
      sellerId: seller.amazon_seller_id,
      marketplaceId: 'ATVPDKIKX0DER'
    }
    
    const spApiService = new SPApiService(spApiCredentials)
    console.log('✅ SP-API service created')
    
    // Test credentials validation
    console.log('🔐 Validating credentials with Amazon...')
    const validation = await spApiService.validateCredentials()
    
    if (!validation.valid) {
      console.error('❌ Credentials invalid:', validation.error)
      return
    }
    
    console.log('✅ Credentials validated with Amazon!')
    
    // Test inventory fetch
    console.log('📦 Testing inventory fetch...')
    const inventory = await spApiService.getInventorySummary()
    console.log(`📊 Inventory items found: ${inventory.length}`)
    
    if (inventory.length > 0) {
      console.log('Sample inventory item:', JSON.stringify(inventory[0], null, 2))
    }
    
    // Test orders fetch
    console.log('📋 Testing orders fetch...')
    const orders = await spApiService.getOrders()
    console.log(`📊 Orders found: ${orders.length}`)
    
    if (orders.length > 0) {
      console.log('Sample order:', JSON.stringify(orders[0], null, 2))
    }
    
    console.log('🎉 SP-API connection test successful!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testWithRealCredentials()