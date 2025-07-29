import { supabaseAdmin } from '../database/connection'
import { eventBus, XpertSellerEvent, createEvent } from '../events/event-bus'
import { EVENT_TYPES } from '../events/types'

export interface AgentConfig {
  name: string
  version: string
  capabilities: string[]
  updateFrequency: number // minutes
  confidenceThreshold: number
  maxRecommendationsPerHour: number
}

export interface AgentContext {
  sellerId: string
  sellerPreferences: any
  businessContext: any
  riskTolerance: number
  currentTime: Date
}

export interface RecommendationInput {
  type: string
  title: string
  description: string
  asin?: string
  marketplaceId?: string
  actionRequired: any
  predictedImpact: number
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  urgency: 'low' | 'normal' | 'high' | 'critical'
  reasoning: any
  supportingData: any
  expiresInHours: number
}

export interface LearningData {
  recommendationId: string
  implemented: boolean
  actualImpact: number
  accuracy: number
  sellerFeedback?: string
  contextFactors: any
}

export abstract class BaseAgent {
  protected config: AgentConfig
  protected lastProcessing = new Map<string, Date>()
  protected learningCache = new Map<string, any>()

  constructor(config: AgentConfig) {
    this.config = config
  }

  abstract analyze(context: AgentContext): Promise<RecommendationInput[]>
  abstract learn(learningData: LearningData): Promise<void>

  // Core agent functionality
  async processSellerData(sellerId: string): Promise<{
    recommendations: any[]
    insights: any[]
    errors: string[]
  }> {
    const errors: string[] = []
    const recommendations: any[] = []
    const insights: any[] = []

    try {
      // Check processing frequency
      const lastProcessed = this.lastProcessing.get(sellerId)
      const timeSinceLastRun = lastProcessed 
        ? (Date.now() - lastProcessed.getTime()) / (1000 * 60)
        : Infinity

      if (timeSinceLastRun < this.config.updateFrequency) {
        return { recommendations: [], insights: [], errors: [] }
      }

      // Get seller context
      const context = await this.getSellerContext(sellerId)
      if (!context) {
        errors.push(`Failed to load context for seller ${sellerId}`)
        return { recommendations: [], insights, errors }
      }

      // Run analysis
      const recommendationInputs = await this.analyze(context)

      // Filter by confidence threshold
      const validRecommendations = recommendationInputs.filter(
        rec => rec.confidence >= this.config.confidenceThreshold
      )

      // Check rate limiting
      const recentCount = await this.getRecentRecommendationCount(sellerId)
      const allowedCount = Math.min(
        validRecommendations.length,
        this.config.maxRecommendationsPerHour - recentCount
      )

      // Create recommendations
      for (let i = 0; i < allowedCount; i++) {
        const input = validRecommendations[i]
        try {
          const recommendation = await this.createRecommendation(sellerId, input)
          recommendations.push(recommendation)

          // Create fact stream event
          await eventBus.publish(createEvent(
            'recommendation.created',
            'performance',
            sellerId,
            {
              recommendation_id: recommendation.id,
              agent_type: this.config.name,
              recommendation_type: input.type,
              predicted_impact: input.predictedImpact,
              confidence: input.confidence
            },
            {
              asin: input.asin,
              marketplaceId: input.marketplaceId,
              importance: this.mapUrgencyToImportance(input.urgency)
            }
          ))
        } catch (error) {
          errors.push(`Failed to create recommendation: ${error}`)
        }
      }

      // Update processing timestamp
      this.lastProcessing.set(sellerId, new Date())

      // Log agent performance
      await this.logPerformanceMetrics(sellerId, recommendationInputs.length, recommendations.length, errors.length)

    } catch (error) {
      errors.push(`Agent processing failed: ${error}`)
    }

    return { recommendations, insights, errors }
  }

  // Get comprehensive seller context
  protected async getSellerContext(sellerId: string): Promise<AgentContext | null> {
    try {
      // Get seller basic info
      const { data: seller, error: sellerError } = await supabaseAdmin
        .from('sellers')
        .select('preferences, business_context, risk_tolerance')
        .eq('id', sellerId)
        .single()

      if (sellerError || !seller) return null

      return {
        sellerId,
        sellerPreferences: seller.preferences || {},
        businessContext: seller.business_context || {},
        riskTolerance: seller.risk_tolerance || 0.5,
        currentTime: new Date()
      }
    } catch (error) {
      console.error('Failed to get seller context:', error)
      return null
    }
  }

  // Create recommendation in database
  protected async createRecommendation(
    sellerId: string, 
    input: RecommendationInput
  ): Promise<any> {
    const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)

