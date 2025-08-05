import { createClient } from '@supabase/supabase-js'
import { createSPApiService } from './lib/services/sp-api.js'

async function testSyncEndpoint() {
  try {
    const supabase = createClient(
      'https://uvfjofawxsmrdpaxxptg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5NjgzMywiZXhwIjoyMDY5MzcyODMzfQ.vZngCRA4_TyRSfzrfhhaXle532LRbtfxd5FFgQEOXYo'
    )
    
    const sellerId = '134629c6-98a6-4e46-a6bc-865bc29cda2c'
    
    console.log('🚀 Testing manual sync for seller:', sellerId)
    
    // Create SP-API service
    const spApiService = await createSPApiService(sellerId)
    if (!spApiService) {
      console.error('❌ Failed to create SP-API service')
      return
    }
    
    // Test credentials
    const validation = await spApiService.validateCredentials()
    if (!validation.valid) {
      console.error('❌ Invalid credentials:', validation.error)
      return
    }
    
    console.log('✅ Credentials valid - starting manual sync...')
    
    const results = {
      sellerId,
      timestamp: new Date().toISOString(),
      credentialsValid: true,
      syncResults: {} as any
    }
    
    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        seller_id: sellerId,
        sync_type: 'manual_test',
        status: 'started',
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    let totalItemsSynced = 0
    
    // Test inventory sync
    try {
      console.log('📦 Testing inventory sync...')
      const inventory = await spApiService.getInventorySummary()
      
      results.syncResults.inventory = {
        success: true,
        itemCount: inventory.length,
        message: `Found ${inventory.length} inventory items`
      }
      
      totalItemsSynced += inventory.length
      console.log(`✅ Inventory: ${inventory.length} items`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isPermissionError = errorMessage.includes('403') || errorMessage.includes('Forbidden')
      
      results.syncResults.inventory = {
        success: false,
        error: errorMessage,
        permissionIssue: isPermissionError,
        suggestion: isPermissionError ? 'No FBA inventory permissions' : 'Network/config issue'
      }
      
      console.log('❌ Inventory sync failed:', errorMessage)
    }
    
    // Test orders sync
    try {
      console.log('📋 Testing orders sync...')
      const orders = await spApiService.getOrders()
      
      results.syncResults.orders = {
        success: true,
        itemCount: orders.length,
        message: `Found ${orders.length} recent orders`
      }
      
      totalItemsSynced += orders.length
      console.log(`✅ Orders: ${orders.length} items`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isPermissionError = errorMessage.includes('403') || errorMessage.includes('Forbidden')
      
      results.syncResults.orders = {
        success: false,
        error: errorMessage,
        permissionIssue: isPermissionError,
        suggestion: isPermissionError ? 'No Orders API permissions' : 'Network/config issue'
      }
      
      console.log('❌ Orders sync failed:', errorMessage)
    }
    
    // Update sync log
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_synced: totalItemsSynced,
          sync_details: results
        })
        .eq('id', syncLog.id)
    }
    
    // Update seller sync status
    await supabase
      .from('sellers')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'completed'
      })
      .eq('id', sellerId)
    
    console.log('\n🎉 Manual sync test completed!')
    console.log('📊 Results:', JSON.stringify(results, null, 2))
    
    return results
    
  } catch (error) {
    console.error('❌ Sync test failed:', error)
  }
}

testSyncEndpoint()