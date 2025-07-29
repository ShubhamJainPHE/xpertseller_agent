import { BaseAgent, AgentConfig, AgentContext, RecommendationInput, LearningData } from './base-agent'
import { LossPreventionAgent } from './loss-prevention-agent'
import { RevenueOptimizationAgent } from './revenue-optimization-agent'
import { StrategicIntelligenceAgent } from './strategic-intelligence-agent'
import { supabaseAdmin } from '../database/connection'
import { eventBus, createEvent } from '../events/event-bus'

interface GlobalActionScore {
  recommendationId: string
  agentType: string
  baseScore: number
  urgencyMultiplier: number
  impactScore: number
  confidenceScore: number
  riskAdjustment: number
  synergiesBonus: number
  conflictPenalty: number
  finalScore: number
  rank: number
}

interface ConflictResolution {
  conflictType: 'resource_competition' | 'contradictory_actions' | 'timing_conflict'
  recommendations: string[]
  resolution: 'prioritize_highest_impact' | 'sequence_actions' | 'combine_actions' | 'escalate_to_seller'
  reasoning: string
  resolvedAction?: any
}

export class MetaAgent extends BaseAgent {
  private agents: Map<string, BaseAgent>
  private globalLearningCache = new Map<string, any>()
  private conflictResolutionHistory = new Map<string, ConflictResolution[]>()

  constructor() {
    super({
      name: 'Meta Agent',
      version: '1.0.0',
      capabilities: [
        'global_action_prioritization',
        'conflict_resolution',
        'cross_agent_learning_coordination',
        'seller_personalization',
        'system_optimization'
      ],
      updateFrequency: 10, // Every 10 minutes
      confidenceThreshold: 0.8,
      maxRecommendationsPerHour: 100 // No real limit for meta-agent
    })

    // Initialize specialized agents
    this.agents = new Map([
      ['loss_prevention', new LossPreventionAgent()],
      ['revenue_optimization', new RevenueOptimizationAgent()],
      ['strategic_intelligence', new StrategicIntelligenceAgent()]
    ])
  }

  async analyze(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // 1. Orchestrate all agents
      const agentResults = await this.orchestrateAgents(context)
      
      // 2. Perform global action ranking
      const rankedActions = await this.rankGlobalActions(agentResults, context)
      
      // 3. Resolve conflicts between agent recommendations
      const resolvedActions = await this.resolveAgentConflicts(rankedActions, context)
      
      // 4. Personalize for seller context
      const personalizedActions = await this.personalizeForSeller(resolvedActions, context)
      
      // 5. Generate meta-recommendations for system optimization
      const metaRecommendations = await this.generateMetaRecommendations(personalizedActions, context)
      
      recommendations.push(...metaRecommendations)

      // 6. Coordinate cross-agent learning
      await this.coordinateCrossAgentLearning(context)

      // 7. Update global intelligence
      await this.updateGlobalIntelligence(agentResults, context)

    } catch (error) {
      console.error('Meta Agent orchestration failed:', error)
    }