    const { data, error } = await supabaseAdmin
      .from('recommendations')
      .insert({
        seller_id: sellerId,
        asin: input.asin,
        marketplace_id: input.marketplaceId,
        agent_type: this.config.name.toLowerCase().replace(' ', '_'),
        recommendation_type: input.type,
        title: input.title,
        description: input.description,
        action_required: input.actionRequired,
        predicted_impact: input.predictedImpact,
        confidence_score: input.confidence,
        risk_level: input.riskLevel,
        urgency_level: input.urgency,
        reasoning: input.reasoning,
        supporting_data: input.supportingData,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Shared intelligence methods
  protected async getSharedIntelligence(
    sellerId: string,
    queryType: string,
    contextData: any
  ): Promise<any[]> {
    try {
      const { data: intelligence, error } = await supabaseAdmin
        .from('intelligence_cache')
        .select('*')
        .or(`seller_id.eq.${sellerId},seller_id.is.null`)
        .eq('cache_type', queryType)
        .gt('expires_at', new Date().toISOString())
        .order('confidence_score', { ascending: false })
        .limit(10)

      if (error) throw error
      return intelligence || []
    } catch (error) {
      console.error('Failed to get shared intelligence:', error)
      return []
    }
  }

  protected async cacheIntelligence(
    sellerId: string | null,
    cacheType: string,
    data: any,
    confidence: number,
    ttlHours: number = 24
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
      const cacheKey = `${cacheType}_${sellerId || 'global'}_${Date.now()}`

      await supabaseAdmin
        .from('intelligence_cache')
        .insert({
          cache_key: cacheKey,
          seller_id: sellerId,
          cache_type: cacheType,
          data,
          confidence_score: confidence,
          expires_at: expiresAt.toISOString(),
          tags: [cacheType, sellerId ? 'seller_specific' : 'global']
        })
    } catch (error) {
      console.error('Failed to cache intelligence:', error)
    }
  }

  // Learning and adaptation
  async processLearningData(learningData: LearningData): Promise<void> {
    try {
      await this.learn(learningData)
      
      // Cache learning insights
      await this.cacheIntelligence(
        null, // Make learning global
        'learning_insight',
        {
          agent_type: this.config.name,
          recommendation_type: learningData.recommendationId,
          accuracy: learningData.accuracy,
          context_patterns: learningData.contextFactors,
          impact_variance: learningData.actualImpact
        },
        learningData.accuracy,
        168 // 1 week
      )

      // Log learning metrics
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'agent_accuracy',
          metric_name: `${this.config.name.toLowerCase()}_learning_update`,
          metric_value: learningData.accuracy,
          dimensions: {
            recommendation_id: learningData.recommendationId,
            implemented: learningData.implemented,
            actual_impact: learningData.actualImpact
          }
        })

    } catch (error) {
      console.error('Failed to process learning data:', error)
    }
  }

  // Helper methods
  private async getRecentRecommendationCount(sellerId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { count, error } = await supabaseAdmin
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('agent_type', this.config.name.toLowerCase().replace(' ', '_'))
      .gte('created_at', oneHourAgo.toISOString())

    return error ? 0 : (count || 0)
  }

  private mapUrgencyToImportance(urgency: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
    switch (urgency) {
      case 'critical': return 10
      case 'high': return 8
      case 'normal': return 5
      case 'low': return 3
      default: return 5
    }
  }

  private async logPerformanceMetrics(
    sellerId: string,
    analysisCount: number,
    recommendationCount: number,
    errorCount: number
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('agent_performance')
        .insert({
          agent_type: this.config.name.toLowerCase().replace(' ', '_'),
          seller_id: sellerId,
          metric_name: 'processing_summary',
          metric_value: recommendationCount,
          measurement_period_start: new Date().toISOString(),
          measurement_period_end: new Date().toISOString(),
          benchmark_value: analysisCount > 0 ? recommendationCount / analysisCount : 0
        })
    } catch (error) {
      console.error('Failed to log performance metrics:', error)
    }
  }

  // Utility methods for data analysis
  protected calculateTrend(values: number[], periods: number = 7): {
    direction: 'up' | 'down' | 'stable'
    magnitude: number
    confidence: number
  } {
    if (values.length < 2) {
      return { direction: 'stable', magnitude: 0, confidence: 0 }
    }

    const recentAvg = values.slice(-periods).reduce((a, b) => a + b, 0) / Math.min(periods, values.length)
    const previousAvg = values.slice(-periods * 2, -periods).reduce((a, b) => a + b, 0) / Math.min(periods, values.length - periods)

    if (previousAvg === 0) {
      return { direction: 'stable', magnitude: 0, confidence: 0.5 }
    }

    const change = (recentAvg - previousAvg) / previousAvg
    const magnitude = Math.abs(change)
    const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable'
    const confidence = Math.min(0.95, 0.5 + magnitude * 2)

    return { direction, magnitude, confidence }
  }

  protected calculateSeasonality(values: number[], period: number = 7): {
    isSeasonalProduct: boolean
    seasonalityStrength: number
    pattern: number[]
  } {
    if (values.length < period * 2) {
      return { isSeasonalProduct: false, seasonalityStrength: 0, pattern: [] }
    }

    const pattern: number[] = []
    let totalVariance = 0

    for (let i = 0; i < period; i++) {
      const periodValues = []
      for (let j = i; j < values.length; j += period) {
        periodValues.push(values[j])
      }
      
      const avg = periodValues.reduce((a, b) => a + b, 0) / periodValues.length
      pattern.push(avg)
      
      const variance = periodValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / periodValues.length
      totalVariance += variance
    }

    const overallAvg = values.reduce((a, b) => a + b, 0) / values.length
    const seasonalityStrength = totalVariance / Math.pow(overallAvg, 2)
    const isSeasonalProduct = seasonalityStrength > 0.2

    return { isSeasonalProduct, seasonalityStrength, pattern }
  }
}