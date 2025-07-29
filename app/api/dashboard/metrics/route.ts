import { NextRequest, NextResponse } from 'next/server'
import { DashboardCalculations } from '@/lib/dashboard/calculations'

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

    // Calculate all dashboard metrics
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