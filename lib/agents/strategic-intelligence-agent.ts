import { BaseAgent, AgentConfig, AgentContext, RecommendationInput, LearningData } from './base-agent'
import { supabaseAdmin } from '../database/connection'
import { spApiManager } from '../sp-api/manager'
import { intelligenceEngine } from '../intelligence/intelligence-engine'
import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'

interface MarketOpportunity {
  category: string
  subcategory: string
  marketSize: number
  growthRate: number
  competitionLevel: 'low' | 'medium' | 'high'
  entryBarriers: string[]
  profitPotential: number
  timeToEntry: number
  confidence: number
  keyInsights: string[]
}

interface CompetitiveIntelligence {
  threats: Array<{
    competitor: string
    threatType: 'pricing' | 'product' | 'market_share' | 'innovation'
    severity: number
    impact: number
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
    mitigation: string[]
  }>
  opportunities: Array<{
    area: string
    type: 'competitor_weakness' | 'market_gap' | 'trend_shift'
    potential: number
    difficulty: number
    strategy: string[]
  }>
  marketPosition: {
    strengths: string[]
    weaknesses: string[]
    marketShare: number
    competitiveAdvantage: string[]
  }
}

interface TrendAnalysis {
  trend: string
  category: string
  direction: 'growing' | 'declining' | 'stable' | 'emerging'
  strength: number
  timeframe: number
  businessImpact: number
  actionItems: string[]
  confidence: number
}

export class StrategicIntelligenceAgent extends BaseAgent {
  private openai: OpenAI
  private anthropic: Anthropic
  private marketDataCache = new Map<string, any>()
  private competitorIntelCache = new Map<string, any>()
  private trendAnalysisCache = new Map<string, any>()

  constructor() {
    super({
      name: 'Strategic Intelligence',
      version: '2.0.0',
      capabilities: [
        'real_market_opportunity_detection',
        'competitive_intelligence_analysis',
        'strategic_portfolio_optimization',
        'market_trend_forecasting',
        'expansion_strategy_planning'
      ],
      updateFrequency: 180, // Every 3 hours for strategic analysis
      confidenceThreshold: 0.75,
      maxRecommendationsPerHour: 8
    })

    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async analyze(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      console.log(`Strategic Intelligence: Analyzing market opportunities for ${context.sellerId}`)

      // 1. Real Market Opportunity Analysis
      const marketOpportunities = await this.identifyRealMarketOpportunities(context)
      recommendations.push(...marketOpportunities)

      // 2. Competitive Intelligence Analysis
      const competitiveIntel = await this.analyzeCompetitiveLandscape(context)
      recommendations.push(...competitiveIntel)

      // 3. Portfolio Strategy Optimization
      const portfolioStrategy = await this.optimizePortfolioStrategy(context)
      recommendations.push(...portfolioStrategy)

      // 4. Market Trend Analysis
      const trendAnalysis = await this.analyzeLongTermTrends(context)
      recommendations.push(...trendAnalysis)

      // 5. Expansion Strategy Planning
      const expansionOpportunities = await this.planExpansionStrategy(context)
      recommendations.push(...expansionOpportunities)

      // Cache strategic insights for other agents
      await this.cacheStrategicInsights(context.sellerId, recommendations)

      console.log(`Strategic Intelligence: Generated ${recommendations.length} strategic recommendations`)

    } catch (error) {
      console.error('Strategic Intelligence Agent analysis failed:', error)
    }

    return recommendations.sort((a, b) => b.predictedImpact - a.predictedImpact)
  }

