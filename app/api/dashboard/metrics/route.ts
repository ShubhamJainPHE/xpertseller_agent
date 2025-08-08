import { NextRequest, NextResponse } from 'next/server'
import { DashboardCalculations } from '@/lib/dashboard/calculations'
import { supabaseAdmin } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId parameter is required' },
        { status: 400 }
      )
    }

    // Check if seller has recent data, trigger sync if empty
    console.log(`Dashboard metrics: Checking data freshness for seller ${sellerId}`)
    
    const { count: inventoryCount } = await supabaseAdmin
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)

    const { count: ordersCount } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)

    const { count: salesCount } = await supabaseAdmin
      .from('sales_data')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)

    const totalDataCount = (inventoryCount || 0) + (ordersCount || 0) + (salesCount || 0)
    
    // If no data exists, try to trigger a sync (fire-and-forget)
    if (totalDataCount === 0) {
      console.log(`No data found for seller ${sellerId}, attempting to trigger sync...`)
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                       process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                       'http://localhost:3000'
        
        // Fire-and-forget sync request
        fetch(`${baseUrl}/api/amazon/sync?sellerId=${sellerId}`, {
          method: 'GET',
        }).catch(error => {
          console.error('Background sync trigger failed:', error)
        })
        
        console.log('Background sync triggered for seller:', sellerId)
      } catch (error) {
        console.error('Failed to trigger background sync:', error)
        // Continue anyway - return empty data rather than failing
      }
    } else {
      console.log(`Seller ${sellerId} has ${totalDataCount} total records in database`)
    }

    // Calculate all dashboard metrics (will return real data or zeros)
    const metrics = await DashboardCalculations.getAllMetrics(sellerId)

    // Add cache headers for performance
    const response = NextResponse.json(metrics)
    response.headers.set('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    
    return response

  } catch (error) {
    console.error('Dashboard metrics API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, forceRefresh } = body

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }

    // If forceRefresh is true, bypass cache and recalculate
    const metrics = await DashboardCalculations.getAllMetrics(sellerId)

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard metrics refresh error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to refresh dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}