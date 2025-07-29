import { supabaseAdmin } from '../database/connection'
import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'

export interface IntelligenceQuery {
  type: 'pattern_recognition' | 'correlation_analysis' | 'predictive_insight' | 'contextual_recommendation'
  domain: 'inventory' | 'pricing' | 'competition' | 'reviews' | 'advertising' | 'cross_domain'
  sellerId?: string
  context: Record<string, any>
  timeframe?: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  confidenceThreshold?: number
}

export interface IntelligenceInsight {
  id: string
  type: string
  domain: string
  pattern: string
  description: string
  confidence: number
  impact: number
  evidence: any[]
  recommendations: string[]
  correlations: any[]
  metadata: {
    source: string
    generatedAt: Date
    validUntil: Date
    usageCount: number
  }
}

export interface PatternRecognitionResult {
  patterns: DetectedPattern[]
  correlations: CrossDomainCorrelation[]
  insights: IntelligenceInsight[]
  confidence: number
}

export interface DetectedPattern {
  id: string
  name: string
  type: 'seasonal' | 'trend' | 'anomaly' | 'cycle' | 'correlation'
  domain: string
  description: string
  strength: number
  frequency: string
  examples: any[]
  predictivePower: number
  actionableInsights: string[]
}

export interface CrossDomainCorrelation {
  id: string
  domains: string[]
  correlation: number
  causality: 'none' | 'weak' | 'moderate' | 'strong'
  description: string
  examples: any[]
  businessImplications: string[]
}

export class IntelligenceEngine {
  private openai: OpenAI
  private anthropic: Anthropic
  private patternCache = new Map<string, any>()
  private correlationCache = new Map<string, CrossDomainCorrelation[]>()

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  // Main intelligence query interface
  async query(query: IntelligenceQuery): Promise<IntelligenceInsight[]> {
    try {
      console.log(`Intelligence Engine: Processing ${query.type} query for ${query.domain}`)

      let insights: IntelligenceInsight[] = []

      switch (query.type) {
        case 'pattern_recognition':
          insights = await this.recognizePatterns(query)
          break
        case 'correlation_analysis':
          insights = await this.analyzeCorrelations(query)
          break
        case 'predictive_insight':
          insights = await this.generatePredictiveInsights(query)
          break
        case 'contextual_recommendation':
          insights = await this.generateContextualRecommendations(query)
          break
      }

      // Cache insights for future use
      await this.cacheInsights(insights, query)

      // Log usage metrics
      await this.logIntelligenceUsage(query, insights.length)

      return insights.filter(insight => insight.confidence >= (query.confidenceThreshold || 0.7))

    } catch (error) {
      console.error('Intelligence Engine query failed:', error)
      return []
    }
  }

  // Pattern recognition across domains
  private async recognizePatterns(query: IntelligenceQuery): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = []

    try {
      // Get relevant data for pattern analysis
      const data = await this.gatherPatternData(query)
      
      if (data.length === 0) {
        return insights
      }

      // Run different pattern detection algorithms
      const seasonalPatterns = await this.detectSeasonalPatterns(data, query)
      const trendPatterns = await this.detectTrendPatterns(data, query)
      const anomalyPatterns = await this.detectAnomalies(data, query)
      const cyclicalPatterns = await this.detectCyclicalPatterns(data, query)

      // Combine all detected patterns
      const allPatterns = [
        ...seasonalPatterns,
        ...trendPatterns,
        ...anomalyPatterns,
        ...cyclicalPatterns
      ]

      // Convert patterns to insights using AI
      for (const pattern of allPatterns) {
        if (pattern.strength > 0.6) {
          const insight = await this.patternToInsight(pattern, query)
          if (insight) {
            insights.push(insight)
          }
        }
      }

      console.log(`Detected ${allPatterns.length} patterns, generated ${insights.length} insights`)

    } catch (error) {
      console.error('Pattern recognition failed:', error)
    }

