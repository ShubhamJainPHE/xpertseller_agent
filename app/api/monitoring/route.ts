import { NextRequest, NextResponse } from 'next/server'
import { dataSyncMonitor } from '@/lib/monitoring/data-sync-monitor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'dashboard':
        const dashboard = await dataSyncMonitor.getMonitoringDashboard()
        return NextResponse.json(dashboard)

      case 'health':
        const healthMetrics = await dataSyncMonitor.performHealthCheck()
        return NextResponse.json(healthMetrics)

      case 'sync-status':
        const sellerId = searchParams.get('sellerId')
        if (!sellerId) {
          return NextResponse.json({ error: 'sellerId required for sync-status' }, { status: 400 })
        }
        const syncStatus = await dataSyncMonitor.getSyncStatus(sellerId)
        return NextResponse.json(syncStatus)

      default:
        // Default: return monitoring dashboard
        const defaultDashboard = await dataSyncMonitor.getMonitoringDashboard()
        return NextResponse.json(defaultDashboard)
    }

  } catch (error) {
    console.error('❌ Monitoring API error:', error)
    return NextResponse.json(
      { 
        error: 'Monitoring request failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, intervalMinutes } = body

    switch (action) {
      case 'start':
        await dataSyncMonitor.startMonitoring(intervalMinutes || 5)
        return NextResponse.json({ 
          message: 'Monitoring started successfully',
          intervalMinutes: intervalMinutes || 5,
          timestamp: new Date().toISOString()
        })

      case 'stop':
        await dataSyncMonitor.stopMonitoring()
        return NextResponse.json({ 
          message: 'Monitoring stopped successfully',
          timestamp: new Date().toISOString()
        })

      case 'force-sync':
        await dataSyncMonitor.triggerAutoSync()
        return NextResponse.json({ 
          message: 'Force sync triggered successfully',
          timestamp: new Date().toISOString()
        })

      case 'health-check':
        const healthMetrics = await dataSyncMonitor.performHealthCheck()
        return NextResponse.json({
          message: 'Health check completed',
          metrics: healthMetrics,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Monitoring control error:', error)
    return NextResponse.json(
      { 
        error: 'Monitoring control failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}