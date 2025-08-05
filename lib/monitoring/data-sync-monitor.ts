import { createClient } from '@supabase/supabase-js'

interface SyncStatus {
  sellerId: string
  lastSyncAt: string | null
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error'
  inventoryCount: number
  ordersCount: number
  productsCount: number
  lastError: string | null
}

interface MonitoringMetrics {
  totalSellers: number
  activeSellers: number
  totalInventoryItems: number
  totalOrders: number
  totalProducts: number
  lastSyncErrors: string[]
  systemHealth: 'healthy' | 'warning' | 'critical'
}

export class DataSyncMonitor {
  private supabase: any
  private isMonitoring = false
  private monitorInterval: NodeJS.Timeout | null = null

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async startMonitoring(intervalMinutes = 5) {
    if (this.isMonitoring) {
      console.log('🔄 Monitoring already active')
      return
    }

    this.isMonitoring = true
    console.log(`🚀 Starting data sync monitoring (every ${intervalMinutes} minutes)`)

    // Initial sync and health check
    await this.performHealthCheck()

    // Set up recurring monitoring
    this.monitorInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
        await this.triggerAutoSync()
      } catch (error) {
        console.error('❌ Monitoring cycle failed:', error)
      }
    }, intervalMinutes * 60 * 1000)
  }

  async stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('⏹️ Data sync monitoring stopped')
  }

  async performHealthCheck(): Promise<MonitoringMetrics> {
    console.log('🏥 Performing system health check...')

    try {
      // Get seller statistics
      const { data: sellersData, error: sellersError } = await this.supabase
        .from('sellers')
        .select('id, last_sync_at, sync_status, sp_api_credentials')

      if (sellersError) throw sellersError

      const totalSellers = sellersData.length
      const activeSellers = sellersData.filter((s: any) => s.sp_api_credentials).length

      // Get inventory count
      const { count: inventoryCount } = await this.supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })

      // Get orders count
      const { count: ordersCount } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Get products count
      const { count: productsCount } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Check for recent sync errors
      const { data: errorLogs } = await this.supabase
        .from('sync_logs')
        .select('error_message, created_at')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(5)

      const lastSyncErrors = errorLogs?.map((log: any) => log.error_message) || []

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (lastSyncErrors.length > 3) {
        systemHealth = 'critical'
      } else if (lastSyncErrors.length > 0 || activeSellers === 0) {
        systemHealth = 'warning'
      }

      const metrics: MonitoringMetrics = {
        totalSellers,
        activeSellers,
        totalInventoryItems: inventoryCount || 0,
        totalOrders: ordersCount || 0,
        totalProducts: productsCount || 0,
        lastSyncErrors,
        systemHealth
      }

      console.log('📊 System Health Report:')
      console.log(`  Sellers: ${activeSellers}/${totalSellers} active`)
      console.log(`  Inventory Items: ${metrics.totalInventoryItems}`)
      console.log(`  Orders: ${metrics.totalOrders}`)
      console.log(`  Products: ${metrics.totalProducts}`)
      console.log(`  System Health: ${systemHealth.toUpperCase()}`)

      // Store health metrics
      await this.storeHealthMetrics(metrics)

      return metrics

    } catch (error) {
      console.error('❌ Health check failed:', error)
      throw error
    }
  }

  async triggerAutoSync() {
    console.log('🔄 Checking for sellers needing sync...')

    try {
      // Get sellers that need syncing (last sync > 1 hour ago or never synced)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      const { data: sellersToSync, error } = await this.supabase
        .from('sellers')
        .select('id, email, last_sync_at')
        .not('sp_api_credentials', 'is', null)
        .or(`last_sync_at.is.null,last_sync_at.lt.${oneHourAgo}`)

      if (error) throw error

      if (sellersToSync.length === 0) {
        console.log('✅ All sellers are up to date')
        return
      }

      console.log(`🚀 Found ${sellersToSync.length} sellers needing sync`)

      for (const seller of sellersToSync) {
        try {
          console.log(`🔄 Syncing data for seller: ${seller.email}`)
          
          // Trigger sync via API endpoint
          const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/amazon/sync?sellerId=${seller.id}`)
          
          if (syncResponse.ok) {
            const syncResult = await syncResponse.json()
            console.log(`✅ Sync completed for ${seller.email}:`, {
              inventory: syncResult.syncResults?.inventory?.itemCount || 0,
              orders: syncResult.syncResults?.orders?.itemCount || 0
            })

            // Log successful sync
            await this.logSyncResult(seller.id, 'success', syncResult)
          } else {
            const errorText = await syncResponse.text()
            console.error(`❌ Sync failed for ${seller.email}:`, errorText)
            
            // Log failed sync
            await this.logSyncResult(seller.id, 'error', { error: errorText })
          }

        } catch (syncError) {
          console.error(`❌ Sync error for seller ${seller.id}:`, syncError)
          await this.logSyncResult(seller.id, 'error', { error: syncError })
        }

        // Wait 2 seconds between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } catch (error) {
      console.error('❌ Auto-sync failed:', error)
    }
  }

  async getSyncStatus(sellerId: string): Promise<SyncStatus | null> {
    try {
      const { data: seller, error } = await this.supabase
        .from('sellers')
        .select('id, last_sync_at, sync_status')
        .eq('id', sellerId)
        .single()

      if (error || !seller) return null

      // Get counts for this seller
      const [inventoryResult, ordersResult, productsResult] = await Promise.all([
        this.supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId),
        this.supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId),
        this.supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', sellerId)
      ])

      // Get last error if any
      const { data: lastError } = await this.supabase
        .from('sync_logs')
        .select('error_message')
        .eq('seller_id', sellerId)
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        sellerId,
        lastSyncAt: seller.last_sync_at,
        syncStatus: seller.sync_status || 'idle',
        inventoryCount: inventoryResult.count || 0,
        ordersCount: ordersResult.count || 0,
        productsCount: productsResult.count || 0,
        lastError: lastError?.error_message || null
      }

    } catch (error) {
      console.error('Error getting sync status:', error)
      return null
    }
  }

  private async storeHealthMetrics(metrics: MonitoringMetrics) {
    try {
      const { error } = await this.supabase
        .from('system_health_logs')
        .insert({
          total_sellers: metrics.totalSellers,
          active_sellers: metrics.activeSellers,
          total_inventory: metrics.totalInventoryItems,
          total_orders: metrics.totalOrders,
          total_products: metrics.totalProducts,
          system_health: metrics.systemHealth,
          error_count: metrics.lastSyncErrors.length,
          recorded_at: new Date().toISOString()
        })

      if (error) {
        console.warn('Could not store health metrics:', error.message)
      }
    } catch (error) {
      console.warn('Health metrics storage failed:', error)
    }
  }

  private async logSyncResult(sellerId: string, status: string, result: any) {
    try {
      const { error } = await this.supabase
        .from('sync_logs')
        .insert({
          seller_id: sellerId,
          sync_type: 'full_sync',
          status,
          items_synced: result.syncResults ? 
            (result.syncResults.inventory?.itemCount || 0) + (result.syncResults.orders?.itemCount || 0) : 0,
          error_message: result.error || null,
          sync_details: result,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })

      if (error) {
        console.warn('Could not log sync result:', error.message)
      }
    } catch (error) {
      console.warn('Sync logging failed:', error)
    }
  }

  async getMonitoringDashboard() {
    try {
      const healthMetrics = await this.performHealthCheck()
      
      // Get sync history for the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: recentSyncs } = await this.supabase
        .from('sync_logs')
        .select('*')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(20)

      // Get all active sellers with their status
      const { data: sellers } = await this.supabase
        .from('sellers')
        .select('id, email, last_sync_at, sync_status')
        .not('sp_api_credentials', 'is', null)

      const sellerStatuses = await Promise.all(
        sellers?.map(seller => this.getSyncStatus(seller.id)) || []
      ).then(statuses => statuses.filter(Boolean))

      return {
        systemHealth: healthMetrics,
        recentSyncs: recentSyncs || [],
        sellerStatuses,
        isMonitoring: this.isMonitoring,
        lastChecked: new Date().toISOString()
      }

    } catch (error) {
      console.error('Dashboard data retrieval failed:', error)
      throw error
    }
  }
}

// Singleton instance
export const dataSyncMonitor = new DataSyncMonitor()