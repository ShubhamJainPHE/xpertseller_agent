'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Play, 
  Pause, 
  RefreshCw,
  TrendingUp,
  Users,
  Package,
  ShoppingCart
} from 'lucide-react'

interface MonitoringData {
  systemHealth: {
    totalSellers: number
    activeSellers: number
    totalInventoryItems: number
    totalOrders: number
    totalProducts: number
    systemHealth: 'healthy' | 'warning' | 'critical'
    lastSyncErrors: string[]
  }
  recentSyncs: Array<{
    seller_id: string
    sync_type: string
    status: string
    items_synced: number
    error_message: string | null
    created_at: string
  }>
  sellerStatuses: Array<{
    sellerId: string
    lastSyncAt: string | null
    syncStatus: string
    inventoryCount: number
    ordersCount: number
    productsCount: number
    lastError: string | null
  }>
  isMonitoring: boolean
  lastChecked: string
}

export default function MonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingMonitoring, setIsStartingMonitoring] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/monitoring?action=dashboard')
      const data = await response.json()
      setMonitoringData(data)
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startMonitoring = async () => {
    setIsStartingMonitoring(true)
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', intervalMinutes: 5 })
      })
      
      if (response.ok) {
        await fetchMonitoringData()
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error)
    } finally {
      setIsStartingMonitoring(false)
    }
  }

  const stopMonitoring = async () => {
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      if (response.ok) {
        await fetchMonitoringData()
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error)
    }
  }

  const forceSync = async () => {
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-sync' })
      })
      
      if (response.ok) {
        // Refresh data after force sync
        setTimeout(fetchMonitoringData, 2000)
      }
    } catch (error) {
      console.error('Failed to force sync:', error)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchMonitoringData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    )
  }

  if (!monitoringData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Monitoring Data Unavailable</h2>
          <p className="text-gray-600 mb-4">Unable to load monitoring data</p>
          <Button onClick={fetchMonitoringData}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">XpertSeller Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time system monitoring and data sync status</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={forceSync}>
            <Database className="h-4 w-4 mr-2" />
            Force Sync
          </Button>
          
          {!monitoringData.isMonitoring ? (
            <Button 
              onClick={startMonitoring} 
              disabled={isStartingMonitoring}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              {isStartingMonitoring ? 'Starting...' : 'Start Monitoring'}
            </Button>
          ) : (
            <Button 
              onClick={stopMonitoring}
              variant="destructive"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <Badge className={getHealthBadgeColor(monitoringData.systemHealth.systemHealth)}>
                  {monitoringData.systemHealth.systemHealth.toUpperCase()}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sellers</p>
                <p className="text-2xl font-bold">
                  {monitoringData.systemHealth.activeSellers}/{monitoringData.systemHealth.totalSellers}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Inventory</p>
                <p className="text-2xl font-bold">{monitoringData.systemHealth.totalInventoryItems}</p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{monitoringData.systemHealth.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sellers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sellers">Seller Status</TabsTrigger>
          <TabsTrigger value="sync-history">Sync History</TabsTrigger>
          <TabsTrigger value="errors">Error Log</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <Card>
            <CardHeader>
              <CardTitle>Seller Sync Status</CardTitle>
              <CardDescription>Current status for all active sellers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monitoringData.sellerStatuses.map((seller) => (
                  <div key={seller.sellerId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(seller.syncStatus)}
                      <div>
                        <p className="font-medium">Seller ID: {seller.sellerId.substring(0, 8)}...</p>
                        <p className="text-sm text-gray-600">
                          Last sync: {seller.lastSyncAt ? new Date(seller.lastSyncAt).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{seller.inventoryCount}</p>
                        <p className="text-gray-600">Inventory</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{seller.ordersCount}</p>
                        <p className="text-gray-600">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{seller.productsCount}</p>
                        <p className="text-gray-600">Products</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {monitoringData.sellerStatuses.length === 0 && (
                  <p className="text-center text-gray-600 py-8">No active sellers found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Last 20 sync operations across all sellers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monitoringData.recentSyncs.map((sync, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(sync.status)}
                      <div>
                        <p className="text-sm font-medium">
                          Seller: {sync.seller_id.substring(0, 8)}... | {sync.sync_type}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(sync.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">{sync.items_synced} items</p>
                      {sync.error_message && (
                        <p className="text-xs text-red-600 max-w-xs truncate">
                          {sync.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {monitoringData.recentSyncs.length === 0 && (
                  <p className="text-center text-gray-600 py-8">No recent sync activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>Recent sync errors and issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monitoringData.systemHealth.lastSyncErrors.map((error, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                ))}
                
                {monitoringData.systemHealth.lastSyncErrors.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-green-600">
                    <CheckCircle className="h-6 w-6 mr-2" />
                    <p>No recent errors - system is running smoothly!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monitoring Status */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${monitoringData.isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm">
                Monitoring: {monitoringData.isMonitoring ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Last checked: {new Date(monitoringData.lastChecked).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}