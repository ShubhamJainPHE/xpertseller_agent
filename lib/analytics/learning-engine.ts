import { supabaseAdmin } from '../database/connection'
import { intelligenceEngine } from '../intelligence/intelligence-engine'
import { OpenAI } from 'openai'

export interface LearningOutcome {
  recommendationId: string
  agentType: string
  recommendationType: string
  implemented: boolean
  implementationMethod: 'manual' | 'one_click' | 'automated'
  actualImpact: number
  predictedImpact: number
  accuracy: number
  timeToImplement: number // hours
  sellerSatisfaction: number // 1-5 scale
  contextFactors: Record<string, any>
  lessons: string[]
}

export interface LearningPattern {
  id: string
  patternType: 'success_factor' | 'failure_mode' | 'optimization_opportunity'
  description: string
  frequency: number
  confidence: number
  applicableContexts: string[]
  recommendations: string[]
  evidence: LearningOutcome[]
}

export interface AgentPerformanceMetrics {
  agentType: string
  totalRecommendations: number
  implementationRate: number
  averageAccuracy: number
  averageImpact: number
  satisfactionScore: number
  improvementTrend: number
  strengthAreas: string[]
  improvementAreas: string[]
  calibrationScore: number // How well predicted vs actual align
}

export interface SystemLearningInsights {
  overallAccuracy: number
  totalValueGenerated: number
  learningVelocity: number
  crossAgentSynergies: Array<{
    agents: string[]
    synergyType: string
    effectSize: number
  }>
  emergentPatterns: LearningPattern[]
  systemOptimizations: Array<{
    area: string
    optimization: string
    expectedImprovement: number
  }>
}

export class LearningEngine {
  private openai: OpenAI
  private learningPatterns = new Map<string, LearningPattern>()
  private performanceCache = new Map<string, any>()

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  // Main learning processing method
  async processRecommendationOutcome(outcome: LearningOutcome): Promise<void> {
    try {
      console.log(`Processing learning outcome for recommendation ${outcome.recommendationId}`)

      // Store outcome in database
      await this.storeOutcome(outcome)

      // Extract learning patterns
      const patterns = await this.extractLearningPatterns(outcome)
      
      // Update agent performance metrics
      await this.updateAgentMetrics(outcome)

      // Generate cross-agent learning insights
      await this.generateCrossAgentInsights(outcome)

      // Update system-wide learning
      await this.updateSystemLearning(outcome)

      // Generate actionable insights
      const insights = await this.generateActionableInsights(outcome)
      
      // Cache insights for quick access
      await this.cacheInsights(insights, outcome.agentType)

      console.log(`Learning processing completed for ${outcome.recommendationId}`)

    } catch (error) {
      console.error('Learning processing failed:', error)
    }
  }

  // Extract patterns from learning outcomes
  private async extractLearningPatterns(outcome: LearningOutcome): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = []

    try {
      // Get similar outcomes for pattern analysis
      const similarOutcomes = await this.getSimilarOutcomes(outcome)
      
      if (similarOutcomes.length < 3) {
        return patterns // Need sufficient data for pattern extraction
      }

      // Analyze success patterns
      const successfulOutcomes = similarOutcomes.filter(o => o.accuracy > 0.8 && o.implemented)
      if (successfulOutcomes.length > 0) {
        const successPattern = await this.analyzeSuccessPattern(successfulOutcomes)
        if (successPattern) {
          patterns.push(successPattern)
        }
      }

      // Analyze failure patterns
      const failedOutcomes = similarOutcomes.filter(o => o.accuracy < 0.5 || !o.implemented)
      if (failedOutcomes.length > 0) {
        const failurePattern = await this.analyzeFailurePattern(failedOutcomes)
        if (failurePattern) {
          patterns.push(failurePattern)
        }
      }

      // Analyze optimization opportunities
      const optimizationPattern = await this.analyzeOptimizationOpportunities(similarOutcomes)
      if (optimizationPattern) {
        patterns.push(optimizationPattern)
      }

      // Store patterns for future use
      for (const pattern of patterns) {
        this.learningPatterns.set(pattern.id, pattern)
        await this.storeLearningPattern(pattern)
      }

      return patterns

    } catch (error) {
      console.error('Pattern extraction failed:', error)
      return []
    }
  }

  private async getSimilarOutcomes(outcome: LearningOutcome): Promise<LearningOutcome[]> {
    try {
      const { data: outcomes, error } = await supabaseAdmin
        .from('recommendation_outcomes')
        .select(`
          *,
          recommendations!inner(agent_type, recommendation_type, reasoning)
        `)
        .eq('recommendations.agent_type', outcome.agentType)
        .eq('recommendations.recommendation_type', outcome.recommendationType)
        .gte('measured_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .limit(50)

      if (error) throw error

      return outcomes?.map(this.mapOutcomeFromDB) || []
    } catch (error) {
      console.error('Failed to get similar outcomes:', error)
      return []
    }
  }

  private async analyzeSuccessPattern(outcomes: LearningOutcome[]): Promise<LearningPattern | null> {
    try {
      // Use AI to analyze success factors
      const analysisPrompt = `
Analyze these successful recommendation outcomes and identify common success patterns:

${JSON.stringify(outcomes.map(o => ({
  accuracy: o.accuracy,
  impact: o.actualImpact,
  satisfaction: o.sellerSatisfaction,
  context: o.contextFactors,
  implementation_method: o.implementationMethod
})), null, 2)}

Identify:
1. Common factors that led to success
2. Optimal contexts for this recommendation type
3. Best implementation methods
4. Key success indicators

Provide insights as JSON:
{
  "success_factors": ["factor1", "factor2"],
  "optimal_contexts": ["context1", "context2"],
  "best_practices": ["practice1", "practice2"],
  "key_indicators": ["indicator1", "indicator2"]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{
          role: 'system',
          content: 'You are an expert at analyzing business recommendation patterns and extracting actionable insights.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        max_tokens: 1000,
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')

      return {
        id: `success_${outcomes[0].agentType}_${Date.now()}`,
        patternType: 'success_factor',
        description: `Success pattern for ${outcomes[0].agentType} recommendations`,
        frequency: outcomes.length,
        confidence: this.calculatePatternConfidence(outcomes),
        applicableContexts: analysis.optimal_contexts || [],
        recommendations: analysis.best_practices || [],
        evidence: outcomes
      }

    } catch (error) {
      console.error('Success pattern analysis failed:', error)
      return null
    }
  }

  private async analyzeFailurePattern(outcomes: LearningOutcome[]): Promise<LearningPattern | null> {
    try {
      // Use AI to analyze failure modes
      const analysisPrompt = `
Analyze these failed recommendation outcomes and identify common failure patterns:

${JSON.stringify(outcomes.map(o => ({
  accuracy: o.accuracy,
  implemented: o.implemented,
  satisfaction: o.sellerSatisfaction,
  context: o.contextFactors,
  lessons: o.lessons
})), null, 2)}

Identify:
1. Common failure modes
2. Contexts to avoid
3. Warning signs
4. Prevention strategies

Provide insights as JSON:
{
  "failure_modes": ["mode1", "mode2"],
  "risk_contexts": ["context1", "context2"],
  "warning_signs": ["sign1", "sign2"],
  "prevention_strategies": ["strategy1", "strategy2"]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{
          role: 'system',
          content: 'You are an expert at analyzing business recommendation failures and developing prevention strategies.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        max_tokens: 1000,
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')

      return {
        id: `failure_${outcomes[0].agentType}_${Date.now()}`,
        patternType: 'failure_mode',
        description: `Failure pattern for ${outcomes[0].agentType} recommendations`,
        frequency: outcomes.length,
        confidence: this.calculatePatternConfidence(outcomes),
        applicableContexts: analysis.risk_contexts || [],
        recommendations: analysis.prevention_strategies || [],
        evidence: outcomes
      }

    } catch (error) {
      console.error('Failure pattern analysis failed:', error)
      return null
    }
  }

  private async analyzeOptimizationOpportunities(outcomes: LearningOutcome[]): Promise<LearningPattern | null> {
    try {
      // Find optimization opportunities
      const avgAccuracy = outcomes.reduce((sum, o) => sum + o.accuracy, 0) / outcomes.length
      const avgImpact = outcomes.reduce((sum, o) => sum + o.actualImpact, 0) / outcomes.length
      const avgSatisfaction = outcomes.reduce((sum, o) => sum + o.sellerSatisfaction, 0) / outcomes.length

      if (avgAccuracy > 0.8 && avgImpact > 100 && avgSatisfaction > 4) {
        return null // Already performing well
      }

      const optimizationPrompt = `
Analyze these recommendation outcomes and identify optimization opportunities:

Current Performance:
- Average Accuracy: ${avgAccuracy.toFixed(2)}
- Average Impact: $${avgImpact.toFixed(2)}
- Average Satisfaction: ${avgSatisfaction.toFixed(1)}/5

Outcomes: ${JSON.stringify(outcomes.slice(0, 10), null, 2)}

Identify specific optimizations to improve:
1. Accuracy (prediction vs reality)
2. Impact (value generated)
3. Satisfaction (seller experience)

Provide as JSON:
{
  "accuracy_optimizations": ["opt1", "opt2"],
  "impact_optimizations": ["opt1", "opt2"],
  "satisfaction_optimizations": ["opt1", "opt2"],
  "expected_improvements": {
    "accuracy": 0.1,
    "impact": 50,
    "satisfaction": 0.5
  }
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{
          role: 'system',
          content: 'You are an expert at optimizing AI recommendation systems for maximum business value.'
        }, {
          role: 'user',
          content: optimizationPrompt
        }],
        max_tokens: 1000,
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')

      return {
        id: `optimization_${outcomes[0].agentType}_${Date.now()}`,
        patternType: 'optimization_opportunity',
        description: `Optimization opportunities for ${outcomes[0].agentType}`,
        frequency: outcomes.length,
        confidence: 0.7,
        applicableContexts: ['all'],
        recommendations: [
          ...(analysis.accuracy_optimizations || []),
          ...(analysis.impact_optimizations || []),
          ...(analysis.satisfaction_optimizations || [])
        ],
        evidence: outcomes
      }

    } catch (error) {
      console.error('Optimization analysis failed:', error)
      return null
    }
  }

  // Agent performance analysis
  async getAgentPerformanceMetrics(
    agentType: string, 
    timeframe: number = 30
  ): Promise<AgentPerformanceMetrics> {
    try {
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000)

      // Get outcomes for this agent
      const { data: outcomes, error } = await supabaseAdmin
        .from('recommendation_outcomes')
        .select(`
          *,
          recommendations!inner(agent_type, recommendation_type, predicted_impact, confidence_score)
        `)
        .eq('recommendations.agent_type', agentType)
        .gte('measured_at', startDate.toISOString())

      if (error) throw error

      if (!outcomes || outcomes.length === 0) {
        return this.getDefaultMetrics(agentType)
      }

      const implementedCount = outcomes.filter(o => o.implemented_at).length
      const implementationRate = implementedCount / outcomes.length

      const accuracyScores = outcomes.map(o => o.accuracy_score || 0).filter(s => s > 0)
      const averageAccuracy = accuracyScores.length > 0 
        ? accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length 
        : 0

      const impacts = outcomes.map(o => o.actual_impact || 0)
      const averageImpact = impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length

      const satisfactionScores = outcomes.map(o => o.seller_satisfaction || 0).filter(s => s > 0)
      const satisfactionScore = satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length
        : 0

      // Calculate calibration (how well predictions match reality)
      const calibrationScore = this.calculateCalibrationScore(outcomes)

      // Calculate improvement trend
      const improvementTrend = this.calculateImprovementTrend(outcomes)

      // Identify strength and improvement areas
      const { strengthAreas, improvementAreas } = await this.identifyPerformanceAreas(agentType, outcomes)

      return {
        agentType,
        totalRecommendations: outcomes.length,
        implementationRate,
        averageAccuracy,
        averageImpact,
        satisfactionScore,
        improvementTrend,
        strengthAreas,
        improvementAreas,
        calibrationScore
      }

    } catch (error) {
      console.error('Failed to get agent performance metrics:', error)
      return this.getDefaultMetrics(agentType)
    }
  }

  private calculateCalibrationScore(outcomes: any[]): number {
    if (outcomes.length === 0) return 0

    let totalCalibrationError = 0
    let validPredictions = 0

    outcomes.forEach(outcome => {
      const predicted = (outcome as any).recommendations?.predicted_impact || 0
      const actual = outcome.actual_impact || 0
      
      if (predicted !== 0) {
        const error = Math.abs(predicted - actual) / Math.abs(predicted)
        totalCalibrationError += Math.min(error, 2) // Cap error at 200%
        validPredictions++
      }
    })

    if (validPredictions === 0) return 0

    const avgError = totalCalibrationError / validPredictions
    return Math.max(0, 1 - avgError) // Convert error to score (1 = perfect, 0 = terrible)
  }

  private calculateImprovementTrend(outcomes: any[]): number {
    if (outcomes.length < 6) return 0

    // Sort by date
    const sortedOutcomes = outcomes.sort((a, b) => 
      new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    )

    // Compare first half vs second half accuracy
    const midpoint = Math.floor(sortedOutcomes.length / 2)
    const firstHalf = sortedOutcomes.slice(0, midpoint)
    const secondHalf = sortedOutcomes.slice(midpoint)

    const firstHalfAccuracy = firstHalf.reduce((sum, o) => sum + (o.accuracy_score || 0), 0) / firstHalf.length
    const secondHalfAccuracy = secondHalf.reduce((sum, o) => sum + (o.accuracy_score || 0), 0) / secondHalf.length

    return secondHalfAccuracy - firstHalfAccuracy // Positive = improving, negative = declining
  }

  private async identifyPerformanceAreas(
    agentType: string, 
    outcomes: any[]
  ): Promise<{ strengthAreas: string[]; improvementAreas: string[] }> {
    try {
      // Group outcomes by recommendation type
      const typeGroups = new Map<string, any[]>()
      outcomes.forEach(outcome => {
        const type = (outcome as any).recommendations?.recommendation_type || 'unknown'
        if (!typeGroups.has(type)) {
          typeGroups.set(type, [])
        }
        typeGroups.get(type)!.push(outcome)
      })

      const strengthAreas: string[] = []
      const improvementAreas: string[] = []

      // Analyze each recommendation type
      for (const [type, typeOutcomes] of typeGroups.entries()) {
        if (typeOutcomes.length < 3) continue // Need sufficient data

        const avgAccuracy = typeOutcomes.reduce((sum, o) => sum + (o.accuracy_score || 0), 0) / typeOutcomes.length
        const implementationRate = typeOutcomes.filter(o => o.implemented_at).length / typeOutcomes.length

        if (avgAccuracy > 0.8 && implementationRate > 0.7) {
          strengthAreas.push(type)
        } else if (avgAccuracy < 0.6 || implementationRate < 0.4) {
          improvementAreas.push(type)
        }
      }

      return { strengthAreas, improvementAreas }

    } catch (error) {
      console.error('Failed to identify performance areas:', error)
      return { strengthAreas: [], improvementAreas: [] }
    }
  }

  // System-wide learning insights
  async getSystemLearningInsights(timeframe: number = 30): Promise<SystemLearningInsights> {
    try {
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000)

      // Get all outcomes
      const { data: outcomes, error } = await supabaseAdmin
        .from('recommendation_outcomes')
        .select(`
          *,
          recommendations!inner(agent_type, predicted_impact, confidence_score)
        `)
        .gte('measured_at', startDate.toISOString())

      if (error) throw error

      const totalOutcomes = outcomes?.length || 0
      if (totalOutcomes === 0) {
        return this.getDefaultSystemInsights()
      }

      // Calculate overall accuracy
      const accuracyScores = outcomes!.map(o => o.accuracy_score || 0).filter(s => s > 0)
      const overallAccuracy = accuracyScores.length > 0
        ? accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length
        : 0

      // Calculate total value generated
      const totalValueGenerated = outcomes!.reduce((sum, o) => sum + (o.actual_impact || 0), 0)

      // Calculate learning velocity (improvement rate)
      const learningVelocity = this.calculateLearningVelocity(outcomes!)

      // Identify cross-agent synergies
      const crossAgentSynergies = await this.identifyCrossAgentSynergies(outcomes!)

      // Get emergent patterns
      const emergentPatterns = Array.from(this.learningPatterns.values())
        .filter(p => p.confidence > 0.7)
        .slice(0, 10)

      // Generate system optimizations
      const systemOptimizations = await this.generateSystemOptimizations(outcomes!)

      return {
        overallAccuracy,
        totalValueGenerated,
        learningVelocity,
        crossAgentSynergies,
        emergentPatterns,
        systemOptimizations
      }

    } catch (error) {
      console.error('Failed to get system learning insights:', error)
      return this.getDefaultSystemInsights()
    }
  }

  private calculateLearningVelocity(outcomes: any[]): number {
    if (outcomes.length < 10) return 0

    // Sort by date and calculate accuracy improvement over time
    const sortedOutcomes = outcomes.sort((a, b) => 
      new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    )

    const windowSize = Math.floor(outcomes.length / 4)
    const quarters = []

    for (let i = 0; i < 4; i++) {
      const start = i * windowSize
      const end = i === 3 ? outcomes.length : (i + 1) * windowSize
      const quarterOutcomes = sortedOutcomes.slice(start, end)
      
      const avgAccuracy = quarterOutcomes.reduce((sum, o) => sum + (o.accuracy_score || 0), 0) / quarterOutcomes.length
      quarters.push(avgAccuracy)
    }

    // Calculate trend using linear regression
    const n = quarters.length
    const sumX = (n * (n - 1)) / 2 // Sum of indices 0,1,2,3
    const sumY = quarters.reduce((sum, acc) => sum + acc, 0)
    const sumXY = quarters.reduce((sum, acc, i) => sum + (i * acc), 0)
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6 // Sum of squares

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    return slope // Positive = learning, negative = declining
  }

  private async identifyCrossAgentSynergies(outcomes: any[]): Promise<Array<{
    agents: string[]
    synergyType: string
    effectSize: number
  }>> {
    const synergies: Array<{ agents: string[]; synergyType: string; effectSize: number }> = []

    try {
      // Group outcomes by seller to look for cross-agent interactions
      const sellerGroups = new Map<string, any[]>()
      outcomes.forEach(outcome => {
        const sellerId = outcome.seller_id
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, [])
        }
        sellerGroups.get(sellerId)!.push(outcome)
      })

      // Analyze sellers with multiple agent interactions
      for (const [sellerId, sellerOutcomes] of sellerGroups.entries()) {
        if (sellerOutcomes.length < 4) continue

        const agentTypes = new Set(sellerOutcomes.map(o => (o as any).recommendations.agent_type))
        if (agentTypes.size < 2) continue

        // Look for timing-based synergies (recommendations close in time performing better)
        const timeSynergy = this.analyzeTimingSynergy(sellerOutcomes)
        if (timeSynergy.effectSize > 0.1) {
          synergies.push({
            agents: Array.from(agentTypes),
            synergyType: 'timing_synergy',
            effectSize: timeSynergy.effectSize
          })
        }
      }

      return synergies.slice(0, 5) // Top 5 synergies

    } catch (error) {
      console.error('Failed to identify cross-agent synergies:', error)
      return []
    }
  }

  private analyzeTimingSynergy(outcomes: any[]): { effectSize: number } {
    // Simplified analysis - look at outcomes within 24 hours of each other
    const sortedOutcomes = outcomes.sort((a, b) => 
      new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    )

    let synergyCount = 0
    let totalPairs = 0

    for (let i = 0; i < sortedOutcomes.length - 1; i++) {
      for (let j = i + 1; j < sortedOutcomes.length; j++) {
        const timeDiff = new Date(sortedOutcomes[j].measured_at).getTime() - 
                        new Date(sortedOutcomes[i].measured_at).getTime()
        
        if (timeDiff > 24 * 60 * 60 * 1000) break // More than 24 hours

        totalPairs++
        
        // Check if both outcomes were successful
        const bothSuccessful = (sortedOutcomes[i].accuracy_score || 0) > 0.7 && 
                              (sortedOutcomes[j].accuracy_score || 0) > 0.7
        
        if (bothSuccessful) {
          synergyCount++
        }
      }
    }

    const effectSize = totalPairs > 0 ? synergyCount / totalPairs : 0
    return { effectSize }
  }

  private async generateSystemOptimizations(outcomes: any[]): Promise<Array<{
    area: string
    optimization: string
    expectedImprovement: number
  }>> {
    const optimizations: Array<{ area: string; optimization: string; expectedImprovement: number }> = []

    try {
      // Analyze common failure modes across all agents
      const failedOutcomes = outcomes.filter(o => (o.accuracy_score || 0) < 0.6 || !o.implemented_at)
      
      if (failedOutcomes.length > outcomes.length * 0.3) { // More than 30% failure rate
        optimizations.push({
          area: 'prediction_accuracy',
          optimization: 'Implement ensemble methods and better confidence calibration',
          expectedImprovement: 0.15
        })
      }

      // Check for implementation rate issues
      const implementationRate = outcomes.filter(o => o.implemented_at).length / outcomes.length
      if (implementationRate < 0.6) {
        optimizations.push({
          area: 'user_experience',
          optimization: 'Improve recommendation explanations and reduce friction in implementation',
          expectedImprovement: 0.2
        })
      }

      // Check for satisfaction issues
      const satisfactionScores = outcomes.map(o => o.seller_satisfaction || 0).filter(s => s > 0)
      const avgSatisfaction = satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length
        : 0

      if (avgSatisfaction < 4) {
        optimizations.push({
          area: 'personalization',
          optimization: 'Enhance personalization based on seller context and preferences',
          expectedImprovement: 0.5
        })
      }

      return optimizations

    } catch (error) {
      console.error('Failed to generate system optimizations:', error)
      return []
    }
  }

  // Helper methods
  private mapOutcomeFromDB(dbOutcome: any): LearningOutcome {
    return {
      recommendationId: dbOutcome.recommendation_id,
      agentType: dbOutcome.recommendations.agent_type,
      recommendationType: dbOutcome.recommendations.recommendation_type,
      implemented: !!dbOutcome.implemented_at,
      implementationMethod: dbOutcome.implementation_method || 'manual',
      actualImpact: dbOutcome.actual_impact || 0,
      predictedImpact: dbOutcome.recommendations.predicted_impact || 0,
      accuracy: dbOutcome.accuracy_score || 0,
      timeToImplement: dbOutcome.implemented_at 
        ? Math.round((new Date(dbOutcome.implemented_at).getTime() - new Date(dbOutcome.created_at).getTime()) / (60 * 60 * 1000))
        : 0,
      sellerSatisfaction: dbOutcome.seller_satisfaction || 0,
      contextFactors: dbOutcome.lessons_learned || {},
      lessons: typeof dbOutcome.lessons_learned === 'string' ? [dbOutcome.lessons_learned] : []
    }
  }

  private calculatePatternConfidence(outcomes: LearningOutcome[]): number {
    const sampleSize = outcomes.length
    const baseConfidence = Math.min(0.95, sampleSize / 20) // Max confidence at 20+ samples
    
    const consistencyScore = this.calculateConsistency(outcomes)
    
    return baseConfidence * consistencyScore
  }

  private calculateConsistency(outcomes: LearningOutcome[]): number {
    // Measure how consistent the outcomes are
    const accuracies = outcomes.map(o => o.accuracy)
    const impacts = outcomes.map(o => o.actualImpact)
    
    const accuracyStd = this.calculateStandardDeviation(accuracies)
    const impactCV = this.calculateCoefficientOfVariation(impacts)
    
    // Lower variance = higher consistency
    const accuracyConsistency = Math.max(0, 1 - accuracyStd)
    const impactConsistency = Math.max(0, 1 - impactCV / 2)
    
    return (accuracyConsistency + impactConsistency) / 2
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
    return Math.sqrt(variance)
  }

  private calculateCoefficientOfVariation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const std = this.calculateStandardDeviation(values)
    return mean === 0 ? 0 : std / Math.abs(mean)
  }

  // Default values for when insufficient data
  private getDefaultMetrics(agentType: string): AgentPerformanceMetrics {
    return {
      agentType,
      totalRecommendations: 0,
      implementationRate: 0,
      averageAccuracy: 0,
      averageImpact: 0,
      satisfactionScore: 0,
      improvementTrend: 0,
      strengthAreas: [],
      improvementAreas: [],
      calibrationScore: 0
    }
  }

  private getDefaultSystemInsights(): SystemLearningInsights {
    return {
      overallAccuracy: 0,
      totalValueGenerated: 0,
      learningVelocity: 0,
      crossAgentSynergies: [],
      emergentPatterns: [],
      systemOptimizations: []
    }
  }

  // Storage methods
  private async storeOutcome(outcome: LearningOutcome): Promise<void> {
    // This would typically be called by the API when outcomes are recorded
    // The outcome is already stored in recommendation_outcomes table
  }

  private async storeLearningPattern(pattern: LearningPattern): Promise<void> {
    try {
      await supabaseAdmin
        .from('learning_patterns')
        .upsert({
          id: pattern.id,
          pattern_type: pattern.patternType,
          description: pattern.description,
          frequency: pattern.frequency,
          confidence: pattern.confidence,
          applicable_contexts: pattern.applicableContexts,
          recommendations: pattern.recommendations,
          evidence_count: pattern.evidence.length,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to store learning pattern:', error)
    }
  }

  private async generateActionableInsights(outcome: LearningOutcome): Promise<any> {
    // Generate insights that can be used by the meta-agent
    return {
      agent_type: outcome.agentType,
      insight_type: 'learning_outcome',
      performance_score: outcome.accuracy,
      impact_score: outcome.actualImpact,
      satisfaction_score: outcome.sellerSatisfaction,
      recommendations: outcome.lessons
    }
  }

  private async cacheInsights(insights: any, agentType: string): Promise<void> {
    try {
      await intelligenceEngine.query({
        type: 'pattern_recognition',
        domain: 'cross_domain',
        context: {
          agent_type: agentType,
          insights
        }
      })
    } catch (error) {
      console.error('Failed to cache insights:', error)
    }
  }
}

// Global singleton instance
export const learningEngine = new LearningEngine()