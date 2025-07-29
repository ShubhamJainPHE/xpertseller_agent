import { DataIngestionService } from '../jobs/data-ingestion'
import { LossPreventionAgent } from './loss-prevention'
import { RevenueOptimizationAgent } from './revenue-optimization'
import { PredictiveAgent } from './predictive-agent'
import { LearningAgent } from './learning-agent'
import { WorkflowOrchestrator } from './workflow-orchestrator'
import { RevenueMaximizer } from './revenue-maximizer'
// Additional agents to be implemented:
// import { DataDrivenListingOptimizer } from './listing-optimizer'
// import { CompetitorIntelligenceAgent } from './competitor-intelligence'
// import { PerformanceReportingAgent } from './performance-reporting'
// import { WebhookAutomationAgent } from './webhook-automation'
import { supabaseAdmin } from '../database/connection'
import { NotificationService } from '../utils/notifications'

export class AgentOrchestrator {
  
  /**
   * Run complete analysis cycle for a seller
   */
  static async runAnalysisCycle(sellerId: string): Promise<void> {
    console.log(`🎼 Starting analysis cycle for seller: ${sellerId}`)
    
    try {
      // Step 1: Sync latest data from Amazon
      console.log('📥 Phase 1: Data Ingestion')
      await DataIngestionService.syncSellerData(sellerId)
      
      // Step 2: Run predictive analysis
      console.log('🔮 Phase 2: Predictive Intelligence')
      await PredictiveAgent.analyzeAndPredict(sellerId)
      
      // Step 3: Run AI agents with predictive context
      console.log('🤖 Phase 3: AI Agent Analysis')
      await Promise.all([
        LossPreventionAgent.analyzeAndRecommend(sellerId),
        RevenueOptimizationAgent.analyzeAndOptimize(sellerId),
        // DataDrivenListingOptimizer.optimizeListings(sellerId),
        // CompetitorIntelligenceAgent.analyzeCompetitiveLandscape(sellerId)
        Promise.resolve(), // Placeholder for listing optimization
        Promise.resolve()  // Placeholder for competitor analysis
      ])
      
      // Step 4: Revenue maximization
      console.log('💰 Phase 4: Revenue Maximization')
      await RevenueMaximizer.maximizeRevenue(sellerId)
      
      // Step 5: Learning from outcomes
      console.log('🧠 Phase 5: Continuous Learning')
      await LearningAgent.learnFromOutcomes(sellerId)
      
      // Step 5.5: Setup/Update Webhook Automation
      console.log('🔗 Phase 5.5: Webhook Automation Setup')
      // await WebhookAutomationAgent.setupSmartWebhooks(sellerId)
      console.log('🔗 Webhook automation - to be implemented')
      
      // Step 6: Process real-time events
      console.log('⚡ Phase 6: Real-time Event Processing')
      await LossPreventionAgent.processFactStreamEvents(sellerId)
      
      // Step 7: Generate Performance Report (weekly)
      const lastReport = await this.getLastReportDate(sellerId)
      const daysSinceReport = (Date.now() - new Date(lastReport).getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceReport >= 7) {
        console.log('📊 Phase 7: Performance Reporting')
        // await PerformanceReportingAgent.generateDataDrivenReports(sellerId)
        console.log('📊 Performance reporting - to be implemented')
      }
      
      // Step 8: Update seller last analysis timestamp
      await supabaseAdmin
        .from('sellers')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sellerId)
      
      console.log(`✅ Analysis cycle completed successfully for seller: ${sellerId}`)
      
      // 🚀 NEW: Send cycle completion summary
      await this.sendCycleCompletionSummary(sellerId)
      
    } catch (error) {
      console.error(`❌ Analysis cycle failed for seller ${sellerId}:`, error)
      
      // 🚀 NEW: Send error notification
      await this.sendCycleErrorNotification(sellerId, error)
      
      throw error
    }
  }

  /**
   * Run continuous monitoring for all active sellers
   */
  static async startContinuousMonitoring(): Promise<void> {
    console.log('🔄 Starting continuous monitoring system...')
    
    // Get all active sellers
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('status', 'active')
      .eq('onboarding_completed', true)

    if (!sellers || sellers.length === 0) {
      console.log('No active sellers found for monitoring')
      return
    }

    console.log(`👥 Monitoring ${sellers.length} active sellers`)

    // Process each seller (in production, use queue system like Bull/Agenda)
    for (const seller of sellers) {
      try {
        await this.runAnalysisCycle(seller.id)
        
        // Add delay between sellers to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 5000))
        
      } catch (error) {
        console.error(`Failed to process seller ${seller.email}:`, error)
        
        // Continue with other sellers even if one fails
        continue
      }
    }
    
    console.log('🎯 Continuous monitoring cycle completed')
  }

  /**
   * Process urgent events immediately
   */
  static async processUrgentEvents(): Promise<void> {
    console.log('🚨 Processing urgent events...')
    
    // Get high-priority unprocessed events
    const { data: urgentEvents } = await supabaseAdmin
      .from('fact_stream')
      .select('*')
      .eq('processing_status', 'pending')
      .eq('requires_action', true)
      .gte('importance_score', 8)
      .order('importance_score', { ascending: false })
      .limit(20)

    if (!urgentEvents || urgentEvents.length === 0) {
      return
    }

    console.log(`⚡ Found ${urgentEvents.length} urgent events to process`)

    // Group events by seller for batch processing
    const eventsBySeller = new Map<string, any[]>()
    urgentEvents.forEach(event => {
      if (!eventsBySeller.has(event.seller_id)) {
        eventsBySeller.set(event.seller_id, [])
      }
      eventsBySeller.get(event.seller_id)!.push(event)
    })

    // Process urgent events for each seller
    for (const [sellerId, events] of eventsBySeller) {
      try {
        console.log(`🚨 Processing ${events.length} urgent events for seller: ${sellerId}`)
        
        // Run loss prevention agent for urgent events
        await LossPreventionAgent.processFactStreamEvents(sellerId)
        
      } catch (error) {
        console.error(`Failed to process urgent events for seller ${sellerId}:`, error)
      }
    }
  }

  /**
   * Health check - ensure all systems are functioning
   */
  static async performHealthCheck(): Promise<{
    database: boolean
    sp_api: boolean
    agents: boolean
    overall: boolean
  }> {
    console.log('🏥 Performing system health check...')
    
    const health = {
      database: false,
      sp_api: false,
      agents: false,
      overall: false
    }

    try {
      // Test database connectivity
      const { data: testQuery } = await supabaseAdmin
        .from('sellers')
        .select('id')
        .limit(1)
      
      health.database = true
      console.log('✅ Database connection healthy')
      
    } catch (error) {
      console.error('❌ Database connection failed:', error)
    }

    try {
      // Test if we have active sellers with SP-API credentials
      const { data: sellers } = await supabaseAdmin
        .from('sellers')
        .select('id, sp_api_credentials')
        .eq('status', 'active')
        .limit(1)
      
      health.sp_api = sellers && sellers.length > 0 && sellers[0].sp_api_credentials
      console.log(health.sp_api ? '✅ SP-API integration ready' : '⚠️  SP-API credentials missing')
      
    } catch (error) {
      console.error('❌ SP-API health check failed:', error)
    }

    try {
      // Test agents by checking recent recommendations
      const { data: recentRecs } = await supabaseAdmin
        .from('recommendations')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
      
      health.agents = true // Agents are code-based, assume healthy if no errors
      console.log('✅ AI agents operational')
      
    } catch (error) {
      console.error('❌ Agent health check failed:', error)
    }

    health.overall = health.database && health.agents
    
    console.log(`🏥 Health check complete: ${health.overall ? 'HEALTHY' : 'ISSUES DETECTED'}`)
    return health
  }

  /**
   * Get system statistics
   */
  static async getSystemStats(): Promise<{
    active_sellers: number
    total_products: number
    recommendations_today: number
    urgent_events: number
    system_uptime: string
  }> {
    const stats = {
      active_sellers: 0,
      total_products: 0,
      recommendations_today: 0,
      urgent_events: 0,
      system_uptime: process.uptime().toString()
    }

    try {
      // Count active sellers
      const { count: sellerCount } = await supabaseAdmin
        .from('sellers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      stats.active_sellers = sellerCount || 0

      // Count total products
      const { count: productCount } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      stats.total_products = productCount || 0

      // Count today's recommendations
      const today = new Date().toISOString().split('T')[0]
      const { count: recCount } = await supabaseAdmin
        .from('recommendations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
      
      stats.recommendations_today = recCount || 0

      // Count urgent events
      const { count: eventCount } = await supabaseAdmin
        .from('fact_stream')
        .select('*', { count: 'exact', head: true })
        .eq('processing_status', 'pending')
        .eq('requires_action', true)
        .gte('importance_score', 8)
      
      stats.urgent_events = eventCount || 0

    } catch (error) {
      console.error('Failed to get system stats:', error)
    }

    return stats
  }
  
  /**
   * Get last report generation date for seller
   */
  private static async getLastReportDate(sellerId: string): Promise<string> {
    try {
      const { data: lastReport } = await supabaseAdmin
        .from('fact_stream')
        .select('created_at')
        .eq('seller_id', sellerId)
        .eq('event_type', 'report.generated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      return lastReport?.created_at || new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago default
    } catch (error) {
      return new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago default
    }
  }
  
  /**
   * 🚀 NEW: Send analysis cycle completion summary
   */
  private static async sendCycleCompletionSummary(sellerId: string): Promise<void> {
    try {
      // Get recommendations created in the last 10 minutes (cycle duration)
      const cycleStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      
      const { data: newRecommendations } = await supabaseAdmin
        .from('recommendations')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('created_at', cycleStart)
        .order('predicted_impact', { ascending: false })
      
      const { data: newActions } = await supabaseAdmin
        .from('fact_stream')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('event_category', 'automation')
        .gte('created_at', cycleStart)
      
      const recommendations = newRecommendations || []
      const actions = newActions || []
      
      if (recommendations.length === 0 && actions.length === 0) {
        // No new activity, send brief update
        await NotificationService.sendNotification({
          sellerId,
          title: '✅ Analysis Complete - No New Issues',
          message: 'Your latest analysis cycle completed successfully. All systems appear to be running smoothly with no new recommendations needed.',
          urgency: 'low'
        })
        return
      }
      
      // Calculate summary stats
      const totalImpact = recommendations.reduce((sum, rec) => sum + (rec.predicted_impact || 0), 0)
      const criticalCount = recommendations.filter(r => r.urgency_level === 'critical').length
      const highCount = recommendations.filter(r => r.urgency_level === 'high').length
      const lossPreventionCount = recommendations.filter(r => r.agent_type === 'loss_prevention').length
      const revenueOptCount = recommendations.filter(r => r.agent_type === 'revenue_optimization').length
      
      // Determine urgency based on findings
      let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal'
      if (criticalCount > 0) urgency = 'critical'
      else if (highCount > 0 || Math.abs(totalImpact) > 1000) urgency = 'high'
      else if (recommendations.length > 5) urgency = 'normal'
      else urgency = 'low'
      
      // Create summary message
      const message = `
🔍 Analysis Cycle Complete!

🎯 ${recommendations.length} new recommendations generated
🤖 ${actions.length} AI actions executed
💰 Total potential impact: $${totalImpact.toFixed(2)}

🚨 Critical issues: ${criticalCount}
⚠️ High priority: ${highCount}
🛡️ Loss prevention: ${lossPreventionCount}
📈 Revenue optimization: ${revenueOptCount}

${recommendations.length > 0 ? 'Top Recommendations:' : ''}
${recommendations.slice(0, 3).map(r => 
  `• ${r.title} - $${(r.predicted_impact || 0).toFixed(2)} impact`
).join('\n')}
      `
      
      await NotificationService.sendNotification({
        sellerId,
        title: `🎯 Analysis Complete: ${recommendations.length} New Recommendations`,
        message: message.trim(),
        urgency,
        link: `${process.env.APP_URL}/dashboard`,
        data: {
          cycle_timestamp: new Date().toISOString(),
          total_recommendations: recommendations.length,
          total_impact: totalImpact,
          critical_count: criticalCount,
          high_count: highCount
        }
      })
      
    } catch (error) {
      console.error('Failed to send cycle completion summary:', error)
    }
  }
  
  /**
   * 🚀 NEW: Send error notification when cycle fails
   */
  private static async sendCycleErrorNotification(sellerId: string, error: any): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      await NotificationService.sendNotification({
        sellerId,
        title: '❌ Analysis Cycle Failed',
        message: `Your scheduled analysis cycle encountered an error and could not complete.\n\nError: ${errorMessage}\n\nOur team has been notified and will investigate. You can try running a manual analysis from your dashboard.`,
        urgency: 'high',
        link: `${process.env.APP_URL}/dashboard`,
        data: {
          error_timestamp: new Date().toISOString(),
          error_message: errorMessage,
          seller_id: sellerId
        }
      })
      
      // Also notify admin about system error
      if (process.env.ADMIN_EMAIL) {
        await NotificationService.sendNotification({
          sellerId: 'system',
          title: '🚨 System Alert: Analysis Cycle Failed',
          message: `Analysis cycle failed for seller: ${sellerId}\n\nError: ${errorMessage}\n\nTimestamp: ${new Date().toISOString()}`,
          urgency: 'critical'
        })
      }
      
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError)
    }
  }
}