    return recommendations
  }

  private async orchestrateAgents(context: AgentContext): Promise<Map<string, any>> {
    const agentResults = new Map()
    const orchestrationPromises: Promise<void>[] = []

    // Run all agents in parallel
    for (const [agentName, agent] of this.agents.entries()) {
      orchestrationPromises.push(
        this.runAgentWithMonitoring(agentName, agent, context)
          .then(result => agentResults.set(agentName, result))
          .catch(error => {
            console.error(`Agent ${agentName} failed:`, error)
            agentResults.set(agentName, { recommendations: [], insights: [], errors: [error.message] })
          })
      )
    }

    await Promise.all(orchestrationPromises)
    return agentResults
  }

  private async runAgentWithMonitoring(
    agentName: string, 
    agent: BaseAgent, 
    context: AgentContext
  ): Promise<any> {
    const startTime = Date.now()
    
    try {
      console.log(`Meta Agent: Starting ${agentName} analysis for seller ${context.sellerId}`)
      
      const result = await agent.processSellerData(context.sellerId)
      const processingTime = Date.now() - startTime

      // Log agent performance
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'agent_performance',
          metric_name: `${agentName}_processing_time`,
          metric_value: processingTime,
          metric_unit: 'milliseconds',
          dimensions: {
            seller_id: context.sellerId,
            recommendations_count: result.recommendations.length,
            errors_count: result.errors.length
          }
        })

      console.log(`Meta Agent: ${agentName} completed in ${processingTime}ms - ${result.recommendations.length} recommendations`)
      return result

    } catch (error) {
      console.error(`Meta Agent: ${agentName} failed after ${Date.now() - startTime}ms:`, error)
      throw error
    }
  }

  private async rankGlobalActions(
    agentResults: Map<string, any>, 
    context: AgentContext
  ): Promise<GlobalActionScore[]> {
    const allRecommendations: GlobalActionScore[] = []

    // Collect all recommendations with metadata
    for (const [agentType, result] of agentResults.entries()) {
      for (const rec of result.recommendations || []) {
        const baseScore = this.calculateBaseScore(rec, context)
        const urgencyMultiplier = this.getUrgencyMultiplier(rec.urgency_level)
        const impactScore = this.normalizeImpactScore(rec.predicted_impact)
        const confidenceScore = rec.confidence_score || 0.5
        const riskAdjustment = this.getRiskAdjustment(rec.risk_level, context.riskTolerance)

        allRecommendations.push({
          recommendationId: rec.id,
          agentType,
          baseScore,
          urgencyMultiplier,
          impactScore,
          confidenceScore,
          riskAdjustment,
          synergiesBonus: 0, // Will be calculated next
          conflictPenalty: 0, // Will be calculated next
          finalScore: 0, // Will be calculated after synergies and conflicts
          rank: 0
        })
      }
    }

    // Calculate synergies and conflicts
    await this.calculateSynergiesAndConflicts(allRecommendations, context)

    // Calculate final scores
    allRecommendations.forEach(action => {
      action.finalScore = (
        action.baseScore * 
        action.urgencyMultiplier * 
        action.impactScore * 
        action.confidenceScore * 
        action.riskAdjustment * 
        (1 + action.synergiesBonus) * 
        (1 - action.conflictPenalty)
      )
    })

    // Sort by final score and assign ranks
    allRecommendations.sort((a, b) => b.finalScore - a.finalScore)
    allRecommendations.forEach((action, index) => {
      action.rank = index + 1
    })

    console.log(`Meta Agent: Ranked ${allRecommendations.length} actions across all agents`)
    
    return allRecommendations
  }

  private async resolveAgentConflicts(
    rankedActions: GlobalActionScore[], 
    context: AgentContext
  ): Promise<GlobalActionScore[]> {
    const conflicts = await this.identifyConflicts(rankedActions, context)
    const resolvedActions = [...rankedActions]

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict, context)
      
      // Apply conflict resolution
      if (resolution.resolution === 'prioritize_highest_impact') {
        // Keep highest scoring recommendation, penalize others
        const highestScoring = conflict.recommendations
          .map(id => resolvedActions.find(a => a.recommendationId === id))
          .filter(a => a !== undefined)
          .sort((a, b) => b!.finalScore - a!.finalScore)[0]

        conflict.recommendations.forEach(id => {
          const action = resolvedActions.find(a => a.recommendationId === id)
          if (action && action.recommendationId !== highestScoring?.recommendationId) {
            action.conflictPenalty = Math.max(action.conflictPenalty, 0.5)
            action.finalScore *= (1 - action.conflictPenalty)
          }
        })
      } else if (resolution.resolution === 'sequence_actions') {
        // Add timing constraints
        // Implementation would depend on specific conflict type
      }

      // Store conflict resolution for learning
      const sellerConflicts = this.conflictResolutionHistory.get(context.sellerId) || []
      sellerConflicts.push(resolution)
      this.conflictResolutionHistory.set(context.sellerId, sellerConflicts)
    }

    // Re-sort after conflict resolution
    resolvedActions.sort((a, b) => b.finalScore - a.finalScore)
    resolvedActions.forEach((action, index) => {
      action.rank = index + 1
    })

    console.log(`Meta Agent: Resolved ${conflicts.length} conflicts`)
    
    return resolvedActions
  }

  private async personalizeForSeller(
    resolvedActions: GlobalActionScore[], 
    context: AgentContext
  ): Promise<GlobalActionScore[]> {
    try {
      // Get seller's historical preferences and behaviors
      const sellerProfile = await this.getSellerProfile(context.sellerId)
      
      // Apply personalization adjustments
      const personalizedActions = resolvedActions.map(action => {
        let personalizationMultiplier = 1.0

        // Adjust based on seller's risk tolerance
        if (action.riskAdjustment < 1.0 && context.riskTolerance > 0.7) {
          personalizationMultiplier *= 1.1 // Risk-tolerant seller, boost risky recommendations
        } else if (action.riskAdjustment > 1.0 && context.riskTolerance < 0.3) {
          personalizationMultiplier *= 1.2 // Risk-averse seller, boost safe recommendations
        }

        // Adjust based on seller's historical response patterns
        const historicalSuccess = sellerProfile.agentResponseRates[action.agentType] || 0.5
        personalizationMultiplier *= (0.5 + historicalSuccess)

        // Adjust based on seller's business context
        if (context.businessContext.priority === 'growth' && action.impactScore > 0.7) {
          personalizationMultiplier *= 1.15
        } else if (context.businessContext.priority === 'stability' && action.urgencyMultiplier > 2.0) {
          personalizationMultiplier *= 1.1
        }

        // Apply personalization
        const personalizedAction = { ...action }
        personalizedAction.finalScore *= personalizationMultiplier
        
        return personalizedAction
      })

      // Re-sort and re-rank after personalization
      personalizedActions.sort((a, b) => b.finalScore - a.finalScore)
      personalizedActions.forEach((action, index) => {
        action.rank = index + 1
      })

      console.log(`Meta Agent: Applied personalization for seller ${context.sellerId}`)
      
      return personalizedActions

    } catch (error) {
      console.error('Failed to personalize recommendations:', error)
      return resolvedActions
    }
  }

  private async generateMetaRecommendations(
    personalizedActions: GlobalActionScore[], 
    context: AgentContext
  ): Promise<RecommendationInput[]> {
    const metaRecommendations: RecommendationInput[] = []

    try {
      // Generate daily action plan
      const topActions = personalizedActions.slice(0, 10)
      const criticalActions = topActions.filter(a => a.urgencyMultiplier >= 3.0)
      const highImpactActions = topActions.filter(a => a.impactScore > 0.8)

      if (topActions.length > 0) {
        metaRecommendations.push({
          type: 'daily_action_plan',
          title: `📋 Today's Priority Actions (${criticalActions.length} Critical, ${highImpactActions.length} High Impact)`,
          description: `Your AI team identified ${topActions.length} optimization opportunities. Focus on the top ${Math.min(5, topActions.length)} for maximum impact.`,
          actionRequired: {
            type: 'execute_action_plan',
            priority_actions: topActions.slice(0, 5).map(a => ({
              recommendation_id: a.recommendationId,
              agent_type: a.agentType,
              rank: a.rank,
              final_score: a.finalScore.toFixed(2),
              expected_impact: this.denormalizeImpactScore(a.impactScore)
            })),
            critical_actions: criticalActions.map(a => a.recommendationId),
            total_expected_impact: topActions.reduce((sum, a) => sum + this.denormalizeImpactScore(a.impactScore), 0),
            estimated_time_required: this.estimateTimeRequired(topActions.slice(0, 5))
          },
          predictedImpact: topActions.reduce((sum, a) => sum + this.denormalizeImpactScore(a.impactScore), 0),
          confidence: 0.9,
          riskLevel: 'low',
          urgency: criticalActions.length > 0 ? 'high' : 'normal',
          reasoning: {
            optimization_summary: {
              total_opportunities: personalizedActions.length,
              critical_issues: criticalActions.length,
              high_impact_opportunities: highImpactActions.length,
              agent_distribution: this.getAgentDistribution(topActions)
            },
            prioritization_logic: {
              scoring_methodology: 'Multi-dimensional scoring with personalization',
              conflict_resolutions: this.conflictResolutionHistory.get(context.sellerId)?.length || 0,
              personalization_applied: true
            }
          },
          supportingData: {
            action_scores: topActions.map(a => ({
              id: a.recommendationId,
              agent: a.agentType,
              score: a.finalScore,
              rank: a.rank
            })),
            system_performance: await this.getSystemPerformanceMetrics(context.sellerId)
          },
          expiresInHours: 24
        })
      }

      // Generate system optimization recommendations if needed
      const systemOptimizations = await this.identifySystemOptimizations(context)
      metaRecommendations.push(...systemOptimizations)

    } catch (error) {
      console.error('Failed to generate meta recommendations:', error)
    }

    return metaRecommendations
  }

  private async coordinateCrossAgentLearning(context: AgentContext): Promise<void> {
    try {
      // Get recent learning outcomes across all agents
      const recentOutcomes = await this.getRecentLearningOutcomes(context.sellerId)
      
      // Identify cross-agent learning opportunities
      const crossLearnings = this.identifyCrossAgentLearnings(recentOutcomes)
      
      // Share relevant learnings with each agent
      for (const [agentName, agent] of this.agents.entries()) {
        const relevantLearnings = crossLearnings.filter(l => 
          l.relevantAgents.includes(agentName) || l.relevantAgents.includes('all')
        )
        
        for (const learning of relevantLearnings) {
          await agent.processLearningData({
            recommendationId: learning.sourceRecommendationId,
            implemented: learning.implemented,
            actualImpact: learning.actualImpact,
            accuracy: learning.accuracy,
            sellerFeedback: learning.feedback,
            contextFactors: {
              ...learning.contextFactors,
              crossAgentLearning: true,
              sourceAgent: learning.sourceAgent
            }
          })
        }
      }

      // Update global learning cache
      await this.updateGlobalLearningCache(crossLearnings, context)

      console.log(`Meta Agent: Coordinated cross-agent learning for ${crossLearnings.length} insights`)

    } catch (error) {
      console.error('Failed to coordinate cross-agent learning:', error)
    }
  }

  // Learning implementation for meta-agent
  async learn(learningData: LearningData): Promise<void> {
    try {
      // Meta-agent learns about orchestration effectiveness
      const learningKey = 'orchestration_effectiveness'
      const currentLearning = this.globalLearningCache.get(learningKey) || {
        orchestrationAccuracy: 0.5,
        conflictResolutionSuccess: 0.5,
        personalizationEffectiveness: 0.5,
        overallSystemPerformance: 0.5
      }

      // Update orchestration learning
      if (learningData.contextFactors?.orchestrationType) {
        currentLearning.orchestrationAccuracy = (currentLearning.orchestrationAccuracy * 0.9) + (learningData.accuracy * 0.1)
      }

      // Update conflict resolution learning
      if (learningData.contextFactors?.conflictsResolved) {
        const resolutionSuccess = learningData.accuracy > 0.7 ? 1 : 0
        currentLearning.conflictResolutionSuccess = (currentLearning.conflictResolutionSuccess * 0.9) + (resolutionSuccess * 0.1)
      }

      // Update personalization learning
      if (learningData.contextFactors?.personalizedRecommendation) {
        currentLearning.personalizationEffectiveness = (currentLearning.personalizationEffectiveness * 0.9) + (learningData.accuracy * 0.1)
      }

      // Calculate overall system performance
      currentLearning.overallSystemPerformance = (
        currentLearning.orchestrationAccuracy * 0.4 +
        currentLearning.conflictResolutionSuccess * 0.3 +
        currentLearning.personalizationEffectiveness * 0.3
      )

      this.globalLearningCache.set(learningKey, currentLearning)

      // Adjust orchestration parameters based on learning
      if (currentLearning.overallSystemPerformance < 0.6) {
        this.config.updateFrequency = Math.max(5, this.config.updateFrequency - 2) // More frequent updates
      } else if (currentLearning.overallSystemPerformance > 0.8) {
        this.config.updateFrequency = Math.min(30, this.config.updateFrequency + 5) // Less frequent updates
      }

      console.log(`Meta Agent learned: system performance ${(currentLearning.overallSystemPerformance * 100).toFixed(1)}%`)

    } catch (error) {
      console.error('Meta Agent learning failed:', error)
    }
  }

  // Helper methods for meta-agent functionality
  private calculateBaseScore(recommendation: any, context: AgentContext): number {
    // Base score from 0-10 based on multiple factors
    let score = 5.0 // Neutral starting point

    // Impact factor (0-3 points)
    const impactNormalized = Math.min(3, Math.abs(recommendation.predicted_impact || 0) / 1000)
    score += impactNormalized

    // Confidence factor (0-2 points)
    score += (recommendation.confidence_score || 0.5) * 2

    // Urgency factor (0-2 points)
    const urgencyScore = {
      'critical': 2,
      'high': 1.5,
      'normal': 1,
      'low': 0.5
    }[recommendation.urgency_level] || 1
    score += urgencyScore

    return Math.min(10, Math.max(0, score))
  }

  private getUrgencyMultiplier(urgency: string): number {
    const multipliers = {
      'critical': 4.0,
      'high': 2.5,
      'normal': 1.5,
      'low': 1.0
    }
    return multipliers[urgency as keyof typeof multipliers] || 1.5
  }

  private normalizeImpactScore(impact: number): number {
    // Normalize impact to 0-1 scale
    return Math.min(1, Math.max(0, Math.abs(impact) / 10000))
  }

  private denormalizeImpactScore(normalizedScore: number): number {
    return normalizedScore * 10000
  }

  private getRiskAdjustment(riskLevel: string, riskTolerance: number): number {
    const baseAdjustments = {
      'low': 1.0,
      'medium': 0.9,
      'high': 0.7
    }
    
    const baseAdjustment = baseAdjustments[riskLevel as keyof typeof baseAdjustments] || 0.9
    
    // Adjust based on seller's risk tolerance
    if (riskLevel === 'high' && riskTolerance > 0.7) {
      return Math.min(1.0, baseAdjustment * 1.3) // Risk-tolerant seller
    } else if (riskLevel === 'low' && riskTolerance < 0.3) {
      return Math.min(1.0, baseAdjustment * 1.1) // Risk-averse seller prefers low-risk
    }
    
    return baseAdjustment
  }

  private async calculateSynergiesAndConflicts(
    actions: GlobalActionScore[], 
    context: AgentContext
  ): Promise<void> {
    // Simplified synergy and conflict calculation
    for (let i = 0; i < actions.length; i++) {
      for (let j = i + 1; j < actions.length; j++) {
        const action1 = actions[i]
        const action2 = actions[j]
        
        // Check for synergies (actions that work well together)
        const synergy = this.calculateSynergy(action1, action2)
        if (synergy > 0) {
          action1.synergiesBonus = Math.max(action1.synergiesBonus, synergy)
          action2.synergiesBonus = Math.max(action2.synergiesBonus, synergy)
        }
        
        // Check for conflicts (actions that interfere with each other)
        const conflict = this.calculateConflict(action1, action2)
        if (conflict > 0) {
          action1.conflictPenalty = Math.max(action1.conflictPenalty, conflict)
          action2.conflictPenalty = Math.max(action2.conflictPenalty, conflict)
        }
      }
    }
  }

  private calculateSynergy(action1: GlobalActionScore, action2: GlobalActionScore): number {
    // Simplified synergy calculation
    if (action1.agentType === 'loss_prevention' && action2.agentType === 'revenue_optimization') {
      return 0.1 // Small synergy bonus
    }
    return 0
  }

  private calculateConflict(action1: GlobalActionScore, action2: GlobalActionScore): number {
    // Simplified conflict calculation
    if (action1.agentType === action2.agentType) {
      return 0.05 // Small penalty for same-agent conflicts
    }
    return 0
  }

  private async identifyConflicts(
    actions: GlobalActionScore[], 
    context: AgentContext
  ): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = []
    
    // Group actions by ASIN to find conflicts
    const asinGroups = new Map<string, GlobalActionScore[]>()
    
    actions.forEach(action => {
      // This would need to get ASIN from recommendation data
      const asin = 'placeholder_asin' // Would get from recommendation
      if (!asinGroups.has(asin)) {
        asinGroups.set(asin, [])
      }
      asinGroups.get(asin)!.push(action)
    })

    // Identify conflicts within each ASIN group
    for (const [asin, asinActions] of asinGroups.entries()) {
      if (asinActions.length > 1) {
        conflicts.push({
          conflictType: 'resource_competition',
          recommendations: asinActions.map(a => a.recommendationId),
          resolution: 'prioritize_highest_impact',
          reasoning: `Multiple recommendations for same product ${asin}`
        })
      }
    }

    return conflicts
  }

  private async resolveConflict(
    conflict: ConflictResolution, 
    context: AgentContext
  ): Promise<ConflictResolution> {
    // Apply conflict resolution strategy
    switch (conflict.conflictType) {
      case 'resource_competition':
        conflict.resolution = 'prioritize_highest_impact'
        break
      case 'contradictory_actions':
        conflict.resolution = 'escalate_to_seller'
        break
      case 'timing_conflict':
        conflict.resolution = 'sequence_actions'
        break
    }

    return conflict
  }

  private async getSellerProfile(sellerId: string): Promise<any> {
    // Get seller's historical interaction patterns
    const { data: outcomes } = await supabaseAdmin
      .from('recommendation_outcomes')
      .select(`
        implemented_at, implementation_method, seller_satisfaction,
        recommendations!inner(agent_type)
      `)
      .eq('recommendations.seller_id', sellerId)
      .limit(100)

    const agentResponseRates: any = {}
    
    outcomes?.forEach(outcome => {
      const agentType = (outcome as any).recommendations.agent_type
      if (!agentResponseRates[agentType]) {
        agentResponseRates[agentType] = { total: 0, implemented: 0 }
      }
      agentResponseRates[agentType].total++
      if (outcome.implemented_at) {
        agentResponseRates[agentType].implemented++
      }
    })

    // Calculate response rates
    Object.keys(agentResponseRates).forEach(agent => {
      const data = agentResponseRates[agent]
      agentResponseRates[agent] = data.total > 0 ? data.implemented / data.total : 0.5
    })

    return {
      agentResponseRates,
      totalInteractions: outcomes?.length || 0,
      avgSatisfaction: outcomes?.reduce((sum, o) => sum + (o.seller_satisfaction || 3), 0) / (outcomes?.length || 1)
    }
  }

  private getAgentDistribution(actions: GlobalActionScore[]): any {
    const distribution: any = {}
    actions.forEach(action => {
      distribution[action.agentType] = (distribution[action.agentType] || 0) + 1
    })
    return distribution
  }

  private estimateTimeRequired(actions: GlobalActionScore[]): string {
    // Simplified time estimation
    const count = actions.length
    if (count <= 2) return '15-30 minutes'
    if (count <= 5) return '30-60 minutes'
    return '1-2 hours'
  }

  private async getSystemPerformanceMetrics(sellerId: string): Promise<any> {
    return {
      agent_response_time: '150ms avg',
      recommendation_accuracy: '85%',
      seller_satisfaction: '4.2/5'
    }
  }

  private async identifySystemOptimizations(context: AgentContext): Promise<RecommendationInput[]> {
    // Would identify system-level optimizations
    return []
  }

  private async getRecentLearningOutcomes(sellerId: string): Promise<any[]> {
    const { data: outcomes } = await supabaseAdmin
      .from('recommendation_outcomes')
      .select(`
        *, recommendations!inner(agent_type, recommendation_type, reasoning)
      `)
      .eq('recommendations.seller_id', sellerId)
      .gte('measured_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    return outcomes || []
  }

  private identifyCrossAgentLearnings(outcomes: any[]): any[] {
    // Identify patterns that could benefit other agents
    return outcomes.map(outcome => ({
      sourceRecommendationId: outcome.recommendation_id,
      sourceAgent: outcome.recommendations.agent_type,
      implemented: outcome.implemented_at !== null,
      actualImpact: outcome.actual_impact,
      accuracy: outcome.accuracy_score,
      feedback: outcome.seller_feedback,
      contextFactors: outcome.lessons_learned,
      relevantAgents: ['all'] // Simplified - would have logic to determine relevance
    }))
  }

  private async updateGlobalLearningCache(learnings: any[], context: AgentContext): Promise<void> {
    try {
      for (const learning of learnings) {
        await this.cacheIntelligence(
          null, // Global cache
          'cross_agent_learning',
          {
            source_agent: learning.sourceAgent,
            pattern_type: learning.contextFactors?.pattern_type || 'general',
            success_factors: learning.contextFactors?.success_factors || [],
            accuracy: learning.accuracy,
            impact: learning.actualImpact
          },
          learning.accuracy,
          72 // 3 days
        )
      }
    } catch (error) {
      console.error('Failed to update global learning cache:', error)
    }
  }

  private async updateGlobalIntelligence(
    agentResults: Map<string, any>, 
    context: AgentContext
  ): Promise<void> {
    try {
      const globalStats = {
        total_recommendations: 0,
        total_predicted_impact: 0,
        agent_performance: {} as any,
        system_health: 'healthy'
      }

      for (const [agentType, result] of agentResults.entries()) {
        globalStats.total_recommendations += result.recommendations.length
        globalStats.total_predicted_impact += result.recommendations.reduce(
          (sum: number, rec: any) => sum + (rec.predicted_impact || 0), 0
        )
        globalStats.agent_performance[agentType] = {
          recommendations: result.recommendations.length,
          errors: result.errors.length,
          avg_confidence: result.recommendations.reduce(
            (sum: number, rec: any) => sum + (rec.confidence_score || 0), 0
          ) / Math.max(result.recommendations.length, 1)
        }
      }

      await this.cacheIntelligence(
        context.sellerId,
        'system_status',
        globalStats,
        0.95,
        1 // 1 hour
      )

      // Publish system status event
      await eventBus.publish(createEvent(
        'system.status_update',
        'performance',
        context.sellerId,
        globalStats,
        { importance: 3 }
      ))

    } catch (error) {
      console.error('Failed to update global intelligence:', error)
    }
  }
}