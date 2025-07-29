import { NextRequest, NextResponse } from 'next/server'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, analysisType = 'full' } = body

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }

    console.log(`🚀 Starting ${analysisType} analysis for seller: ${sellerId}`)

    let result: any = {}

    switch (analysisType) {
      case 'full':
        await AgentOrchestrator.runAnalysisCycle(sellerId)
        result = { message: 'Full analysis cycle completed successfully' }
        break
        
      case 'urgent':
        await AgentOrchestrator.processUrgentEvents()
        result = { message: 'Urgent events processed successfully' }
        break
        
      case 'health':
        result = await AgentOrchestrator.performHealthCheck()
        break
        
      case 'stats':
        result = await AgentOrchestrator.getSystemStats()
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type. Use: full, urgent, health, or stats' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      sellerId,
      analysisType,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('Agent analysis failed:', error)
    return NextResponse.json(
      { 
        error: 'Analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'stats'

    let result: any = {}

    switch (action) {
      case 'health':
        result = await AgentOrchestrator.performHealthCheck()
        break
        
      case 'stats':
        result = await AgentOrchestrator.getSystemStats()
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: health or stats' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('Agent query failed:', error)
    return NextResponse.json(
      { 
        error: 'Query failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}