  private async identifyRealMarketOpportunities(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get seller's current portfolio and performance
      const portfolioData = await this.getSellerPortfolioAnalysis(context.sellerId)
      
      if (!portfolioData || portfolioData.products.length === 0) {
        return recommendations
      }

      // Analyze current categories and find expansion opportunities
      const currentCategories = new Set(portfolioData.products.map(p => p.category).filter(Boolean))
      const topPerformingCategories = portfolioData.products
        .filter(p => (p.velocity_30d || 0) > 5)
        .map(p => p.category)
        .filter(Boolean)

      // Use AI to identify market opportunities
      const opportunityPrompt = `
Analyze this Amazon seller's portfolio and identify HIGH-VALUE market opportunities:

Current Portfolio:
- Total Products: ${portfolioData.products.length}
- Top Categories: ${Array.from(currentCategories).join(', ')}
- Monthly Revenue: $${portfolioData.monthlyRevenue.toFixed(0)}
- Top Performers: ${topPerformingCategories.slice(0, 5).join(', ')}

Performance Metrics:
- Average Margin: ${portfolioData.avgMargin.toFixed(1)}%
- Average Velocity: ${portfolioData.avgVelocity.toFixed(1)} units/month
- Buy Box Rate: ${(portfolioData.avgBuyBoxRate * 100).toFixed(1)}%

Seller Context:
- Risk Tolerance: ${context.riskTolerance} (0-1 scale)
- Business Goals: ${JSON.stringify(context.businessContext.goals || [])}
- Available Capital: ${context.businessContext.available_capital || 'Unknown'}

Identify 3-5 SPECIFIC market opportunities considering:
1. Adjacent categories with high demand, low competition
2. Seasonal opportunities in existing categories  
3. Product variations/improvements in successful categories
4. Emerging trends that match seller strengths
5. International expansion possibilities

For each opportunity, provide:
{
  "opportunities": [
    {
      "category": "specific category name",
      "subcategory": "specific subcategory", 
      "opportunity_type": "adjacent_expansion|seasonal|product_variation|trend_based|international",
      "market_size_monthly": number (units),
      "avg_price_point": number,
      "competition_level": "low|medium|high",
      "entry_investment": number,
      "time_to_profitability": number (months),
      "profit_potential_monthly": number,
      "key_success_factors": ["factor1", "factor2"],
      "risks": ["risk1", "risk2"],
      "confidence": number (0-1),
      "why_good_fit": "explanation for this seller"
    }
  ]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon market analyst with deep knowledge of product categories, seasonal trends, and competitive dynamics. Provide data-driven market opportunity analysis.'
        }, {
          role: 'user',
          content: opportunityPrompt
        }],
        temperature: 0.2,
        max_tokens: 2000
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{"opportunities": []}')
      
      // Process each opportunity
      for (const opp of analysis.opportunities || []) {
        if (opp.confidence < 0.7 || opp.profit_potential_monthly < 500) continue

        // Validate opportunity with additional research
        const validatedOpp = await this.validateMarketOpportunity(opp, portfolioData)
        
        if (!validatedOpp.isValid) continue

        const roi = opp.entry_investment > 0 ? (opp.profit_potential_monthly * 12) / opp.entry_investment : 0

        recommendations.push({
          type: 'market_opportunity',
          title: `Market Opportunity: ${opp.category} - ${opp.subcategory}`,
          description: `${opp.why_good_fit}. Estimated monthly profit: $${opp.profit_potential_monthly}. ROI: ${(roi * 100).toFixed(0)}%`,
          actionRequired: {
            type: 'evaluate_market_opportunity',
            opportunity_type: opp.opportunity_type,
            category: opp.category,
            subcategory: opp.subcategory,
            market_size: opp.market_size_monthly,
            investment_required: opp.entry_investment,
            time_to_profitability: opp.time_to_profitability,
            success_factors: opp.key_success_factors,
            risks: opp.risks,
            next_steps: [
              'Conduct detailed market research',
              'Identify potential suppliers',
              'Analyze competitor products',
              'Calculate detailed ROI projections',
              'Develop product launch strategy'
            ]
          },
          predictedImpact: opp.profit_potential_monthly * 6, // 6-month impact
          confidence: opp.confidence * validatedOpp.validationScore,
          riskLevel: opp.competition_level === 'high' ? 'high' : 'medium',
          urgency: opp.opportunity_type === 'seasonal' ? 'high' : 'normal',
          reasoning: {
            market_analysis: opp,
            portfolio_fit: validatedOpp.fitAnalysis,
            opportunity_scoring: {
              market_size_score: Math.min(10, opp.market_size_monthly / 1000),
              competition_score: opp.competition_level === 'low' ? 8 : opp.competition_level === 'medium' ? 5 : 2,
              roi_score: Math.min(10, roi * 2),
              risk_score: 10 - opp.risks.length * 2
            }
          },
          supportingData: {
            market_opportunity: opp,
            current_portfolio: {
              categories: Array.from(currentCategories),
              performance_metrics: portfolioData.metrics
            },
            validation_results: validatedOpp
          },
          expiresInHours: opp.opportunity_type === 'seasonal' ? 48 : 168 // 2 days for seasonal, 1 week for others
        })
      }

    } catch (error) {
      console.error('Market opportunity analysis failed:', error)
    }

    return recommendations
  }

  private async analyzeCompetitiveLandscape(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get seller's competitive intelligence
      const competitiveData = await this.gatherCompetitiveIntelligence(context.sellerId)
      
      if (!competitiveData || competitiveData.products.length === 0) {
        return recommendations
      }

      // Use Claude for deep competitive analysis
      const competitivePrompt = `
Analyze the competitive landscape for this Amazon seller:

Seller's Products & Performance:
${competitiveData.products.slice(0, 10).map(p => `
- ${p.title} (${p.asin}): $${p.current_price}, ${p.velocity_30d} units/month, ${(p.buy_box_percentage_30d * 100).toFixed(1)}% Buy Box
`).join('')}

Competitor Analysis:
${competitiveData.competitorAnalysis.slice(0, 20).map(c => `
- ${c.competitor_asin}: $${c.price}, Buy Box: ${c.buy_box_winner}, Stock: ${c.stock_status}, ${c.date}
`).join('')}

Market Position:
- Total Revenue: $${competitiveData.totalRevenue}/month
- Portfolio Size: ${competitiveData.products.length} products
- Avg Buy Box Rate: ${(competitiveData.avgBuyBoxRate * 100).toFixed(1)}%

Identify:
1. Immediate competitive threats requiring action
2. Competitor weaknesses to exploit  
3. Market gaps and positioning opportunities
4. Strategic recommendations for competitive advantage

Provide analysis as JSON:
{
  "threats": [
    {
      "threat_type": "pricing|product_launch|market_expansion|buy_box_dominance",
      "competitor": "competitor identifier",
      "description": "threat description",
      "severity": number (1-10),
      "timeframe": "immediate|short_term|medium_term",
      "affected_products": ["asin1", "asin2"],
      "recommended_response": ["action1", "action2"],
      "estimated_impact": number (monthly revenue at risk)
    }
  ],
  "opportunities": [
    {
      "opportunity_type": "competitor_weakness|market_gap|positioning",
      "description": "opportunity description",
      "potential_gain": number (monthly revenue),
      "difficulty": number (1-10),
      "timeframe": "immediate|short_term|medium_term",
      "strategy": ["step1", "step2"],
      "resources_needed": ["resource1", "resource2"]
    }
  ],
  "strategic_recommendations": [
    {
      "area": "pricing|product|marketing|positioning",
      "recommendation": "specific recommendation",
      "rationale": "why this is important",
      "expected_impact": number,
      "implementation_difficulty": number (1-10)
    }
  ]
}
`

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: competitivePrompt
        }]
      })

      const analysis = JSON.parse(response.content[0].text || '{}')

      // Process competitive threats
      for (const threat of analysis.threats || []) {
        if (threat.severity >= 7 && threat.estimated_impact >= 500) {
          recommendations.push({
            type: 'competitive_threat_response',
            title: `Competitive Threat: ${threat.threat_type.replace('_', ' ')} from ${threat.competitor}`,
            description: `${threat.description}. Estimated impact: -$${threat.estimated_impact}/month`,
            actionRequired: {
              type: 'counter_competitive_threat',
              threat_type: threat.threat_type,
              competitor: threat.competitor,
              affected_products: threat.affected_products,
              recommended_response: threat.recommended_response,
              timeframe: threat.timeframe,
              monitoring_required: true
            },
            predictedImpact: -threat.estimated_impact * 3, // 3-month impact
            confidence: threat.severity / 10,
            riskLevel: threat.severity >= 8 ? 'high' : 'medium',
            urgency: threat.timeframe === 'immediate' ? 'critical' : 'high',
            reasoning: {
              threat_analysis: threat,
              competitive_context: competitiveData.summary,
              severity_factors: {
                impact_magnitude: threat.estimated_impact,
                threat_severity: threat.severity,
                response_urgency: threat.timeframe
              }
            },
            supportingData: {
              competitor_data: competitiveData.competitorAnalysis.filter(c => 
                c.competitor_asin.includes(threat.competitor.slice(-5))
              ),
              affected_product_performance: competitiveData.products.filter(p => 
                threat.affected_products?.includes(p.asin)
              )
            },
            expiresInHours: threat.timeframe === 'immediate' ? 6 : 24
          })
        }
      }

      // Process competitive opportunities
      for (const opportunity of analysis.opportunities || []) {
        if (opportunity.potential_gain >= 1000 && opportunity.difficulty <= 7) {
          recommendations.push({
            type: 'competitive_opportunity',
            title: `Competitive Opportunity: ${opportunity.opportunity_type.replace('_', ' ')}`,
            description: `${opportunity.description}. Potential gain: +$${opportunity.potential_gain}/month`,
            actionRequired: {
              type: 'exploit_competitive_opportunity',
              opportunity_type: opportunity.opportunity_type,
              strategy: opportunity.strategy,
              resources_needed: opportunity.resources_needed,
              implementation_steps: opportunity.strategy,
              timeframe: opportunity.timeframe
            },
            predictedImpact: opportunity.potential_gain * 6, // 6-month impact
            confidence: Math.max(0.1, 1 - (opportunity.difficulty / 10)),
            riskLevel: opportunity.difficulty > 6 ? 'medium' : 'low',
            urgency: opportunity.timeframe === 'immediate' ? 'high' : 'normal',
            reasoning: {
              opportunity_analysis: opportunity,
              competitive_advantage: this.assessCompetitiveAdvantage(competitiveData, opportunity),
              implementation_feasibility: 10 - opportunity.difficulty
            },
            supportingData: {
              market_gap_evidence: competitiveData.gapAnalysis,
              competitive_positioning: competitiveData.positioning
            },
            expiresInHours: 72
          })
        }
      }

    } catch (error) {
      console.error('Competitive landscape analysis failed:', error)
    }

    return recommendations
  }

  private async optimizePortfolioStrategy(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get comprehensive portfolio analysis
      const portfolioAnalysis = await this.getAdvancedPortfolioAnalysis(context.sellerId)
      
      if (!portfolioAnalysis || portfolioAnalysis.products.length < 3) {
        return recommendations
      }

      // Use AI for portfolio optimization analysis
      const portfolioPrompt = `
Analyze this Amazon seller's portfolio for strategic optimization:

Portfolio Overview:
- Total Products: ${portfolioAnalysis.products.length}
- Monthly Revenue: $${portfolioAnalysis.totalRevenue}
- Avg Margin: ${portfolioAnalysis.avgMargin.toFixed(1)}%
- Top 20% Products Revenue Share: ${(portfolioAnalysis.revenueConcentration * 100).toFixed(1)}%

Product Performance Distribution:
- High Performers (>$1000/month): ${portfolioAnalysis.highPerformers.length}
- Medium Performers ($200-1000/month): ${portfolioAnalysis.mediumPerformers.length}  
- Low Performers (<$200/month): ${portfolioAnalysis.lowPerformers.length}

Category Analysis:
${Object.entries(portfolioAnalysis.categoryBreakdown).map(([cat, data]: [string, any]) => 
  `- ${cat}: ${data.count} products, $${data.revenue}/month, ${data.avgMargin.toFixed(1)}% margin`
).join('\n')}

Resource Allocation:
- Inventory Investment: $${portfolioAnalysis.inventoryValue}
- Advertising Spend: $${portfolioAnalysis.adSpend}/month
- Operational Complexity: ${portfolioAnalysis.complexityScore}/10

Identify strategic portfolio optimizations:
1. Products to discontinue or deprioritize
2. Products/categories to scale up
3. Resource reallocation opportunities
4. Portfolio diversification needs
5. Operational efficiency improvements

Provide recommendations as JSON:
{
  "optimizations": [
    {
      "type": "discontinue|scale_up|reallocate|diversify|efficiency",
      "title": "optimization title",
      "description": "detailed description",
      "affected_products": ["asin1", "asin2"],
      "expected_impact": number (monthly profit change),
      "implementation_difficulty": number (1-10),
      "timeframe": "immediate|short_term|medium_term|long_term",
      "required_actions": ["action1", "action2"],
      "resource_requirements": {"investment": number, "time": "time estimate"},
      "risk_level": "low|medium|high",
      "confidence": number (0-1)
    }
  ]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert portfolio strategist specializing in Amazon business optimization. Focus on data-driven recommendations that maximize ROI and operational efficiency.'
        }, {
          role: 'user',
          content: portfolioPrompt
        }],
        temperature: 0.15,
        max_tokens: 2000
      })

      const strategy = JSON.parse(response.choices[0].message.content || '{"optimizations": []}')

      // Process portfolio optimizations
      for (const optimization of strategy.optimizations || []) {
        if (optimization.confidence >= 0.7 && Math.abs(optimization.expected_impact) >= 300) {
          
          const isPositiveImpact = optimization.expected_impact > 0
          const urgencyLevel = this.determineUrgencyLevel(optimization.timeframe, optimization.expected_impact)

          recommendations.push({
            type: 'portfolio_strategy_optimization',
            title: `Portfolio Strategy: ${optimization.title}`,
            description: `${optimization.description}. Expected impact: ${isPositiveImpact ? '+' : ''}$${optimization.expected_impact}/month`,
            actionRequired: {
              type: 'implement_portfolio_strategy',
              strategy_type: optimization.type,
              affected_products: optimization.affected_products,
              required_actions: optimization.required_actions,
              resource_requirements: optimization.resource_requirements,
              implementation_plan: {
                timeframe: optimization.timeframe,
                difficulty: optimization.implementation_difficulty,
                milestones: this.generateImplementationMilestones(optimization)
              }
            },
            predictedImpact: optimization.expected_impact * 6, // 6-month impact
            confidence: optimization.confidence,
            riskLevel: optimization.risk_level,
            urgency: urgencyLevel,
            reasoning: {
              portfolio_analysis: portfolioAnalysis.summary,
              optimization_rationale: optimization,
              roi_calculation: {
                investment: optimization.resource_requirements?.investment || 0,
                monthly_return: optimization.expected_impact,
                payback_period: optimization.resource_requirements?.investment ? 
                  (optimization.resource_requirements.investment / Math.abs(optimization.expected_impact)) : 0
              }
            },
            supportingData: {
              current_portfolio_metrics: portfolioAnalysis.metrics,
              affected_products_data: portfolioAnalysis.products.filter(p => 
                optimization.affected_products?.includes(p.asin)
              ),
              category_performance: portfolioAnalysis.categoryBreakdown
            },
            expiresInHours: optimization.timeframe === 'immediate' ? 24 : 168
          })
        }
      }

    } catch (error) {
      console.error('Portfolio strategy optimization failed:', error)
    }

    return recommendations
  }

  private async analyzeLongTermTrends(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get seller's market exposure and categories
      const marketExposure = await this.getSellerMarketExposure(context.sellerId)
      
      if (!marketExposure || marketExposure.categories.length === 0) {
        return recommendations
      }

      // Use Claude for trend analysis
      const trendPrompt = `
Analyze long-term market trends affecting this Amazon seller:

Seller's Market Exposure:
${marketExposure.categories.map(cat => `
- ${cat.name}: ${cat.revenue}% of revenue, ${cat.products} products, Growth: ${cat.growthRate}%
`).join('')}

Business Context:
- Total Revenue: $${marketExposure.totalRevenue}/month
- Geographic Markets: ${marketExposure.marketplaces.join(', ')}
- Business Age: ${marketExposure.businessAge} months
- Risk Tolerance: ${context.riskTolerance}

Analyze key trends for next 12-24 months:
1. Consumer behavior shifts affecting seller's categories
2. Technology/innovation trends
3. Regulatory/policy changes
4. Economic factors and seasonal patterns
5. Competitive landscape evolution

For each significant trend, provide:
{
  "trends": [
    {
      "trend_name": "specific trend name",
      "category": "consumer_behavior|technology|regulatory|economic|competitive",
      "direction": "growing|declining|shifting|emerging",
      "timeline": number (months until impact),
      "impact_magnitude": number (1-10),
      "affected_categories": ["category1", "category2"],
      "business_impact": number (monthly revenue change estimate),
      "preparation_actions": ["action1", "action2"],
      "opportunities": ["opportunity1", "opportunity2"],
      "risks": ["risk1", "risk2"],
      "confidence": number (0-1)
    }
  ]
}
`

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: trendPrompt
        }]
      })

      const trendAnalysis = JSON.parse(response.content[0].text || '{"trends": []}')

      // Process trend analysis
      for (const trend of trendAnalysis.trends || []) {
        if (trend.confidence >= 0.75 && trend.impact_magnitude >= 6 && Math.abs(trend.business_impact) >= 200) {
          
          const isPositiveTrend = trend.business_impact > 0
          const urgencyLevel = trend.timeline <= 6 ? 'high' : trend.timeline <= 12 ? 'normal' : 'low'

          recommendations.push({
            type: 'long_term_trend_preparation',
            title: `Market Trend: ${trend.trend_name}`,
            description: `${trend.direction} trend in ${trend.category} sector. Expected impact: ${isPositiveTrend ? '+' : ''}$${trend.business_impact}/month in ${trend.timeline} months`,
            actionRequired: {
              type: 'prepare_for_market_trend',
              trend_type: trend.category,
              trend_direction: trend.direction,
              timeline_months: trend.timeline,
              affected_categories: trend.affected_categories,
              preparation_actions: trend.preparation_actions,
              opportunities_to_pursue: trend.opportunities,
              risks_to_mitigate: trend.risks,
              monitoring_metrics: this.generateTrendMonitoringMetrics(trend)
            },
            predictedImpact: trend.business_impact * Math.min(12, trend.timeline), // Impact over relevant period
            confidence: trend.confidence,
            riskLevel: trend.business_impact < 0 ? 'high' : 'medium',
            urgency: urgencyLevel,
            reasoning: {
              trend_analysis: trend,
              market_exposure: marketExposure.summary,
              strategic_implications: {
                portfolio_relevance: this.assessTrendRelevance(trend, marketExposure),
                preparation_urgency: trend.timeline,
                impact_assessment: trend.impact_magnitude
              }
            },
            supportingData: {
              affected_categories_data: marketExposure.categories.filter(cat => 
                trend.affected_categories?.includes(cat.name)
              ),
              current_market_position: marketExposure.positioning
            },
            expiresInHours: trend.timeline <= 3 ? 48 : 336 // 2 days for urgent, 2 weeks for long-term
          })
        }
      }

    } catch (error) {
      console.error('Long-term trend analysis failed:', error)
    }

    return recommendations
  }

  private async planExpansionStrategy(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get seller's expansion readiness analysis
      const expansionReadiness = await this.assessExpansionReadiness(context.sellerId)
      
      if (!expansionReadiness.isReady) {
        return recommendations
      }

      // Use AI for expansion planning
      const expansionPrompt = `
Plan expansion strategy for this Amazon seller:

Current Business State:
- Monthly Revenue: $${expansionReadiness.currentRevenue}
- Profit Margin: ${expansionReadiness.avgMargin.toFixed(1)}%
- Cash Flow: $${expansionReadiness.cashFlow}/month
- Operational Capacity: ${expansionReadiness.operationalCapacity}/10
- Team Size: ${expansionReadiness.teamSize} people

Expansion Readiness Factors:
- Financial Stability: ${expansionReadiness.financialStability}/10
- Market Position: ${expansionReadiness.marketPosition}/10
- Operational Excellence: ${expansionReadiness.operationalExcellence}/10
- Risk Management: ${expansionReadiness.riskManagement}/10

Current Markets: ${expansionReadiness.currentMarkets.join(', ')}
Top Categories: ${expansionReadiness.topCategories.join(', ')}

Seller Preferences:
- Risk Tolerance: ${context.riskTolerance}
- Growth Goals: ${JSON.stringify(context.businessContext.growth_goals || {})}
- Available Capital: $${context.businessContext.available_capital || 0}

Identify 2-3 expansion opportunities:
{
  "expansion_opportunities": [
    {
      "type": "geographic|product_line|channel|vertical_integration",
      "target": "specific target (country/category/channel)",
      "description": "expansion description",
      "investment_required": number,
      "timeline_months": number,
      "revenue_potential": number (monthly),
      "risk_factors": ["risk1", "risk2"],
      "success_requirements": ["requirement1", "requirement2"],
      "competitive_advantage": "why this expansion makes sense",
      "implementation_phases": [
        {"phase": "phase name", "duration": number, "key_activities": ["activity1"]}
      ],
      "roi_projection": number,
      "confidence": number (0-1)
    }
  ]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert expansion strategist for Amazon businesses. Focus on realistic, profitable expansion opportunities based on the seller\'s capabilities and market conditions.'
        }, {
          role: 'user',
          content: expansionPrompt
        }],
        temperature: 0.2,
        max_tokens: 2000
      })

      const expansionPlan = JSON.parse(response.choices[0].message.content || '{"expansion_opportunities": []}')

      // Process expansion opportunities
      for (const expansion of expansionPlan.expansion_opportunities || []) {
        if (expansion.confidence >= 0.7 && expansion.roi_projection >= 1.5 && expansion.revenue_potential >= 2000) {
          
          recommendations.push({
            type: 'expansion_strategy',
            title: `Expansion Opportunity: ${expansion.target}`,
            description: `${expansion.description}. ROI: ${(expansion.roi_projection * 100).toFixed(0)}%, Revenue potential: $${expansion.revenue_potential}/month`,
            actionRequired: {
              type: 'evaluate_expansion_opportunity',
              expansion_type: expansion.type,
              target: expansion.target,
              investment_required: expansion.investment_required,
              timeline: expansion.timeline_months,
              success_requirements: expansion.success_requirements,
              risk_factors: expansion.risk_factors,
              implementation_phases: expansion.implementation_phases,
              next_steps: [
                'Conduct detailed market research',
                'Validate financial projections',
                'Assess operational requirements',
                'Develop risk mitigation plan',
                'Create detailed implementation timeline'
              ]
            },
            predictedImpact: expansion.revenue_potential * 12, // Annual impact
            confidence: expansion.confidence,
            riskLevel: expansion.investment_required > expansionReadiness.cashFlow * 6 ? 'high' : 'medium',
            urgency: 'low', // Strategic expansions are typically long-term
            reasoning: {
              expansion_analysis: expansion,
              readiness_assessment: expansionReadiness.scores,
              strategic_fit: {
                financial_capacity: expansionReadiness.financialStability,
                operational_readiness: expansionReadiness.operationalCapacity,
                market_timing: this.assessExpansionTiming(expansion, expansionReadiness)
              }
            },
            supportingData: {
              readiness_metrics: expansionReadiness.metrics,
              current_performance: expansionReadiness.currentPerformance,
              expansion_requirements: expansion.success_requirements
            },
            expiresInHours: 336 // 2 weeks for strategic decisions
          })
        }
      }

    } catch (error) {
      console.error('Expansion strategy planning failed:', error)
    }

    return recommendations
  }

  // Helper methods for data gathering and analysis
  private async getSellerPortfolioAnalysis(sellerId: string): Promise<any> {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          id, asin, title, category, current_price, margin_floor,
          velocity_30d, buy_box_percentage_30d, conversion_rate_30d,
          sales_data!left(revenue, units_sold, date)
        `)
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .gte('sales_data.date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (error || !products) return null

      const monthlyRevenue = products.reduce((sum, p) => 
        sum + ((p as any).sales_data?.reduce((s: number, sale: any) => s + (sale.revenue || 0), 0) || 0), 0
      )

      const avgMargin = products.reduce((sum, p) => sum + (p.margin_floor || 0), 0) / products.length
      const avgVelocity = products.reduce((sum, p) => sum + (p.velocity_30d || 0), 0) / products.length
      const avgBuyBoxRate = products.reduce((sum, p) => sum + (p.buy_box_percentage_30d || 0), 0) / products.length

      return {
        products,
        monthlyRevenue,
        avgMargin,
        avgVelocity,
        avgBuyBoxRate,
        metrics: {
          total_products: products.length,
          revenue_per_product: monthlyRevenue / products.length,
          avg_price: products.reduce((sum, p) => sum + (p.current_price || 0), 0) / products.length
        }
      }

    } catch (error) {
      console.error('Failed to get portfolio analysis:', error)
      return null
    }
  }

  private async validateMarketOpportunity(opportunity: any, portfolioData: any): Promise<{
    isValid: boolean
    validationScore: number
    fitAnalysis: any
  }> {
    try {
      // Validate based on seller's capabilities and market reality
      const categoryExperience = portfolioData.products.filter((p: any) => 
        p.category?.toLowerCase().includes(opportunity.category.toLowerCase())
      ).length

      const pricePointAlignment = portfolioData.products.some((p: any) => 
        Math.abs((p.current_price || 0) - opportunity.avg_price_point) < opportunity.avg_price_point * 0.3
      )

      const marginCompatibility = opportunity.avg_price_point * 0.3 >= portfolioData.avgMargin * 0.8

      const validationScore = (
        (categoryExperience > 0 ? 0.4 : 0.1) +
        (pricePointAlignment ? 0.3 : 0.1) +
        (marginCompatibility ? 0.3 : 0.1)
      )

      return {
        isValid: validationScore >= 0.5,
        validationScore,
        fitAnalysis: {
          category_experience: categoryExperience,
          price_point_alignment: pricePointAlignment,
          margin_compatibility: marginCompatibility
        }
      }

    } catch (error) {
      return { isValid: false, validationScore: 0, fitAnalysis: {} }
    }
  }

  private async gatherCompetitiveIntelligence(sellerId: string): Promise<any> {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          id, asin, title, current_price, velocity_30d, buy_box_percentage_30d,
          competitor_data!left(competitor_asin, price, buy_box_winner, stock_status, date)
        `)
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .gte('competitor_data.date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      if (error || !products) return null

      const competitorAnalysis = products.flatMap(p => (p as any).competitor_data || [])
      const totalRevenue = products.reduce((sum, p) => sum + ((p.velocity_30d || 0) * (p.current_price || 0)), 0)
      const avgBuyBoxRate = products.reduce((sum, p) => sum + (p.buy_box_percentage_30d || 0), 0) / products.length

      return {
        products,
        competitorAnalysis,
        totalRevenue,
        avgBuyBoxRate,
        summary: {
          total_competitors: new Set(competitorAnalysis.map(c => c.competitor_asin)).size,
          avg_competitor_price: competitorAnalysis.reduce((sum, c) => sum + (c.price || 0), 0) / competitorAnalysis.length
        }
      }

    } catch (error) {
      console.error('Failed to gather competitive intelligence:', error)
      return null
    }
  }

  private async getAdvancedPortfolioAnalysis(sellerId: string): Promise<any> {
    try {
      const portfolioData = await this.getSellerPortfolioAnalysis(sellerId)
      if (!portfolioData) return null

      const products = portfolioData.products
      const monthlyRevenues = products.map((p: any) => (p.velocity_30d || 0) * (p.current_price || 0))
      
      const highPerformers = products.filter((p: any) => (p.velocity_30d || 0) * (p.current_price || 0) > 1000)
      const mediumPerformers = products.filter((p: any) => {
        const revenue = (p.velocity_30d || 0) * (p.current_price || 0)
        return revenue >= 200 && revenue <= 1000
      })
      const lowPerformers = products.filter((p: any) => (p.velocity_30d || 0) * (p.current_price || 0) < 200)

      // Category breakdown
      const categoryBreakdown = products.reduce((acc: any, p: any) => {
        const category = p.category || 'Uncategorized'
        if (!acc[category]) {
          acc[category] = { count: 0, revenue: 0, margins: [] }
        }
        acc[category].count++
        acc[category].revenue += (p.velocity_30d || 0) * (p.current_price || 0)
        acc[category].margins.push(p.margin_floor || 0)
        return acc
      }, {})

      Object.keys(categoryBreakdown).forEach(cat => {
        const data = categoryBreakdown[cat]
        data.avgMargin = data.margins.reduce((sum: number, m: number) => sum + m, 0) / data.margins.length
      })

      // Calculate concentration metrics
      const sortedRevenues = monthlyRevenues.sort((a, b) => b - a)
      const totalRevenue = sortedRevenues.reduce((sum, r) => sum + r, 0)
      const top20PercentCount = Math.ceil(products.length * 0.2)
      const top20PercentRevenue = sortedRevenues.slice(0, top20PercentCount).reduce((sum, r) => sum + r, 0)
      const revenueConcentration = totalRevenue > 0 ? top20PercentRevenue / totalRevenue : 0

      return {
        products,
        totalRevenue,
        avgMargin: portfolioData.avgMargin,
        highPerformers,
        mediumPerformers,
        lowPerformers,
        categoryBreakdown,
        revenueConcentration,
        inventoryValue: products.reduce((sum: number, p: any) => sum + ((p.velocity_30d || 0) * (p.current_price || 0) * 0.3), 0), // Estimate
        adSpend: totalRevenue * 0.15, // Estimate 15% of revenue
        complexityScore: Math.min(10, products.length / 10 + Object.keys(categoryBreakdown).length / 2),
        summary: {
          portfolio_health: revenueConcentration < 0.8 ? 'diversified' : 'concentrated',
          performance_distribution: `${highPerformers.length}H/${mediumPerformers.length}M/${lowPerformers.length}L`
        },
        metrics: {
          revenue_concentration: revenueConcentration,
          category_diversification: Object.keys(categoryBreakdown).length,
          avg_product_revenue: totalRevenue / products.length
        }
      }

    } catch (error) {
      console.error('Failed to get advanced portfolio analysis:', error)
      return null
    }
  }

  private async getSellerMarketExposure(sellerId: string): Promise<any> {
    try {
      const portfolioData = await this.getSellerPortfolioAnalysis(sellerId)
      if (!portfolioData) return null

      const categories = portfolioData.products.reduce((acc: any, p: any) => {
        const category = p.category || 'Uncategorized'
        if (!acc[category]) {
          acc[category] = { products: 0, revenue: 0 }
        }
        acc[category].products++
        acc[category].revenue += (p.velocity_30d || 0) * (p.current_price || 0)
        return acc
      }, {})

      const totalRevenue = Object.values(categories).reduce((sum: number, cat: any) => sum + cat.revenue, 0)
      
      const categoryList = Object.entries(categories).map(([name, data]: [string, any]) => ({
        name,
        products: data.products,
        revenue: totalRevenue > 0 ? (data.revenue / totalRevenue * 100) : 0,
        growthRate: Math.random() * 20 - 10 // Placeholder - would get real data
      }))

      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('marketplace_ids, created_at')
        .eq('id', sellerId)
        .single()

      const businessAge = seller ? Math.floor((Date.now() - new Date(seller.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 12

      return {
        categories: categoryList,
        totalRevenue,
        marketplaces: seller?.marketplace_ids || ['US'],
        businessAge,
        summary: {
          category_count: categoryList.length,
          primary_category: categoryList.sort((a, b) => b.revenue - a.revenue)[0]?.name || 'Unknown'
        }
      }

    } catch (error) {
      console.error('Failed to get market exposure:', error)
      return null
    }
  }

  private async assessExpansionReadiness(sellerId: string): Promise<any> {
    try {
      const portfolioData = await this.getAdvancedPortfolioAnalysis(sellerId)
      if (!portfolioData) return { isReady: false }

      const currentRevenue = portfolioData.totalRevenue
      const avgMargin = portfolioData.avgMargin
      const cashFlow = currentRevenue * (avgMargin / 100) // Simplified

      // Scoring factors
      const financialStability = Math.min(10, currentRevenue / 5000) // $5k+ = good
      const marketPosition = Math.min(10, portfolioData.avgMargin / 3) // 30%+ margin = good
      const operationalExcellence = Math.min(10, (10 - portfolioData.complexityScore) + (portfolioData.highPerformers.length / portfolioData.products.length * 5))
      const riskManagement = portfolioData.revenueConcentration < 0.8 ? 8 : 4

      const overallReadiness = (financialStability + marketPosition + operationalExcellence + riskManagement) / 4
      const isReady = overallReadiness >= 6

      return {
        isReady,
        currentRevenue,
        avgMargin,
        cashFlow,
        operationalCapacity: Math.min(10, 10 - portfolioData.complexityScore),
        teamSize: Math.floor(currentRevenue / 10000) + 1, // Estimate
        financialStability,
        marketPosition,
        operationalExcellence,
        riskManagement,
        currentMarkets: ['US'], // Simplified
        topCategories: Object.keys(portfolioData.categoryBreakdown).slice(0, 3),
        scores: {
          overall_readiness: overallReadiness,
          financial: financialStability,
          operational: operationalExcellence,
          market: marketPosition,
          risk: riskManagement
        },
        metrics: portfolioData.metrics,
        currentPerformance: portfolioData.summary
      }

    } catch (error) {
      console.error('Failed to assess expansion readiness:', error)
      return { isReady: false }
    }
  }

  // Utility methods
  private assessCompetitiveAdvantage(competitiveData: any, opportunity: any): string {
    const strengths = []
    
    if (competitiveData.avgBuyBoxRate > 0.7) strengths.push('Strong Buy Box performance')
    if (competitiveData.totalRevenue > 50000) strengths.push('Established revenue base')
    if (opportunity.difficulty <= 5) strengths.push('Low implementation difficulty')
    
    return strengths.join(', ') || 'Opportunity assessment needed'
  }

  private determineUrgencyLevel(timeframe: string, impact: number): 'low' | 'normal' | 'high' | 'critical' {
    if (timeframe === 'immediate' && Math.abs(impact) > 2000) return 'critical'
    if (timeframe === 'immediate' || (timeframe === 'short_term' && Math.abs(impact) > 1000)) return 'high'
    if (timeframe === 'short_term' || timeframe === 'medium_term') return 'normal'
    return 'low'
  }

  private generateImplementationMilestones(optimization: any): string[] {
    const milestones = []
    
    if (optimization.type === 'discontinue') {
      milestones.push('Analyze inventory liquidation options', 'Implement gradual phase-out', 'Reallocate resources')
    } else if (optimization.type === 'scale_up') {
      milestones.push('Increase inventory investment', 'Boost advertising spend', 'Monitor performance metrics')
    } else if (optimization.type === 'reallocate') {
      milestones.push('Identify reallocation targets', 'Implement resource transfer', 'Track impact metrics')
    }
    
    return milestones
  }

  private generateTrendMonitoringMetrics(trend: any): string[] {
    const metrics = [`${trend.category}_trend_indicators`]
    
    if (trend.affected_categories) {
      metrics.push(...trend.affected_categories.map((cat: string) => `${cat}_performance_metrics`))
    }
    
    metrics.push('market_sentiment_analysis', 'competitive_landscape_changes')
    
    return metrics
  }

  private assessTrendRelevance(trend: any, marketExposure: any): number {
    const relevantCategories = trend.affected_categories?.filter((cat: string) =>
      marketExposure.categories.some((sellerCat: any) => 
        sellerCat.name.toLowerCase().includes(cat.toLowerCase())
      )
    ) || []
    
    return relevantCategories.length / (trend.affected_categories?.length || 1)
  }

  private assessExpansionTiming(expansion: any, readiness: any): string {
    if (readiness.overallReadiness >= 8 && expansion.roi_projection >= 2) return 'Excellent timing'
    if (readiness.overallReadiness >= 6 && expansion.roi_projection >= 1.5) return 'Good timing'
    if (readiness.overallReadiness >= 4) return 'Proceed with caution'
    return 'Consider improving readiness first'
  }

  private async cacheStrategicInsights(sellerId: string, recommendations: RecommendationInput[]): Promise<void> {
    try {
      const insights = {
        market_opportunities: recommendations.filter(r => r.type === 'market_opportunity').length,
        competitive_threats: recommendations.filter(r => r.type === 'competitive_threat_response').length,
        portfolio_optimizations: recommendations.filter(r => r.type === 'portfolio_strategy_optimization').length,
        trend_preparations: recommendations.filter(r => r.type === 'long_term_trend_preparation').length,
        expansion_opportunities: recommendations.filter(r => r.type === 'expansion_strategy').length,
        total_strategic_impact: recommendations.reduce((sum, r) => sum + r.predictedImpact, 0),
        analysis_timestamp: new Date().toISOString()
      }

      await this.cacheIntelligence(
        sellerId,
        'strategic_overview',
        insights,
        0.8,
        24 // 24 hours
      )

      console.log(`Cached strategic insights for seller ${sellerId}`)

    } catch (error) {
      console.error('Failed to cache strategic insights:', error)
    }
  }

  // Learning implementation
  async learn(learningData: LearningData): Promise<void> {
    try {
      const { data: recommendation } = await supabaseAdmin
        .from('recommendations')
        .select('recommendation_type, reasoning, predicted_impact')
        .eq('id', learningData.recommendationId)
        .single()

      if (!recommendation) return

      // Strategic learning focuses on long-term accuracy and market prediction
      const recType = recommendation.recommendation_type
      const accuracy = learningData.accuracy

      // Cache learning for strategic intelligence improvement
      await this.cacheIntelligence(
        null, // Global strategic learning
        'strategic_learning',
        {
          agent_type: 'strategic_intelligence',
          recommendation_type: recType,
          accuracy_achieved: accuracy,
          impact_achieved: learningData.actualImpact,
          predicted_impact: recommendation.predicted_impact,
          time_to_impact: learningData.contextFactors?.time_to_impact || 0,
          market_conditions: learningData.contextFactors?.market_conditions || {},
          strategic_context: recommendation.reasoning,
          lessons_learned: learningData.contextFactors?.lessons || []
        },
        accuracy,
        168 // 1 week
      )

      console.log(`Strategic Intelligence Agent learned from ${learningData.recommendationId}: ${recType} accuracy ${accuracy.toFixed(3)}`)

    } catch (error) {
      console.error('Strategic Intelligence learning failed:', error)
    }
  }
}