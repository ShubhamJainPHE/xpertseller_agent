import { createSPApiService } from './lib/services/sp-api'
import { createClient } from '@supabase/supabase-js'

async function testSPApiSync() {
  try {
    console.log('🚀 Testing SP-API sync for your seller...')
    
    const supabase = createClient(
      'https://uvfjofawxsmrdpaxxptg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5NjgzMywiZXhwIjoyMDY5MzcyODMzfQ.vZngCRA4_TyRSfzrfhhaXle532LRbtfxd5FFgQEOXYo'
    )
    
    const sellerId = '134629c6-98a6-4e46-a6bc-865bc29cda2c'
    
    // Test SP-API service creation
    console.log('📡 Creating SP-API service...')
    const spApiService = await createSPApiService(sellerId)
    
    if (!spApiService) {
      console.error('❌ Failed to create SP-API service')
      return
    }
    
    console.log('✅ SP-API service created successfully')
    
    // Test credentials validation
    console.log('🔐 Validating SP-API credentials...')
    const validation = await spApiService.validateCredentials()
    
    if (!validation.valid) {
      console.error('❌ SP-API credentials invalid:', validation.error)
      return
    }
    
    console.log('✅ SP-API credentials validated successfully!')
    
    // Test getting inventory data
    console.log('📦 Fetching inventory data...')
    try {
      const inventory = await spApiService.getInventorySummary()
      console.log(`📊 Inventory Response:`, JSON.stringify(inventory, null, 2))
      
      if (inventory.length > 0) {
        console.log(`✅ Found ${inventory.length} inventory items`)
      } else {
        console.log('ℹ️ No inventory items returned (this might be normal)')
      }
    } catch (invError) {
      console.error('❌ Inventory fetch failed:', invError)
    }
    
    // Test getting orders
    console.log('📋 Fetching recent orders...')
    try {
      const orders = await spApiService.getOrders()
      console.log(`📊 Orders Response:`, JSON.stringify(orders, null, 2))
      
      if (orders.length > 0) {
        console.log(`✅ Found ${orders.length} recent orders`)
      } else {
        console.log('ℹ️ No recent orders returned (this might be normal)')
      }
    } catch (ordError) {
      console.error('❌ Orders fetch failed:', ordError)
    }
    
    console.log('🎉 SP-API connectivity test completed!')
    
  } catch (error) {
    console.error('❌ SP-API sync test failed:', error)
  }
}

testSPApiSync()