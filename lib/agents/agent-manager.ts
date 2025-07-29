import { MetaAgent } from './meta-agent'
import { LossPreventionAgent } from './loss-prevention-agent'
import { RevenueOptimizationAgent } from './revenue-optimization-agent'
import { StrategicIntelligenceAgent } from './strategic-intelligence-agent'
import { eventBus, createEvent } from '../events/event-bus'
import { LossPreventionEventHandler } from '../events/handlers/loss-prevention-handler'
import { RevenueOptimizationEventHandler } from '../events/handlers/revenue-optimization-handler'
import { supabaseAdmin } from '../database/connection'
import { syncScheduler } from '../sp-api/sync/scheduler'

export class AgentManager {
  private metaAgent: MetaAgent
  private agents: Map<string, any>
  private isRunning = false
  private processingInterval: NodeJS.Timeout | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.metaAgent = new MetaAgent()
    
    // Initialize all agents
    this.agents = new Map([
      ['loss_prevention', new LossPreventionAgent()],
      ['revenue_optimization', new RevenueOptimizationAgent()],
      ['strategic_intelligence', new StrategicIntelligenceAgent()],
      ['meta_agent', this.metaAgent]
    ])
    
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    try {
      // Set up event handlers for each agent
      const lossPreventionHandler = new LossPreventionEventHandler()
      const revenueOptimizationHandler = new RevenueOptimizationEventHandler()

      // Register all event handlers with Redis streams
      lossPreventionHandler.getHandlers().forEach(handler => {
        eventBus.subscribe(handler)
      })

      revenueOptimizationHandler.getHandlers().forEach(handler => {
        eventBus.subscribe(handler)
      })

      console.log('✅ Agent Manager: Event handlers registered with Redis')
    } catch (error) {
      console.error('❌ Failed to setup event handlers:', error)
      throw error
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Agent Manager already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Agent Manager: Starting intelligent agent orchestration system')

    try {
      // 1. Start Redis event bus processing
      console.log('📡 Starting Redis event bus...')
      await eventBus.startProcessing()
      
      // 2. Start SP-API data synchronization
      console.log('🔄 Starting SP-API sync scheduler...')
      this.syncInterval = setInterval(async () => {
        try {
          await syncScheduler.syncAllSellers()
        } catch (error) {
          console.error('❌ SP-API sync failed:', error)
        }
      }, 10 * 60 * 1000) // Every 10 minutes

      // 3. Start periodic agent orchestration
      console.log('🤖 Starting agent orchestration...')
      this.processingInterval = setInterval(async () => {
        await this.orchestrateAllAgents()
      }, 5 * 60 * 1000) // Every 5 minutes

      // 4. Start system health monitoring
      this.healthCheckInterval = setInterval(async () => {
        await this.monitorSystemHealth()
      }, 2 * 60 * 1000) // Every 2 minutes

      // 5. Run initial processing
      console.log('⚡ Running initial agent processing...')
      await this.orchestrateAllAgents()

      // 6. Log system startup
      await this.logSystemEvent('system_started', {
        agents_count: this.agents.size,
        redis_connected: true,
        sync_enabled: true
      })

      console.log('✅ Agent Manager: System started successfully')
      console.log('🌐 Dashboard available at: http://localhost:3000')

    } catch (error) {
      console.error('❌ Agent Manager: Failed to start system:', error)
      this.isRunning = false
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    console.log('🛑 Agent Manager: Stopping system...')

    try {
      // Stop all intervals
      if (this.processingInterval) {
        clearInterval(this.processingInterval)
        this.processingInterval = null
      }

      if (this.syncInterval) {
        clearInterval(this.syncInterval)
        this.syncInterval = null
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Stop event bus processing
      await eventBus.stopProcessing()

      // Log system shutdown
      await this.logSystemEvent('system_stopped', {
        graceful_shutdown: true
      })

      console.log('✅ Agent Manager: System stopped successfully')

    } catch (error) {
      console.error('❌ Agent Manager: Error during shutdown:', error)
    }
  }

  private async orchestrateAllAgents(): Promise<void> {
    if (!this.isRunning) return

    try {
      console.log('🎯 Orchestrating all agents...')
      const startTime = Date.now()

      // Get all active sellers
      const { data: sellers, error } = await supabaseAdmin
        .from('sellers')
        .select('id, email, preferences, business_context, risk_tolerance, status')
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to get active sellers: ${error.message}`)
      }

      if (!sellers || sellers.length === 0) {
        console.log('ℹ️ No active sellers found')
        return
      }

      console.log(`🔄 Processing ${sellers.length} active sellers`)

      // Process sellers in parallel with concurrency control
      const concurrencyLimit = 3 // Process 3 sellers simultaneously
      const sellerBatches = this.chunkArray(sellers, concurrencyLimit)

      let totalRecommendations = 0
      let totalErrors = 0

      for (const batch of sellerBatches) {
        const batchPromises = batch.map(async (seller) => {
          try {
            const result = await this.processSeller(seller)
            totalRecommendations += result.recommendations
            totalErrors += result.errors
            return result
          } catch (error) {
            console.error(`❌ Failed to process seller ${seller.email}:`, error)
            totalErrors++
            return { recommendations: 0, errors: 1 }
          }
        })

        await Promise.all(batchPromises)
        
        // Small delay between batches to prevent overwhelming the system
        if (sellerBatches.indexOf(batch) < sellerBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      const processingTime = Date.now() - startTime

      // Log orchestration results
      await this.logSystemEvent('orchestration_completed', {
        sellers_processed: sellers.length,
        total_recommendations: totalRecommendations,
        total_errors: totalErrors,
        processing_time_ms: processingTime,
        avg_time_per_seller: processingTime / sellers.length
      })

      console.log(`✅ Orchestration complete: ${totalRecommendations} recommendations, ${totalErrors} errors in ${processingTime}ms`)

    } catch (error) {
      console.error('❌ Agent orchestration failed:', error)
      
      await this.logSystemEvent('orchestration_failed', {
        error: error.message,
        stack: error.stack
      })
    }
  }

  private async processSeller(seller: any): Promise<{ recommendations: number; errors: number }> {
    try {
      console.log(`🔍 Processing seller: ${seller.email}`)
      
      const context = {
        sellerId: seller.id,
        sellerPreferences: seller.preferences || {},
        businessContext: seller.business_context || {},
        riskTolerance: seller.risk_tolerance || 0.5,
        currentTime: new Date()
      }

      // Use Meta-Agent to orchestrate all other agents
      const result = await this.metaAgent.processSellerData(seller.id)

      // Publish seller processing event
      await eventBus.publish(createEvent(
        'seller.processing_completed',
        'performance',
        seller.id,
        {
          recommendations_generated: result.recommendations.length,
          processing_timestamp: new Date().toISOString(),
          agent_results: {
            loss_prevention: result.recommendations.filter(r => r.agent_type === 'loss_prevention').length,
            revenue_optimization: result.recommendations.filter(r => r.agent_type === 'revenue_optimization').length,
            strategic_intelligence: result.recommendations.filter(r => r.agent_type === 'strategic_intelligence').length
          }
        },
        { importance: 6 }
      ))

      console.log(`✅ Processed ${seller.email}: ${result.recommendations.length} recommendations`)

      return {
        recommendations: result.recommendations.length,
        errors: result.errors.length
      }

    } catch (error) {
      console.error(`❌ Error processing seller ${seller.id}:`, error)
      return { recommendations: 0, errors: 1 }
    }
  }

  private async monitorSystemHealth(): Promise<void> {
    try {
      // Check Redis health
      const eventBusHealth = await eventBus.healthCheck()
      
      // Check database health
      const { error: dbError } = await supabaseAdmin
        .from('system_metrics')
        .select('id')
        .limit(1)
      
      const dbHealth = !dbError

      // Check agent responsiveness
      const agentHealth = await this.checkAgentHealth()

      // Overall system health
      const systemHealth = eventBusHealth.redis && dbHealth && agentHealth.allHealthy

      // Log health metrics
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'system_health',
          metric_name: 'health_check',
          metric_value: systemHealth ? 1 : 0,
          dimensions: {
            redis_health: eventBusHealth.redis,
            database_health: dbHealth,
            agent_health: agentHealth.allHealthy,
            active_streams: eventBusHealth.activeStreams,
            subscribed_handlers: eventBusHealth.subscribedHandlers,
            unhealthy_agents: agentHealth.unhealthyAgents
          }
        })

      if (!systemHealth) {
        console.warn('⚠️ System health issues detected:', {
          redis: eventBusHealth.redis,
          database: dbHealth,
          agents: agentHealth.allHealthy
        })

        // Publish health alert
        await eventBus.publish(createEvent(
          'system.health_alert',
          'performance',
          'system',
          {
            redis_health: eventBusHealth.redis,
            database_health: dbHealth,
            agent_health: agentHealth,
            timestamp: new Date().toISOString()
          },
          { importance: 9 }
        ))
      }

    } catch (error) {
      console.error('❌ Health monitoring failed:', error)
    }
  }

  private async checkAgentHealth(): Promise<{ allHealthy: boolean; unhealthyAgents: string[] }> {
    const unhealthyAgents: string[] = []

    try {
      // Check each agent's recent activity
      for (const [agentName, agent] of this.agents.entries()) {
        const lastActivity = await this.getAgentLastActivity(agentName)
        const isHealthy = lastActivity && (Date.now() - lastActivity.getTime()) < 30 * 60 * 1000 // 30 minutes

        if (!isHealthy) {
          unhealthyAgents.push(agentName)
        }
      }

      return {
        allHealthy: unhealthyAgents.length === 0,
        unhealthyAgents
      }

    } catch (error) {
      console.error('Agent health check failed:', error)
      return { allHealthy: false, unhealthyAgents: Array.from(this.agents.keys()) }
    }
  }

  private async getAgentLastActivity(agentName: string): Promise<Date | null> {
    try {
      const { data: lastRec, error } = await supabaseAdmin
        .from('recommendations')
        .select('created_at')
        .eq('agent_type', agentName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !lastRec) return null

      return new Date(lastRec.created_at)

    } catch (error) {
      return null
    }
  }

  // Process learning feedback from recommendation outcomes
  async processLearningFeedback(recommendationId: string, outcome: any): Promise<void> {
    try {
      // Get recommendation details
      const { data: recommendation, error } = await supabaseAdmin
        .from('recommendations')
        .select('agent_type, seller_id, predicted_impact, confidence_score, reasoning')
        .eq('id', recommendationId)
        .single()

      if (error || !recommendation) {
        console.error('Failed to get recommendation for learning:', error)
        return
      }

      // Calculate accuracy metrics
      const impactAccuracy = recommendation.predicted_impact !== 0 
        ? Math.max(0, 1 - Math.abs(recommendation.predicted_impact - (outcome.actual_impact || 0)) / Math.abs(recommendation.predicted_impact))
        : 0.5

      const overallAccuracy = outcome.accuracy_score || impactAccuracy

      const learningData = {
        recommendationId,
        implemented: outcome.implemented_at !== null,
        actualImpact: outcome.actual_impact || 0,
        accuracy: overallAccuracy,
        sellerFeedback: outcome.seller_feedback,
        contextFactors: {
          agent_type: recommendation.agent_type,
          original_confidence: recommendation.confidence_score,
          seller_id: recommendation.seller_id,
          processing_time: outcome.measured_at ? 
            (new Date(outcome.measured_at).getTime() - new Date(outcome.created_at || Date.now()).getTime()) / (1000 * 60 * 60) : 0,
          ...outcome.lessons_learned
        }
      }

      // Send learning data to specific agent
      const agent = this.agents.get(recommendation.agent_type)
      if (agent && typeof agent.processLearningData === 'function') {
        await agent.processLearningData(learningData)
      }

      // Send to meta-agent for cross-agent learning
      await this.metaAgent.processLearningData(learningData)

      // Publish learning event for system-wide intelligence
      await eventBus.publish(createEvent(
        'learning.feedback_processed',
        'performance',
        recommendation.seller_id,
        {
          recommendation_id: recommendationId,
          agent_type: recommendation.agent_type,
          accuracy_achieved: overallAccuracy,
          impact_achieved: outcome.actual_impact,
          implemented: learningData.implemented
        },
        { importance: 7 }
      ))

      console.log(`✅ Processed learning feedback for ${recommendationId}: accuracy ${overallAccuracy.toFixed(3)}`)

    } catch (error) {
      console.error('❌ Failed to process learning feedback:', error)
    }
  }

  // Get comprehensive system health status
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: any
    metrics: any
    recommendations: string[]
  }> {
    try {
      // Check all system components
      const eventBusHealth = await eventBus.healthCheck()
      const agentHealth = await this.checkAgentHealth()
      
      // Get recent metrics
      const { data: metrics } = await supabaseAdmin
        .from('system_metrics')
        .select('metric_name, metric_value, timestamp, dimensions')
        .eq('metric_type', 'system_health')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('timestamp', { ascending: false })

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      const recommendations: string[] = []

      if (!eventBusHealth.redis || !eventBusHealth.database) {
        status = 'unhealthy'
        recommendations.push('Critical infrastructure failure - immediate attention required')
      } else if (!agentHealth.allHealthy || eventBusHealth.activeStreams === 0) {
        status = 'degraded'
        recommendations.push('Some agents or streams not functioning properly')
      }

      return {
        status,
        components: {
          redis: eventBusHealth.redis,
          database: eventBusHealth.database,
          agents: agentHealth,
          event_streams: {
            active: eventBusHealth.activeStreams,
            handlers: eventBusHealth.subscribedHandlers
          }
        },
        metrics: {
          recent_processing: metrics?.filter(m => m.metric_name === 'orchestration_completed').length || 0,
          avg_processing_time: this.calculateAvgProcessingTime(metrics || []),
          error_rate: this.calculateErrorRate(metrics || [])
        },
        recommendations
      }

    } catch (error) {
      console.error('❌ Failed to get system health:', error)
      return {
        status: 'unhealthy',
        components: {},
        metrics: {},
        recommendations: ['System health check failed - investigate immediately']
      }
    }
  }

  // Helper methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private async logSystemEvent(eventType: string, data: any): Promise<void> {
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'system_health',
          metric_name: eventType,
          metric_value: 1,
          dimensions: data
        })
    } catch (error) {
      console.error('Failed to log system event:', error)
    }
  }

  private calculateAvgProcessingTime(metrics: any[]): number {
    const processingMetrics = metrics.filter(m => 
      m.metric_name === 'orchestration_completed' && 
      m.dimensions?.processing_time_ms
    )

    if (processingMetrics.length === 0) return 0

    return processingMetrics.reduce((sum, m) => sum + (m.dimensions.processing_time_ms || 0), 0) / processingMetrics.length
  }

  private calculateErrorRate(metrics: any[]): number {
    const completedCount = metrics.filter(m => m.metric_name === 'orchestration_completed').length
    const failedCount = metrics.filter(m => m.metric_name === 'orchestration_failed').length
    
    const total = completedCount + failedCount
    return total > 0 ? failedCount / total : 0
  }
}

// Global singleton instance
export const agentManager = new AgentManager()