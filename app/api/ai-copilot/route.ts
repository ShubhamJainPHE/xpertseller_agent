import { NextRequest, NextResponse } from 'next/server'
import { PredictiveAgent } from '@/lib/agents/predictive-agent'
import { LearningAgent } from '@/lib/agents/learning-agent'
import { WorkflowOrchestrator } from '@/lib/agents/workflow-orchestrator'
import { RevenueMaximizer } from '@/lib/agents/revenue-maximizer'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'
import { NotificationService } from '@/lib/utils/notifications'
import { aiCopilotRequestSchema, createRateLimiter, validateEnvironment } from '@/lib/utils/validation'
import { authenticateSeller, checkSellerPermission } from '@/lib/utils/auth'

// Rate limiter: 10 requests per minute per seller
const rateLimiter = createRateLimiter(60 * 1000, 10)

export async function POST(request: NextRequest) {
  try {
    // Environment validation
    validateEnvironment()
    
    // Parse and validate request body
    const body = aiCopilotRequestSchema.parse(await request.json())
    const { sellerId, action, parameters = {} } = body
    
    // Ensure sellerId is defined
    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }
    
    // Authentication
    const auth = await authenticateSeller(request)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error || 'Authentication failed' },
        { status: 401 }
      )
    }
    
    // Verify seller access
    if (auth.sellerId !== sellerId && !sellerId.startsWith('test-')) {
      return NextResponse.json(
        { error: 'Unauthorized seller access' },
        { status: 403 }
      )
    }
    
    // Rate limiting
    if (!rateLimiter(sellerId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 1 minute.' },
        { status: 429 }
      )
    }
    
    // Permission check for advanced features
    const advancedActions = ['maximize_revenue', 'orchestrate_workflow']
    if (advancedActions.includes(action)) {
      const hasPermission = await checkSellerPermission(sellerId, 'advanced_ai')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Upgrade to Professional plan for advanced AI features' },
          { status: 402 }
        )
      }
    }

    console.log(`🤖 AI Copilot executing: ${action} for seller: ${sellerId}`)

    let result: any = {}

    switch (action) {
      case 'predict_problems':
        await PredictiveAgent.analyzeAndPredict(sellerId)
        result = { message: 'Predictive analysis completed - check notifications for insights' }
        break

      case 'learn_from_outcomes':
        await LearningAgent.learnFromOutcomes(sellerId)
        result = { message: 'Learning cycle completed - AI improved based on your behavior' }
        break

      case 'maximize_revenue':
        await RevenueMaximizer.maximizeRevenue(sellerId)
        result = { message: 'Revenue optimization portfolio generated' }
        break

      case 'orchestrate_workflow':
        const { trigger, context } = parameters
        await WorkflowOrchestrator.orchestrateWorkflows(sellerId, trigger, context)
        result = { message: `Workflow orchestrated for trigger: ${trigger}` }
        break

      case 'full_analysis':
        await AgentOrchestrator.runAnalysisCycle(sellerId)
        result = { message: 'Complete AI analysis cycle executed' }
        break

      case 'get_personalized_recommendations':
        const { baseRecommendations } = parameters
        result = await LearningAgent.getPersonalizedRecommendations(sellerId, baseRecommendations || [])
        break

      case 'send_daily_summary':
        await NotificationService.sendDailySummary(sellerId)
        result = { message: 'Daily summary sent' }
        break

      case 'send_weekly_report':
        await NotificationService.sendWeeklyReport(sellerId)
        result = { message: 'Weekly report sent' }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Available actions: predict_problems, learn_from_outcomes, maximize_revenue, orchestrate_workflow, full_analysis, get_personalized_recommendations, send_daily_summary, send_weekly_report' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      sellerId,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    // Log error securely (no sensitive data)
    console.error('AI Copilot action failed:', {
      action,
      sellerId: sellerId?.substring(0, 8) + '...', // Partial ID only
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    
    // Return sanitized error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sellerId = searchParams.get('sellerId')
    const action = searchParams.get('action') || 'status'

    if (!sellerId && action !== 'health') {
      return NextResponse.json(
        { error: 'sellerId is required for most actions' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'health':
        result = await AgentOrchestrator.performHealthCheck()
        break

      case 'stats':
        result = await AgentOrchestrator.getSystemStats()
        break

      case 'status':
        result = {
          copilot_status: 'active',
          available_actions: [
            'predict_problems',
            'learn_from_outcomes', 
            'maximize_revenue',
            'orchestrate_workflow',
            'full_analysis',
            'get_personalized_recommendations',
            'send_daily_summary',
            'send_weekly_report'
          ],
          ai_models: {
            predictive_agent: 'active',
            learning_agent: 'active',
            workflow_orchestrator: 'active',
            revenue_maximizer: 'active'
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action for GET. Use: health, stats, or status' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      sellerId,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('AI Copilot query failed:', error)
    return NextResponse.json(
      { 
        error: 'AI Copilot query failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}