    return insights
  }

  // Cross-domain correlation analysis
  private async analyzeCorrelations(query: IntelligenceQuery): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = []

    try {
      // Check cache first
      const cacheKey = `correlations_${query.sellerId}_${query.domain}`
      let correlations = this.correlationCache.get(cacheKey)

      if (!correlations) {
        // Get multi-domain data
        const multiDomainData = await this.gatherMultiDomainData(query)
        
        // Calculate correlations between domains
        correlations = await this.calculateCrossDomainCorrelations(multiDomainData, query)
        
        // Cache results
        this.correlationCache.set(cacheKey, correlations)
      }

      // Generate insights from significant correlations
      for (const correlation of correlations) {
        if (correlation.correlation > 0.7 || correlation.correlation < -0.7) {
          const insight = await this.correlationToInsight(correlation, query)
          if (insight) {
            insights.push(insight)
          }
        }
      }

    } catch (error) {
      console.error('Correlation analysis failed:', error)
    }

    return insights
  }

  // Generate predictive insights using AI models
  private async generatePredictiveInsights(query: IntelligenceQuery): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = []

    try {
      // Get historical data for prediction
      const historicalData = await this.gatherHistoricalData(query)
      
      if (historicalData.length < 10) {
        return insights // Need sufficient data for predictions
      }

      // Generate predictions using Claude for analysis
      const predictionPrompt = this.buildPredictionPrompt(historicalData, query)
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: predictionPrompt
        }]
      })

      const predictionResult = this.parsePredictionResponse(response.content[0])
      
      if (predictionResult) {
        // Convert AI prediction to structured insight
        const insight: IntelligenceInsight = {
          id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'predictive_insight',
          domain: query.domain,
          pattern: predictionResult.pattern,
          description: predictionResult.description,
          confidence: predictionResult.confidence,
          impact: predictionResult.impact,
          evidence: predictionResult.evidence,
          recommendations: predictionResult.recommendations,
          correlations: [],
          metadata: {
            source: 'claude_prediction',
            generatedAt: new Date(),
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
            usageCount: 0
          }
        }

        insights.push(insight)
      }

    } catch (error) {
      console.error('Predictive insight generation failed:', error)
    }

    return insights
  }

  // Generate contextual recommendations
  private async generateContextualRecommendations(query: IntelligenceQuery): Promise<IntelligenceInsight[]> {
    const insights: IntelligenceInsight[] = []

    try {
      // Get seller context and current situation
      const contextData = await this.gatherContextualData(query)
      
      // Get similar successful cases from intelligence cache
      const similarCases = await this.findSimilarSuccessCases(query)
      
      // Generate recommendations using GPT-4 with context
      const recommendationPrompt = this.buildRecommendationPrompt(contextData, similarCases, query)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon business strategist. Analyze the provided context and generate actionable, specific recommendations based on successful patterns and current market conditions.'
        }, {
          role: 'user',
          content: recommendationPrompt
        }],
        max_tokens: 2000,
        temperature: 0.3
      })

      const recommendations = this.parseRecommendationResponse(response.choices[0].message.content)
      
      for (const rec of recommendations) {
        const insight: IntelligenceInsight = {
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'contextual_recommendation',
          domain: query.domain,
          pattern: rec.pattern,
          description: rec.description,
          confidence: rec.confidence,
          impact: rec.impact,
          evidence: rec.evidence,
          recommendations: rec.actionableSteps,
          correlations: rec.correlations || [],
          metadata: {
            source: 'gpt4_recommendation',
            generatedAt: new Date(),
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            usageCount: 0
          }
        }

        insights.push(insight)
      }

    } catch (error) {
      console.error('Contextual recommendation generation failed:', error)
    }

    return insights
  }

  // Data gathering methods
  private async gatherPatternData(query: IntelligenceQuery): Promise<any[]> {
    const data: any[] = []

    try {
      const timeframe = query.timeframe || {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
        end: new Date()
      }

      let queryBuilder = supabaseAdmin
        .from('fact_stream')
        .select('*')
        .gte('timestamp', timeframe.start.toISOString())
        .lte('timestamp', timeframe.end.toISOString())

      if (query.sellerId) {
        queryBuilder = queryBuilder.eq('seller_id', query.sellerId)
      }

      if (query.domain !== 'cross_domain') {
        queryBuilder = queryBuilder.eq('event_category', query.domain)
      }

      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value)
        })
      }

      const { data: events, error } = await queryBuilder
        .order('timestamp', { ascending: true })
        .limit(10000)

      if (error) throw error

      return events || []

    } catch (error) {
      console.error('Failed to gather pattern data:', error)
      return []
    }
  }

  private async gatherMultiDomainData(query: IntelligenceQuery): Promise<Map<string, any[]>> {
    const domainData = new Map<string, any[]>()
    const domains = ['inventory', 'pricing', 'competition', 'reviews', 'advertising']

    try {
      for (const domain of domains) {
        const domainQuery = { ...query, domain: domain as any }
        const data = await this.gatherPatternData(domainQuery)
        domainData.set(domain, data)
      }
    } catch (error) {
      console.error('Failed to gather multi-domain data:', error)
    }

    return domainData
  }

  private async gatherHistoricalData(query: IntelligenceQuery): Promise<any[]> {
    // Extended timeframe for historical analysis
    const extendedQuery = {
      ...query,
      timeframe: {
        start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months
        end: new Date()
      }
    }

    return this.gatherPatternData(extendedQuery)
  }

  private async gatherContextualData(query: IntelligenceQuery): Promise<any> {
    try {
      if (!query.sellerId) return {}

      // Get seller profile and preferences
      const { data: seller, error: sellerError } = await supabaseAdmin
        .from('sellers')
        .select('*')
        .eq('id', query.sellerId)
        .single()

      if (sellerError) throw sellerError

      // Get recent product performance
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select(`
          *, 
          sales_data!inner(units_sold, revenue, conversion_rate, date)
        `)
        .eq('seller_id', query.sellerId)
        .eq('is_active', true)
        .gte('sales_data.date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (productsError) throw productsError

      // Get recent agent recommendations and outcomes
      const { data: recommendations, error: recsError } = await supabaseAdmin
        .from('recommendations')
        .select(`
          *,
          recommendation_outcomes(*)
        `)
        .eq('seller_id', query.sellerId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (recsError) throw recsError

      return {
        seller,
        products: products || [],
        recentRecommendations: recommendations || [],
        context: query.context
      }

    } catch (error) {
      console.error('Failed to gather contextual data:', error)
      return {}
    }
  }

  // Pattern detection algorithms
  private async detectSeasonalPatterns(data: any[], query: IntelligenceQuery): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []

    try {
      // Group data by time periods
      const monthlyData = this.groupDataByMonth(data)
      const weeklyData = this.groupDataByWeek(data)
      const dailyData = this.groupDataByDayOfWeek(data)

      // Detect monthly seasonality
      const monthlyPattern = this.calculateSeasonality(monthlyData, 'monthly')
      if (monthlyPattern.strength > 0.6) {
        patterns.push({
          id: `seasonal_monthly_${Date.now()}`,
          name: 'Monthly Seasonality',
          type: 'seasonal',
          domain: query.domain,
          description: `Strong monthly seasonal pattern detected with ${(monthlyPattern.strength * 100).toFixed(1)}% consistency`,
          strength: monthlyPattern.strength,
          frequency: 'monthly',
          examples: monthlyPattern.examples,
          predictivePower: monthlyPattern.strength * 0.8,
          actionableInsights: [
            'Adjust inventory levels based on seasonal demand',
            'Plan marketing campaigns around peak months',
            'Optimize pricing for seasonal trends'
          ]
        })
      }

      // Detect weekly patterns
      const weeklyPattern = this.calculateSeasonality(weeklyData, 'weekly')
      if (weeklyPattern.strength > 0.5) {
        patterns.push({
          id: `seasonal_weekly_${Date.now()}`,
          name: 'Weekly Seasonality',
          type: 'seasonal',
          domain: query.domain,
          description: `Weekly pattern identified with ${(weeklyPattern.strength * 100).toFixed(1)}% consistency`,
          strength: weeklyPattern.strength,
          frequency: 'weekly',
          examples: weeklyPattern.examples,
          predictivePower: weeklyPattern.strength * 0.7,
          actionableInsights: [
            'Optimize ad spend based on weekly patterns',
            'Adjust pricing for weekend vs weekday demand',
            'Schedule promotions during peak days'
          ]
        })
      }

      // Detect daily patterns
      const dailyPattern = this.calculateSeasonality(dailyData, 'daily')
      if (dailyPattern.strength > 0.4) {
        patterns.push({
          id: `seasonal_daily_${Date.now()}`,
          name: 'Day-of-Week Pattern',
          type: 'seasonal',
          domain: query.domain,
          description: `Day-of-week pattern found with ${(dailyPattern.strength * 100).toFixed(1)}% consistency`,
          strength: dailyPattern.strength,
          frequency: 'daily',
          examples: dailyPattern.examples,
          predictivePower: dailyPattern.strength * 0.6,
          actionableInsights: [
            'Time product launches for optimal days',
            'Adjust customer service staffing',
            'Schedule time-sensitive promotions'
          ]
        })
      }

    } catch (error) {
      console.error('Seasonal pattern detection failed:', error)
    }

    return patterns
  }

  private async detectTrendPatterns(data: any[], query: IntelligenceQuery): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []

    try {
      // Extract numeric values from events for trend analysis
      const timeSeriesData = this.extractTimeSeriesData(data)
      
      for (const [metric, values] of timeSeriesData.entries()) {
        if (values.length < 10) continue

        const trendAnalysis = this.calculateTrend(values)
        
        if (Math.abs(trendAnalysis.slope) > 0.1 && trendAnalysis.confidence > 0.7) {
          const direction = trendAnalysis.slope > 0 ? 'increasing' : 'decreasing'
          const strength = Math.min(1, Math.abs(trendAnalysis.slope) * trendAnalysis.confidence)

          patterns.push({
            id: `trend_${metric}_${Date.now()}`,
            name: `${metric} Trend`,
            type: 'trend',
            domain: query.domain,
            description: `${metric} is ${direction} with ${(strength * 100).toFixed(1)}% confidence`,
            strength,
            frequency: 'continuous',
            examples: trendAnalysis.examples,
            predictivePower: strength * 0.8,
            actionableInsights: this.generateTrendInsights(metric, direction, strength)
          })
        }
      }

    } catch (error) {
      console.error('Trend pattern detection failed:', error)
    }

    return patterns
  }

  private async detectAnomalies(data: any[], query: IntelligenceQuery): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []

    try {
      const timeSeriesData = this.extractTimeSeriesData(data)
      
      for (const [metric, values] of timeSeriesData.entries()) {
        if (values.length < 20) continue

        const anomalies = this.detectTimeSeriesAnomalies(values)
        
        if (anomalies.length > 0) {
          const significantAnomalies = anomalies.filter(a => a.significance > 2.0)
          
          if (significantAnomalies.length > 0) {
            patterns.push({
              id: `anomaly_${metric}_${Date.now()}`,
              name: `${metric} Anomalies`,
              type: 'anomaly',
              domain: query.domain,
              description: `${significantAnomalies.length} significant anomalies detected in ${metric}`,
              strength: Math.min(1, significantAnomalies.length / 10),
              frequency: 'irregular',
              examples: significantAnomalies.slice(0, 5),
              predictivePower: 0.6,
              actionableInsights: this.generateAnomalyInsights(metric, significantAnomalies)
            })
          }
        }
      }

    } catch (error) {
      console.error('Anomaly detection failed:', error)
    }

    return patterns
  }

  private async detectCyclicalPatterns(data: any[], query: IntelligenceQuery): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []

    try {
      // Look for repeating cycles in the data
      const timeSeriesData = this.extractTimeSeriesData(data)
      
      for (const [metric, values] of timeSeriesData.entries()) {
        if (values.length < 30) continue

        const cycles = this.detectCycles(values)
        
        for (const cycle of cycles) {
          if (cycle.strength > 0.5) {
            patterns.push({
              id: `cycle_${metric}_${cycle.period}_${Date.now()}`,
              name: `${metric} ${cycle.period}-period Cycle`,
              type: 'cycle',
              domain: query.domain,
              description: `Cyclical pattern with ${cycle.period} period and ${(cycle.strength * 100).toFixed(1)}% strength`,
              strength: cycle.strength,
              frequency: `${cycle.period} periods`,
              examples: cycle.examples,
              predictivePower: cycle.strength * 0.7,
              actionableInsights: this.generateCycleInsights(metric, cycle)
            })
          }
        }
      }

    } catch (error) {
      console.error('Cyclical pattern detection failed:', error)
    }

    return patterns
  }

  // Cross-domain correlation calculation
  private async calculateCrossDomainCorrelations(
    multiDomainData: Map<string, any[]>,
    query: IntelligenceQuery
  ): Promise<CrossDomainCorrelation[]> {
    const correlations: CrossDomainCorrelation[] = []

    try {
      const domains = Array.from(multiDomainData.keys())
      
      for (let i = 0; i < domains.length; i++) {
        for (let j = i + 1; j < domains.length; j++) {
          const domain1 = domains[i]
          const domain2 = domains[j]
          
          const data1 = multiDomainData.get(domain1) || []
          const data2 = multiDomainData.get(domain2) || []
          
          if (data1.length < 10 || data2.length < 10) continue
          
          const correlation = await this.calculateCorrelationBetweenDomains(data1, data2, domain1, domain2)
          
          if (Math.abs(correlation.correlation) > 0.5) {
            correlations.push(correlation)
          }
        }
      }

    } catch (error) {
      console.error('Cross-domain correlation calculation failed:', error)
    }

    return correlations
  }

  private async calculateCorrelationBetweenDomains(
    data1: any[],
    data2: any[],
    domain1: string,
    domain2: string
  ): Promise<CrossDomainCorrelation> {
    try {
      // Extract comparable metrics from both domains
      const metrics1 = this.extractComparableMetrics(data1, domain1)
      const metrics2 = this.extractComparableMetrics(data2, domain2)
      
      // Calculate correlation coefficient
      const correlation = this.calculatePearsonCorrelation(metrics1, metrics2)
      
      // Determine causality strength
      const causality = this.determineCausality(correlation, domain1, domain2)
      
      // Generate description and examples
      const description = this.generateCorrelationDescription(correlation, domain1, domain2)
      const examples = this.findCorrelationExamples(data1, data2, correlation)
      const implications = this.generateBusinessImplications(correlation, domain1, domain2)

      return {
        id: `corr_${domain1}_${domain2}_${Date.now()}`,
        domains: [domain1, domain2],
        correlation,
        causality,
        description,
        examples,
        businessImplications: implications
      }

    } catch (error) {
      console.error('Domain correlation calculation failed:', error)
      return {
        id: `corr_error_${Date.now()}`,
        domains: [domain1, domain2],
        correlation: 0,
        causality: 'none',
        description: 'Correlation calculation failed',
        examples: [],
        businessImplications: []
      }
    }
  }

  // AI integration methods
  private buildPredictionPrompt(historicalData: any[], query: IntelligenceQuery): string {
    const dataummary = this.summarizeDataForAI(historicalData)
    
    return `
Analyze the following Amazon seller data and generate predictive insights:

Domain: ${query.domain}
Seller Context: ${JSON.stringify(query.context, null, 2)}
Data Summary: ${JSON.stringify(dataummary, null, 2)}

Please provide:
1. Key patterns identified in the data
2. Predicted trends for the next 30 days
3. Confidence level (0-1) for each prediction
4. Potential business impact (estimated $ value)
5. Supporting evidence from the data
6. Actionable recommendations

Format your response as JSON with the following structure:
{
  "pattern": "description of main pattern",
  "description": "detailed explanation",
  "confidence": 0.85,
  "impact": 1500,
  "evidence": ["evidence point 1", "evidence point 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
`
  }

  private buildRecommendationPrompt(contextData: any, similarCases: any[], query: IntelligenceQuery): string {
    return `
Generate contextual business recommendations for an Amazon seller:

Current Situation:
${JSON.stringify(contextData, null, 2)}

Similar Success Cases:
${JSON.stringify(similarCases, null, 2)}

Query Context:
${JSON.stringify(query.context, null, 2)}

Please provide specific, actionable recommendations that:
1. Address the current business situation
2. Leverage insights from similar success cases
3. Are tailored to the seller's context and constraints
4. Include expected outcomes and confidence levels

Format as JSON array:
[
  {
    "pattern": "opportunity pattern",
    "description": "detailed recommendation",
    "confidence": 0.8,
    "impact": 2000,
    "evidence": ["supporting evidence"],
    "actionableSteps": ["step 1", "step 2"],
    "correlations": []
  }
]
`
  }

  private parsePredictionResponse(content: any): any {
    try {
      if (typeof content === 'string') {
        // Extract JSON from Claude's response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      } else if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
      return null
    } catch (error) {
      console.error('Failed to parse prediction response:', error)
      return null
    }
  }

  private parseRecommendationResponse(content: string | null): any[] {
    try {
      if (!content) return []
      
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return []
    } catch (error) {
      console.error('Failed to parse recommendation response:', error)
      return []
    }
  }

  // Helper methods for pattern analysis
  private groupDataByMonth(data: any[]): Map<number, any[]> {
    const groups = new Map<number, any[]>()
    
    data.forEach(item => {
      const month = new Date(item.timestamp).getMonth()
      if (!groups.has(month)) {
        groups.set(month, [])
      }
      groups.get(month)!.push(item)
    })
    
    return groups
  }

  private groupDataByWeek(data: any[]): Map<number, any[]> {
    const groups = new Map<number, any[]>()
    
    data.forEach(item => {
      const date = new Date(item.timestamp)
      const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))
      if (!groups.has(week)) {
        groups.set(week, [])
      }
      groups.get(week)!.push(item)
    })
    
    return groups
  }

  private groupDataByDayOfWeek(data: any[]): Map<number, any[]> {
    const groups = new Map<number, any[]>()
    
    data.forEach(item => {
      const dayOfWeek = new Date(item.timestamp).getDay()
      if (!groups.has(dayOfWeek)) {
        groups.set(dayOfWeek, [])
      }
      groups.get(dayOfWeek)!.push(item)
    })
    
    return groups
  }

  private calculateSeasonality(groupedData: Map<number, any[]>, type: string): {
    strength: number
    examples: any[]
  } {
    const values: number[] = []
    const examples: any[] = []
    
    for (const [period, items] of groupedData.entries()) {
      const value = items.length // Use count as a simple metric
      values.push(value)
      examples.push({ period, count: value, sample: items.slice(0, 2) })
    }
    
    if (values.length < 3) {
      return { strength: 0, examples: [] }
    }
    
    // Calculate coefficient of variation as a measure of seasonality strength
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    const strength = mean > 0 ? Math.min(1, stdDev / mean) : 0
    
    return {
      strength,
      examples: examples.slice(0, 5)
    }
  }

  private extractTimeSeriesData(data: any[]): Map<string, number[]> {
    const timeSeriesMap = new Map<string, number[]>()
    
    data.forEach(item => {
      if (item.data && typeof item.data === 'object') {
        Object.entries(item.data).forEach(([key, value]) => {
          if (typeof value === 'number') {
            if (!timeSeriesMap.has(key)) {
              timeSeriesMap.set(key, [])
            }
            timeSeriesMap.get(key)!.push(value)
          }
        })
      }
      
      // Also include importance score
      if (item.importance_score) {
        if (!timeSeriesMap.has('importance_score')) {
          timeSeriesMap.set('importance_score', [])
        }
        timeSeriesMap.get('importance_score')!.push(item.importance_score)
      }
    })
    
    return timeSeriesMap
  }

  private calculateTrend(values: number[]): {
    slope: number
    confidence: number
    examples: any[]
  } {
    if (values.length < 5) {
      return { slope: 0, confidence: 0, examples: [] }
    }
    
    // Simple linear regression
    const n = values.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = values.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    // Calculate R-squared for confidence
    const yMean = sumY / n
    const ssRes = values.reduce((sum, y, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n
      return sum + Math.pow(y - predicted, 2)
    }, 0)
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0)
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0
    
    const examples = values.slice(0, 5).map((value, index) => ({
      index,
      value,
      predicted: slope * index + (sumY - slope * sumX) / n
    }))
    
    return {
      slope,
      confidence: Math.max(0, rSquared),
      examples
    }
  }

  private detectTimeSeriesAnomalies(values: number[]): Array<{
    index: number
    value: number
    significance: number
  }> {
    const anomalies: Array<{ index: number; value: number; significance: number }> = []
    
    if (values.length < 10) return anomalies
    
    // Calculate moving average and standard deviation
    const windowSize = Math.min(10, Math.floor(values.length / 3))
    
    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i)
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length
      const stdDev = Math.sqrt(variance)
      
      if (stdDev > 0) {
        const zScore = Math.abs((values[i] - mean) / stdDev)
        
        if (zScore > 2) { // 2 standard deviations
          anomalies.push({
            index: i,
            value: values[i],
            significance: zScore
          })
        }
      }
    }
    
    return anomalies
  }

  private detectCycles(values: number[]): Array<{
    period: number
    strength: number
    examples: any[]
  }> {
    const cycles: Array<{ period: number; strength: number; examples: any[] }> = []
    
    if (values.length < 20) return cycles
    
    // Test for cycles of different periods
    const maxPeriod = Math.floor(values.length / 4)
    
    for (let period = 2; period <= maxPeriod; period++) {
      const correlations: number[] = []
      
      // Calculate autocorrelation at this period
      for (let lag = period; lag < values.length; lag += period) {
        if (lag + period < values.length) {
          const segment1 = values.slice(lag - period, lag)
          const segment2 = values.slice(lag, lag + period)
          
          if (segment1.length === segment2.length) {
            const correlation = this.calculatePearsonCorrelation(segment1, segment2)
            correlations.push(correlation)
          }
        }
      }
      
      if (correlations.length > 2) {
        const avgCorrelation = correlations.reduce((sum, corr) => sum + Math.abs(corr), 0) / correlations.length
        
        if (avgCorrelation > 0.5) {
          cycles.push({
            period,
            strength: avgCorrelation,
            examples: correlations.slice(0, 3).map((corr, i) => ({
              segment: i + 1,
              correlation: corr
            }))
          })
        }
      }
    }
    
    return cycles.sort((a, b) => b.strength - a.strength)
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  // Continue with more helper methods in next part...
  private generateTrendInsights(metric: string, direction: string, strength: number): string[] {
    const insights: string[] = []
    
    if (metric.includes('price') || metric.includes('cost')) {
      if (direction === 'increasing') {
        insights.push('Monitor competitor pricing to maintain competitiveness')
        insights.push('Consider value-added bundling to justify higher prices')
        insights.push('Evaluate demand elasticity at current price levels')
      } else {
        insights.push('Investigate cost reduction opportunities')
        insights.push('Assess if price decreases are sustainable long-term')
        insights.push('Monitor margin impact and profitability')
      }
    } else if (metric.includes('sales') || metric.includes('revenue')) {
      if (direction === 'increasing') {
        insights.push('Scale inventory to meet growing demand')
        insights.push('Invest in marketing to accelerate growth')
        insights.push('Monitor supply chain capacity')
      } else {
        insights.push('Identify factors causing sales decline')
        insights.push('Review marketing effectiveness')
        insights.push('Analyze competitive landscape changes')
      }
    } else if (metric.includes('inventory') || metric.includes('stock')) {
      if (direction === 'decreasing') {
        insights.push('Implement proactive restocking processes')
        insights.push('Review supplier lead times and reliability')
        insights.push('Consider safety stock adjustments')
      } else {
        insights.push('Optimize inventory turnover rates')
        insights.push('Evaluate slow-moving stock')
        insights.push('Consider inventory reduction strategies')
      }
    }
    
    return insights
  }

  private generateAnomalyInsights(metric: string, anomalies: any[]): string[] {
    const insights: string[] = []
    
    insights.push(`${anomalies.length} significant anomalies detected in ${metric}`)
    
    if (anomalies.some(a => a.significance > 3)) {
      insights.push('Extreme outliers present - investigate root causes')
    }
    
    insights.push('Monitor for recurring anomaly patterns')
    insights.push('Implement automated anomaly detection alerts')
    insights.push('Review data quality and collection processes')
    
    return insights
  }

  private generateCycleInsights(metric: string, cycle: any): string[] {
    const insights: string[] = []
    
    insights.push(`Regular ${cycle.period}-period cycle identified in ${metric}`)
    insights.push(`Plan operations around ${cycle.period}-period intervals`)
    
    if (cycle.period <= 7) {
      insights.push('Weekly operational cycle - optimize staffing and inventory')
    } else if (cycle.period <= 30) {
      insights.push('Monthly cycle - align with billing and planning cycles')
    } else {
      insights.push('Long-term cycle - incorporate into strategic planning')
    }
    
    return insights
  }

  // Conversion and caching methods
  private async patternToInsight(pattern: DetectedPattern, query: IntelligenceQuery): Promise<IntelligenceInsight | null> {
    try {
      return {
        id: pattern.id,
        type: 'pattern_recognition',
        domain: pattern.domain,
        pattern: pattern.name,
        description: pattern.description,
        confidence: pattern.strength,
        impact: pattern.predictivePower * 1000, // Rough impact estimation
        evidence: pattern.examples,
        recommendations: pattern.actionableInsights,
        correlations: [],
        metadata: {
          source: 'pattern_detection',
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          usageCount: 0
        }
      }
    } catch (error) {
      console.error('Failed to convert pattern to insight:', error)
      return null
    }
  }

  private async correlationToInsight(correlation: CrossDomainCorrelation, query: IntelligenceQuery): Promise<IntelligenceInsight | null> {
    try {
      return {
        id: correlation.id,
        type: 'correlation_analysis',
        domain: 'cross_domain',
        pattern: `${correlation.domains.join(' ↔ ')} Correlation`,
        description: correlation.description,
        confidence: Math.abs(correlation.correlation),
        impact: Math.abs(correlation.correlation) * 2000, // Rough impact estimation
        evidence: correlation.examples,
        recommendations: correlation.businessImplications,
        correlations: [correlation],
        metadata: {
          source: 'correlation_analysis',
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
          usageCount: 0
        }
      }
    } catch (error) {
      console.error('Failed to convert correlation to insight:', error)
      return null
    }
  }

  // More helper methods continue...
  private extractComparableMetrics(data: any[], domain: string): number[] {
    const metrics: number[] = []
    
    data.forEach(item => {
      if (item.importance_score) {
        metrics.push(item.importance_score)
      } else if (item.data && typeof item.data === 'object') {
        // Extract first numeric value from data
        const numericValues = Object.values(item.data).filter(v => typeof v === 'number') as number[]
        if (numericValues.length > 0) {
          metrics.push(numericValues[0])
        }
      }
    })
    
    return metrics
  }

  private determineCausality(correlation: number, domain1: string, domain2: string): 'none' | 'weak' | 'moderate' | 'strong' {
    const absCorr = Math.abs(correlation)
    
    if (absCorr < 0.3) return 'none'
    if (absCorr < 0.5) return 'weak'
    if (absCorr < 0.7) return 'moderate'
    return 'strong'
  }

  private generateCorrelationDescription(correlation: number, domain1: string, domain2: string): string {
    const absCorr = Math.abs(correlation)
    const direction = correlation > 0 ? 'positive' : 'negative'
    const strength = absCorr > 0.7 ? 'strong' : absCorr > 0.5 ? 'moderate' : 'weak'
    
    return `${strength} ${direction} correlation (${correlation.toFixed(3)}) between ${domain1} and ${domain2} activities`
  }

  private findCorrelationExamples(data1: any[], data2: any[], correlation: number): any[] {
    // Simplified example generation
    return [
      {
        domain1_sample: data1.slice(0, 2),
        domain2_sample: data2.slice(0, 2),
        correlation_strength: correlation
      }
    ]
  }

  private generateBusinessImplications(correlation: number, domain1: string, domain2: string): string[] {
    const implications: string[] = []
    
    if (Math.abs(correlation) > 0.6) {
      implications.push(`Changes in ${domain1} are likely to affect ${domain2}`)
      implications.push(`Monitor ${domain1} metrics as leading indicators for ${domain2}`)
      implications.push(`Coordinate strategies between ${domain1} and ${domain2} teams`)
    }
    
    if (correlation > 0.7) {
      implications.push(`Strong positive relationship - optimize both domains together`)
    } else if (correlation < -0.7) {
      implications.push(`Strong negative relationship - balance trade-offs carefully`)
    }
    
    return implications
  }

  private summarizeDataForAI(data: any[]): any {
    if (data.length === 0) return {}
    
    const summary = {
      total_events: data.length,
      date_range: {
        start: data[0]?.timestamp,
        end: data[data.length - 1]?.timestamp
      },
      event_types: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      importance_distribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      sample_events: data.slice(0, 5)
    }
    
    data.forEach(item => {
      // Count event types
      if (item.event_type) {
        summary.event_types[item.event_type] = (summary.event_types[item.event_type] || 0) + 1
      }
      
      // Count categories
      if (item.event_category) {
        summary.categories[item.event_category] = (summary.categories[item.event_category] || 0) + 1
      }
      
      // Count importance levels
      const importance = item.importance_score || 5
      if (importance >= 9) summary.importance_distribution.critical++
      else if (importance >= 7) summary.importance_distribution.high++
      else if (importance >= 4) summary.importance_distribution.medium++
      else summary.importance_distribution.low++
    })
    
    return summary
  }

  private async findSimilarSuccessCases(query: IntelligenceQuery): Promise<any[]> {
    try {
      // Get successful recommendation outcomes from intelligence cache
      const { data: successCases, error } = await supabaseAdmin
        .from('intelligence_cache')
        .select('*')
        .eq('cache_type', 'success_case')
        .gte('confidence_score', 0.8)
        .order('confidence_score', { ascending: false })
        .limit(5)

      if (error) throw error

      return successCases?.map(sc => ({
        pattern: sc.data.pattern,
        outcome: sc.data.outcome,
        context: sc.data.context,
        confidence: sc.confidence_score
      })) || []

    } catch (error) {
      console.error('Failed to find similar success cases:', error)
      return []
    }
  }

  // Caching and logging methods
  private async cacheInsights(insights: IntelligenceInsight[], query: IntelligenceQuery): Promise<void> {
    try {
      for (const insight of insights) {
        await supabaseAdmin
          .from('intelligence_cache')
          .insert({
            cache_key: `insight_${insight.id}`,
            seller_id: query.sellerId,
            cache_type: insight.type,
            domain: insight.domain,
            data: {
              pattern: insight.pattern,
              description: insight.description,
              recommendations: insight.recommendations,
              correlations: insight.correlations
            },
            confidence_score: insight.confidence,
            expires_at: insight.metadata.validUntil.toISOString(),
            tags: [insight.type, insight.domain, 'ai_generated']
          })
      }
    } catch (error) {
      console.error('Failed to cache insights:', error)
    }
  }

  private async logIntelligenceUsage(query: IntelligenceQuery, resultCount: number): Promise<void> {
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'intelligence_usage',
          metric_name: `${query.type}_query`,
          metric_value: resultCount,
          dimensions: {
            domain: query.domain,
            seller_id: query.sellerId,
            has_context: Object.keys(query.context || {}).length > 0,
            has_filters: Object.keys(query.filters || {}).length > 0
          }
        })
    } catch (error) {
      console.error('Failed to log intelligence usage:', error)
    }
  }
}

// Global singleton instance
export const intelligenceEngine = new IntelligenceEngine()