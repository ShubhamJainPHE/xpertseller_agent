import { NextRequest, NextResponse } from 'next/server'
import { MockPredictiveAgent } from '@/lib/agents/mock-predictive-agent'
import { supabaseAdmin } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sellerId = searchParams.get('sellerId')
  
  if (!sellerId) {
    return NextResponse.json({ error: 'sellerId required' }, { status: 400 })
  }
  
  return NextResponse.json({ 
    message: `Mock AI Copilot ready for seller: ${sellerId}`,
    status: 'ready',
    features: ['predictive_analysis', 'notifications', 'demo_mode']
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, action } = body
    
    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId required' }, { status: 400 })
    }
    
    console.log(`🤖 Mock AI Copilot: ${action} for seller ${sellerId}`)
    
    // Verify seller exists
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, email')
      .eq('id', sellerId)
      .single()
    
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }
    
    switch (action) {
      case 'predict_problems':
        const predictions = await MockPredictiveAgent.analyzeAndPredict(sellerId)
        return NextResponse.json({
          success: true,
          action: 'predict_problems',
          data: {
            seller_id: sellerId,
            predictions_count: predictions.length,
            predictions: predictions,
            mode: 'demo',
            message: 'Predictions generated using available data. Full analysis will be available once SP-API is connected.'
          }
        })
      
      case 'health_check':
        // Check database connectivity
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('count')
          .eq('seller_id', sellerId)
        
        const { data: sales } = await supabaseAdmin
          .from('sales_data')
          .select('count')
          .limit(1)
        
        return NextResponse.json({
          success: true,
          action: 'health_check',
          data: {
            seller_id: sellerId,
            database_connected: true,
            tables_available: ['sellers', 'products', 'sales_data'],
            tables_missing: ['advertising_data', 'fact_stream', 'recommendations'],
            openai_configured: !!process.env.OPENAI_API_KEY,
            composio_configured: !!process.env.COMPOSIO_API_KEY,
            mode: 'demo'
          }
        })
      
      case 'test_notification':
        await MockPredictiveAgent.analyzeAndPredict(sellerId)
        return NextResponse.json({
          success: true,
          action: 'test_notification',
          data: {
            message: 'Test notification sent via Composio',
            seller_id: sellerId
          }
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['predict_problems', 'health_check', 'test_notification']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Mock AI Copilot error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      mode: 'demo'
    }, { status: 500 })
  }
}