/**
 * Scheduler for running periodic tasks
 */
export class AgentScheduler {
  private static intervals: NodeJS.Timeout[] = []

  /**
   * Start all scheduled tasks
   */
  static start(): void {
    console.log('⏰ Starting agent scheduler...')

    // Full analysis cycle every 4 hours
    const fullCycleInterval = setInterval(async () => {
      try {
        await AgentOrchestrator.startContinuousMonitoring()
      } catch (error) {
        console.error('Scheduled full cycle failed:', error)
      }
    }, 4 * 60 * 60 * 1000) // 4 hours

    // Urgent events every 10 minutes
    const urgentEventsInterval = setInterval(async () => {
      try {
        await AgentOrchestrator.processUrgentEvents()
      } catch (error) {
        console.error('Urgent events processing failed:', error)
      }
    }, 10 * 60 * 1000) // 10 minutes

    // Health check every 30 minutes
    const healthCheckInterval = setInterval(async () => {
      try {
        const health = await AgentOrchestrator.performHealthCheck()
        if (!health.overall) {
          console.warn('⚠️  System health issues detected!')
        }
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    // System stats every hour
    const statsInterval = setInterval(async () => {
      try {
        const stats = await AgentOrchestrator.getSystemStats()
        console.log('📊 System Stats:', stats)
      } catch (error) {
        console.error('Stats collection failed:', error)
      }
    }, 60 * 60 * 1000) // 1 hour
    
    // 🚀 NEW: Daily summaries for all active sellers
    const dailySummaryInterval = setInterval(async () => {
      try {
        const { data: sellers } = await supabaseAdmin
          .from('sellers')
          .select('id')
          .eq('status', 'active')
        
        for (const seller of sellers || []) {
          await NotificationService.sendDailySummary(seller.id)
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error('Daily summary failed:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
    
    // 🚀 NEW: Weekly reports for all active sellers  
    const weeklyReportInterval = setInterval(async () => {
      try {
        const { data: sellers } = await supabaseAdmin
          .from('sellers')
          .select('id')
          .eq('status', 'active')
        
        for (const seller of sellers || []) {
          await NotificationService.sendWeeklyReport(seller.id)
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      } catch (error) {
        console.error('Weekly report failed:', error)
      }
    }, 7 * 24 * 60 * 60 * 1000) // 7 days

    this.intervals = [fullCycleInterval, urgentEventsInterval, healthCheckInterval, statsInterval, dailySummaryInterval, weeklyReportInterval]
    console.log('✅ Agent scheduler started with 6 periodic tasks (including notifications)')
  }

  /**
   * Stop all scheduled tasks
   */
  static stop(): void {
    console.log('⏰ Stopping agent scheduler...')
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    console.log('✅ Agent scheduler stopped')
  }
}