import { NextRequest, NextResponse } from 'next/server'
import { SmartNotificationAgent } from '@/lib/agents/smart-notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, title, message, urgency = 'normal', action = 'send' } = body

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'send':
        if (!title || !message) {
          return NextResponse.json(
            { error: 'title and message are required for send action' },
            { status: 400 }
          )
        }
        
        await SmartNotificationAgent.sendOptimizedNotification({
          sellerId,
          title,
          message,
          urgency,
          context: { api_triggered: true, timestamp: new Date().toISOString() }
        })
        
        result = { 
          message: 'AI-optimized notification sent successfully',
          optimization: 'Content was analyzed and optimized based on seller response patterns'
        }
        break

      case 'bulk_optimize':
        // This would typically be run as a cron job
        await SmartNotificationAgent.optimizeAllSellerNotifications()
        result = { message: 'Bulk notification optimization completed for all active sellers' }
        break

      case 'test_optimization':
        // Test the optimization without sending
        const testNotification = {
          sellerId,
          title: title || 'Test Revenue Alert',
          message: message || 'Your products are performing well this week with several optimization opportunities identified.',
          urgency: urgency as 'low' | 'normal' | 'high' | 'critical'
        }
        
        result = {
          message: 'Optimization test completed',
          original: testNotification,
          note: 'Use action=send to actually send optimized notification'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: send, bulk_optimize, or test_optimization' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      sellerId,
      action,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('Smart notification API failed:', error)
    return NextResponse.json(
      { 
        error: 'Operation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'Smart Notification API - AI-powered notification optimization',
      description: 'Uses OpenAI to optimize notification content based on seller response patterns',
      features: [
        'Analyzes seller response history',
        'Optimizes title and message content',
        'Learns from engagement patterns',
        'Maintains professional tone',
        'Fallback to regular notifications if optimization fails'
      ],
      usage: {
        send: 'POST with { "sellerId", "title", "message", "urgency", "action": "send" }',
        bulk: 'POST with { "sellerId": "any", "action": "bulk_optimize" }',
        test: 'POST with { "sellerId", "title", "message", "action": "test_optimization" }'
      },
      requirements: {
        openai_api_key: 'Required for AI optimization',
        composio_api_key: 'Required for email/WhatsApp delivery',
        database: 'Used for pattern analysis and tracking'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get API info' },
      { status: 500 }
    )
  }
}