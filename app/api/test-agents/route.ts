import { NextRequest, NextResponse } from 'next/server'
import { LossPreventionAgent } from '@/lib/agents/loss-prevention'
import { RevenueOptimizationAgent } from '@/lib/agents/revenue-optimization'
import { NotificationService } from '@/lib/utils/notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, agentType = 'both', testMode = true } = body

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing AI agents for seller: ${sellerId}`)

    let results: any = {}

    if (testMode) {
      // Test mode - just validate setup without running full analysis
      results = {
        message: 'AI Agents Test Mode - Validating Setup',
        composio_installed: true,
        openai_configured: !!process.env.OPENAI_API_KEY,
        composio_configured: !!process.env.COMPOSIO_API_KEY,
        agents_loaded: true,
        test_mode: true
      }
    } else {
      // Full agent execution
      if (agentType === 'loss_prevention' || agentType === 'both') {
        console.log('🛡️ Running Loss Prevention Agent...')
        await LossPreventionAgent.analyzeAndRecommend(sellerId)
        results.loss_prevention = 'completed'
      }

      if (agentType === 'revenue_optimization' || agentType === 'both') {
        console.log('📈 Running Revenue Optimization Agent...')
        await RevenueOptimizationAgent.analyzeAndOptimize(sellerId)
        results.revenue_optimization = 'completed'
      }
    }

    // 🚀 NEW: Send test completion notification
    await sendTestNotification(sellerId, agentType, testMode, results)

    return NextResponse.json({
      success: true,
      sellerId,
      agentType,
      testMode,
      timestamp: new Date().toISOString(),
      results,
      next_steps: testMode ? [
        '1. Complete Composio login: npx composio login',
        '2. Add COMPOSIO_API_KEY to .env.local',
        '3. Test with testMode=false'
      ] : [
        'Check database for new recommendations',
        'Monitor fact_stream for AI actions'
      ]
    })

  } catch (error) {
    console.error('Agent test failed:', error)
    
    // 🚀 NEW: Send error notification
    await sendTestErrorNotification(sellerId, error)
    
    return NextResponse.json(
      { 
        error: 'Agent test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: [
          'Ensure OPENAI_API_KEY is set',
          'Complete Composio login: npx composio login',
          'Verify seller exists in database'
        ]
      },
      { status: 500 }
    )
  }
  
}

/**
 * 🚀 NEW: Send test completion notification
 */
async function sendTestNotification(
  sellerId: string,
  agentType: string,
  testMode: boolean,
  results: any
): Promise<void> {
    try {
      if (testMode) {
        // Test mode notification - just for admin
        if (process.env.ADMIN_EMAIL) {
          await NotificationService.sendNotification({
            sellerId: 'admin',
            title: '🧪 Agent Test Completed (Test Mode)',
            message: `Agent test completed in test mode:\n\nSeller: ${sellerId}\nAgent Type: ${agentType}\nSetup Status: ${JSON.stringify(results, null, 2)}`,
            urgency: 'low'
          })
        }
      } else {
        // Real test notification - send to seller and admin
        const message = `
🤖 AI Agent Test Complete!

Agent Type: ${agentType}
Results: ${JSON.stringify(results, null, 2)}

Your AI agents have been tested and are working properly. Check your dashboard for any new recommendations generated during the test.
        `
        
        await NotificationService.sendNotification({
          sellerId,
          title: '🤖 AI Agent Test Completed',
          message: message.trim(),
          urgency: 'normal',
          link: `${process.env.APP_URL}/dashboard`,
          data: {
            test_timestamp: new Date().toISOString(),
            agent_type: agentType,
            results
          }
        })
        
        // Also notify admin
        if (process.env.ADMIN_EMAIL) {
          await NotificationService.sendNotification({
            sellerId: 'admin',
            title: '📈 Agent Test Completed (Live Mode)',
            message: `Live agent test completed:\n\nSeller: ${sellerId}\nAgent Type: ${agentType}\nResults: ${JSON.stringify(results, null, 2)}`,
            urgency: 'normal'
          })
        }
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }
  
/**
 * 🚀 NEW: Send test error notification
 */
async function sendTestErrorNotification(
  sellerId: string,
  error: any
): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Notify seller about test failure
      await NotificationService.sendNotification({
        sellerId,
        title: '❌ AI Agent Test Failed',
        message: `Your AI agent test encountered an error and could not complete.\n\nError: ${errorMessage}\n\nPlease check your configuration and try again. Contact support if the issue persists.`,
        urgency: 'high',
        data: {
          error_timestamp: new Date().toISOString(),
          error_message: errorMessage,
          test_type: 'agent_test'
        }
      })
      
      // Notify admin about system error
      if (process.env.ADMIN_EMAIL) {
        await NotificationService.sendNotification({
          sellerId: 'admin',
          title: '🚨 System Alert: Agent Test Failed',
          message: `Agent test failed for seller: ${sellerId}\n\nError: ${errorMessage}\n\nTimestamp: ${new Date().toISOString()}`,
          urgency: 'critical'
        })
      }
      
    } catch (notificationError) {
      console.error('Failed to send test error notification:', notificationError)
    }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Agents Test Endpoint',
    usage: 'POST with { sellerId: "uuid", agentType?: "loss_prevention"|"revenue_optimization"|"both", testMode?: boolean }',
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      composio_configured: !!process.env.COMPOSIO_API_KEY,
      node_env: process.env.NODE_ENV
    }
  })
}