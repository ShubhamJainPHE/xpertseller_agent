import { BaseAgent, AgentConfig, AgentContext, RecommendationInput, LearningData } from './base-agent'
import { supabaseAdmin } from '../database/connection'
import { spApiManager } from '../sp-api/manager'
// import { intelligenceEngine } from '../intelligence/intelligence-engine' // TODO: Create intelligence engine
import { OpenAI } from 'openai'

export class RevenueOptimizationAgent extends BaseAgent {
  private openai: OpenAI
  private learningWeights = {
    pricingAccuracy: 0.82,
    listingOptimizationAccuracy: 0.75,
    keywordAccuracy: 0.88,
    conversionAccuracy: 0.79
  }

  constructor() {
    super({
      name: 'Revenue Optimization',
      version: '2.0.0',
      capabilities: [
        'ai_powered_pricing',
        'intelligent_listing_optimization',
        'advanced_keyword_analysis',
        'conversion_rate_optimization'
      ],
      updateFrequency: 30,
      confidenceThreshold: 0.65,
      maxRecommendationsPerHour: 15
    })
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async analyze(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      const products = await this.getProductsWithMarketData(context.sellerId)
      
      if (!products || products.length === 0) {
        return recommendations
      }

      for (const product of products.slice(0, 20)) { // Top 20 by revenue
        try {
          // 1. AI-Powered Dynamic Pricing
          const pricingRec = await this.analyzeOptimalPricing(product, context)
          if (pricingRec && pricingRec.confidence >= this.config.confidenceThreshold) {
            recommendations.push(pricingRec)
          }

          // 2. Listing Performance AI Analysis
          const listingRec = await this.analyzeListingOptimization(product, context)
          if (listingRec && listingRec.confidence >= this.config.confidenceThreshold) {
            recommendations.push(listingRec)
          }

          // 3. Advanced Keyword Intelligence
          const keywordRec = await this.analyzeKeywordOpportunities(product, context)
          if (keywordRec && keywordRec.confidence >= this.config.confidenceThreshold) {
            recommendations.push(keywordRec)
          }

          // 4. Conversion Rate Optimization
          const conversionRec = await this.analyzeConversionOptimization(product, context)
          if (conversionRec && conversionRec.confidence >= this.config.confidenceThreshold) {
            recommendations.push(conversionRec)
          }

        } catch (error) {
          console.error(`Error analyzing product ${product.asin}:`, error)
        }
      }

      // Portfolio-level revenue optimizations
      const portfolioRecs = await this.analyzePortfolioRevenue(products, recommendations)
      recommendations.push(...portfolioRecs)

    } catch (error) {
      console.error('Revenue Optimization Agent analysis failed:', error)
    }

    return recommendations.sort((a, b) => b.predictedImpact - a.predictedImpact)
  }

  private async getProductsWithMarketData(sellerId: string): Promise<any[]> {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          id, asin, title, marketplace_id, current_price, margin_floor, target_margin,
          velocity_7d, velocity_30d, conversion_rate_30d, session_percentage_30d,
          buy_box_percentage_30d, category, subcategory,
          sales_data!left(date, units_sold, revenue, conversion_rate, sessions, page_views),
          advertising_data!left(date, impressions, clicks, spend, sales, acos),
          keyword_rankings!left(keyword, rank_position, search_volume, date),
          competitor_data!left(date, price, buy_box_winner, rating, review_count)
        `)
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .gte('sales_data.date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('revenue', { ascending: false })

      if (error) throw error

      // Enrich with market intelligence
      return await Promise.all((products || []).map(async (product) => {
        // const marketIntel = await intelligenceEngine.query({ // TODO: Implement intelligence engine
        const marketIntel = {
          price_correlation: 0.7,
          competitive_advantage: 'medium',
          market_trends: []
        }

        return {
          ...product,
          market_intelligence: marketIntel,
          revenue_30d: (product.sales_data || []).reduce((sum: number, s: any) => sum + (s.revenue || 0), 0)
        }
      }))

    } catch (error) {
      console.error('Failed to get products with market data:', error)
      return []
    }
  }

  private async analyzeOptimalPricing(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      // Skip if recent pricing change
      const recentPriceChange = await this.hasRecentPriceChange(product.id)
      if (recentPriceChange) return null

      // Get competitive landscape
      const competitorPrices = (product.competitor_data || [])
        .slice(0, 10)
        .map((c: any) => c.price)
        .filter((p: number) => p > 0)

      if (competitorPrices.length < 2) return null

      // Prepare pricing analysis prompt
      const salesHistory = (product.sales_data || []).map((s: any) => ({
        date: s.date,
        units: s.units_sold || 0,
        revenue: s.revenue || 0,
        sessions: s.sessions || 0
      }))

      const adData = (product.advertising_data || []).slice(0, 14)

      const pricingPrompt = `
Analyze optimal pricing strategy for this Amazon product:

Product: ${product.title}
Category: ${product.category}
Current Price: $${product.current_price}
Margin Floor: $${product.margin_floor}
Current Buy Box %: ${(product.buy_box_percentage_30d * 100).toFixed(1)}%
Conversion Rate: ${(product.conversion_rate_30d * 100).toFixed(2)}%

Competitor Prices: ${competitorPrices.map((p: number) => `$${p}`).join(', ')}
Average Competitor Price: $${(competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length).toFixed(2)}

Sales Performance (last 30 days):
${salesHistory.slice(-14).map((s: any) => `${s.date}: ${s.units} units, $${s.revenue}, ${s.sessions} sessions`).join('\n')}

Advertising Performance (last 14 days):
${adData.map((a: any) => `${a.date}: ${a.impressions} imp, ${a.clicks} clicks, $${a.spend} spend, ACOS: ${(a.acos * 100).toFixed(1)}%`).join('\n')}

Market Intelligence: ${JSON.stringify(product.market_intelligence?.slice(0, 2) || [])}

Calculate optimal price considering:
- Price elasticity of demand
- Competitive positioning
- Margin requirements
- Market trends
- Seasonal factors

Respond with JSON:
{
  "recommendedPrice": number,
  "priceChangePercentage": number,
  "strategy": "string explaining strategy",
  "confidence": number (0-1),
  "expectedImpactDaily": number,
  "expectedImpactMonthly": number,
  "riskAssessment": "low|medium|high",
  "competitiveAdvantage": "string",
  "reasoning": ["reason1", "reason2", "reason3"],
  "implementationTiming": "immediate|gradual|scheduled"
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon pricing strategist with deep knowledge of market dynamics, price elasticity, and competitive positioning.'
        }, {
          role: 'user',
          content: pricingPrompt
        }],
        temperature: 0.1,
        max_tokens: 1200
      })

      const pricingStrategy = JSON.parse(response.choices[0].message.content || '{}')
      
      // Validate recommendations
      if (pricingStrategy.recommendedPrice < product.margin_floor || 
          Math.abs(pricingStrategy.priceChangePercentage) < 2) {
        return null
      }

      // Adjust confidence based on learning
      const adjustedConfidence = pricingStrategy.confidence * (this.learningWeights.pricingAccuracy || 0.82)

      return {
        type: 'ai_pricing_optimization',
        title: `Smart Pricing: ${product.title}`,
        description: `${pricingStrategy.strategy}. Expected monthly impact: ${pricingStrategy.expectedImpactMonthly > 0 ? '+' : ''}$${pricingStrategy.expectedImpactMonthly.toFixed(0)}`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'intelligent_price_change',
          current_price: product.current_price,
          recommended_price: pricingStrategy.recommendedPrice,
          price_change_percentage: pricingStrategy.priceChangePercentage,
          strategy: pricingStrategy.strategy,
          implementation_timing: pricingStrategy.implementationTiming,
          competitive_advantage: pricingStrategy.competitiveAdvantage,
          risk_mitigation: pricingStrategy.riskAssessment
        },
        predictedImpact: pricingStrategy.expectedImpactMonthly,
        confidence: adjustedConfidence,
        riskLevel: pricingStrategy.riskAssessment,
        urgency: pricingStrategy.implementationTiming === 'immediate' ? 'high' : 'normal',
        reasoning: {
          ai_analysis: pricingStrategy,
          competitive_landscape: {
            competitor_count: competitorPrices.length,
            price_position: product.current_price / (competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length),
            buy_box_share: product.buy_box_percentage_30d
          },
          performance_metrics: {
            conversion_rate: product.conversion_rate_30d,
            revenue_30d: product.revenue_30d,
            velocity: product.velocity_30d
          }
        },
        supportingData: {
          pricing_analysis: pricingStrategy,
          market_data: product.market_intelligence?.slice(0, 3),
          competitive_prices: competitorPrices,
          sales_performance: salesHistory.slice(-14)
        },
        expiresInHours: pricingStrategy.implementationTiming === 'immediate' ? 4 : 24
      }

    } catch (error) {
      console.error('AI pricing analysis failed:', error)
      return null
    }
  }

  private async analyzeListingOptimization(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const conversionRate = product.conversion_rate_30d || 0
      const sessionPercentage = product.session_percentage_30d || 0
      
      // Skip if performance is already excellent
      if (conversionRate > 0.15 && sessionPercentage > 0.3) return null

      // Get category benchmarks
      const categoryBenchmarks = await this.getCategoryBenchmarks(product.category)
      
      const salesData = (product.sales_data || []).slice(-30)
      const conversionTrend = this.calculateTrend(salesData.map((s: any) => s.conversion_rate || 0))

      const listingPrompt = `
Analyze listing optimization opportunities for this Amazon product:

Product: ${product.title}
Category: ${product.category}
Current Conversion Rate: ${(conversionRate * 100).toFixed(2)}%
Current Session Percentage: ${(sessionPercentage * 100).toFixed(1)}%

Category Benchmarks:
- Average Conversion Rate: ${(categoryBenchmarks.avgConversionRate * 100).toFixed(2)}%
- Average Session Percentage: ${(categoryBenchmarks.avgSessionPercentage * 100).toFixed(1)}%

Recent Performance Trend:
- Conversion Trend: ${conversionTrend.direction} ${(conversionTrend.magnitude * 100).toFixed(1)}%
- Recent Sessions: ${salesData.slice(-7).reduce((sum: number, s: any) => sum + (s.sessions || 0), 0)}
- Recent Page Views: ${salesData.slice(-7).reduce((sum: number, s: any) => sum + (s.page_views || 0), 0)}

Current Keywords Ranking:
${(product.keyword_rankings || []).slice(0, 10).map((k: any) => `"${k.keyword}": Rank ${k.rank_position}, Volume: ${k.search_volume}`).join('\n')}

Market Intelligence: ${JSON.stringify(product.market_intelligence?.filter((i: any) => i.type === 'listing_optimization') || [])}

Identify specific listing optimization opportunities:
{
  "optimizationAreas": [
    {
      "area": "title|bullets|description|images|keywords",
      "currentIssue": "string",
      "recommendation": "string",
      "expectedImpact": number (conversion rate improvement),
      "priority": "high|medium|low"
    }
  ],
  "overallStrategy": "string",
  "expectedConversionImprovement": number (percentage points),
  "expectedTrafficImprovement": number (session percentage points),
  "confidence": number (0-1),
  "timeToImplement": "immediate|days|weeks",
  "estimatedMonthlyRevenue": number
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon listing optimization specialist with deep knowledge of conversion factors, SEO, and customer psychology.'
        }, {
          role: 'user',
          content: listingPrompt
        }],
        temperature: 0.2,
        max_tokens: 1500
      })

      const optimization = JSON.parse(response.choices[0].message.content || '{}')
      
      if (!optimization.optimizationAreas || optimization.optimizationAreas.length === 0) {
        return null
      }

      const adjustedConfidence = optimization.confidence * (this.learningWeights.listingOptimizationAccuracy || 0.75)

      return {
        type: 'intelligent_listing_optimization',
        title: `Listing Optimization: ${product.title}`,
        description: `${optimization.overallStrategy}. Expected conversion improvement: +${optimization.expectedConversionImprovement.toFixed(1)}%`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'listing_optimization',
          optimization_areas: optimization.optimizationAreas,
          strategy: optimization.overallStrategy,
          priority_actions: optimization.optimizationAreas.filter((o: any) => o.priority === 'high'),
          implementation_timeline: optimization.timeToImplement,
          success_metrics: {
            target_conversion_rate: conversionRate + (optimization.expectedConversionImprovement / 100),
            target_session_percentage: sessionPercentage + (optimization.expectedTrafficImprovement / 100)
          }
        },
        predictedImpact: optimization.estimatedMonthlyRevenue,
        confidence: adjustedConfidence,
        riskLevel: 'low',
        urgency: optimization.timeToImplement === 'immediate' ? 'high' : 'normal',
        reasoning: {
          performance_gap_analysis: {
            conversion_gap: categoryBenchmarks.avgConversionRate - conversionRate,
            traffic_gap: categoryBenchmarks.avgSessionPercentage - sessionPercentage,
            trend_direction: conversionTrend.direction
          },
          optimization_analysis: optimization,
          category_benchmarks: categoryBenchmarks
        },
        supportingData: {
          current_metrics: {
            conversion_rate: conversionRate,
            session_percentage: sessionPercentage,
            recent_performance: salesData.slice(-14)
          },
          keyword_performance: product.keyword_rankings?.slice(0, 10),
          optimization_plan: optimization.optimizationAreas
        },
        expiresInHours: 72
      }

    } catch (error) {
      console.error('Listing optimization analysis failed:', error)
      return null
    }
  }

  private async analyzeKeywordOpportunities(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const currentKeywords = (product.keyword_rankings || []).map((k: any) => k.keyword)
      const adData = (product.advertising_data || []).slice(-30)
      
      if (currentKeywords.length === 0) return null

      const keywordPrompt = `
Analyze keyword opportunities for this Amazon product:

Product: ${product.title}
Category: ${product.category}
Current Price: $${product.current_price}

Current Keyword Rankings:
${currentKeywords.slice(0, 15).map((k: string, i: number) => {
  const ranking = product.keyword_rankings[i]
  return `"${k}": Rank ${ranking?.rank_position || 'unranked'}, Volume: ${ranking?.search_volume || 'unknown'}`
}).join('\n')}

Recent Advertising Performance:
${adData.slice(-14).map((a: any) => `${a.date}: ${a.impressions} impressions, ${a.clicks} clicks, ACOS: ${(a.acos * 100).toFixed(1)}%, Sales: $${a.sales}`).join('\n')}

Search Volume Trends: ${JSON.stringify(product.market_intelligence?.filter((i: any) => i.domain === 'advertising')?.slice(0, 2) || [])}

Find high-value keyword opportunities:
{
  "newKeywordOpportunities": [
    {
      "keyword": "string",
      "estimatedSearchVolume": number,
      "competitionLevel": "low|medium|high",
      "relevanceScore": number (0-10),
      "expectedCTR": number (0-1),
      "suggestedBid": number,
      "expectedROI": number,
      "priority": "high|medium|low"
    }
  ],
  "keywordOptimizations": [
    {
      "currentKeyword": "string",
      "issue": "string",
      "recommendation": "string",
      "expectedImprovement": "string"
    }
  ],
  "overallStrategy": "string",
  "expectedTrafficIncrease": number (weekly clicks),
  "expectedRevenueIncrease": number (monthly),
  "confidence": number (0-1),
  "budgetRecommendation": number
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon PPC and SEO keyword strategist with deep knowledge of search behavior and conversion optimization.'
        }, {
          role: 'user',
          content: keywordPrompt
        }],
        temperature: 0.3,
        max_tokens: 1800
      })

      const keywordAnalysis = JSON.parse(response.choices[0].message.content || '{}')
      
      if (!keywordAnalysis.newKeywordOpportunities || keywordAnalysis.newKeywordOpportunities.length === 0) {
        return null
      }

      const adjustedConfidence = keywordAnalysis.confidence * (this.learningWeights.keywordAccuracy || 0.88)

      return {
        type: 'advanced_keyword_optimization',
        title: `Keyword Opportunities: ${product.title}`,
        description: `${keywordAnalysis.overallStrategy}. Expected traffic increase: +${keywordAnalysis.expectedTrafficIncrease} weekly clicks`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'keyword_campaign_optimization',
          new_keywords: keywordAnalysis.newKeywordOpportunities.filter((k: any) => k.priority === 'high').slice(0, 10),
          keyword_optimizations: keywordAnalysis.keywordOptimizations,
          strategy: keywordAnalysis.overallStrategy,
          budget_recommendation: keywordAnalysis.budgetRecommendation,
          implementation_phases: [
            {
              phase: 1,
              keywords: keywordAnalysis.newKeywordOpportunities.filter((k: any) => k.priority === 'high'),
              timeline: 'immediate'
            },
            {
              phase: 2,
              keywords: keywordAnalysis.newKeywordOpportunities.filter((k: any) => k.priority === 'medium'),
              timeline: 'week_2'
            }
          ]
        },
        predictedImpact: keywordAnalysis.expectedRevenueIncrease,
        confidence: adjustedConfidence,
        riskLevel: 'low',
        urgency: 'normal',
        reasoning: {
          keyword_gap_analysis: {
            current_keyword_count: currentKeywords.length,
            high_opportunity_keywords: keywordAnalysis.newKeywordOpportunities.filter((k: any) => k.priority === 'high').length,
            avg_competition_level: keywordAnalysis.newKeywordOpportunities.reduce((sum: number, k: any) => 
              sum + (k.competitionLevel === 'low' ? 1 : k.competitionLevel === 'medium' ? 2 : 3), 0) / keywordAnalysis.newKeywordOpportunities.length
          },
          performance_projections: {
            expected_traffic_increase: keywordAnalysis.expectedTrafficIncrease,
            expected_revenue_increase: keywordAnalysis.expectedRevenueIncrease,
            suggested_budget: keywordAnalysis.budgetRecommendation
          }
        },
        supportingData: {
          current_keyword_performance: product.keyword_rankings?.slice(0, 15),
          advertising_history: adData.slice(-14),
          opportunity_keywords: keywordAnalysis.newKeywordOpportunities
        },
        expiresInHours: 168 // 1 week
      }

    } catch (error) {
      console.error('Keyword analysis failed:', error)
      return null
    }
  }

  private async analyzeConversionOptimization(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const salesData = (product.sales_data || []).slice(-30)
      if (salesData.length < 14) return null

      const recentConversionRate = product.conversion_rate_30d || 0
      const conversionTrend = this.calculateTrend(salesData.map((s: any) => s.conversion_rate || 0))
      
      // Skip if conversion rate is stable and good
      if (recentConversionRate > 0.12 && conversionTrend.direction !== 'down') return null

      const conversionPrompt = `
Analyze conversion rate optimization for this Amazon product:

Product: ${product.title}
Current Conversion Rate: ${(recentConversionRate * 100).toFixed(2)}%
Conversion Trend: ${conversionTrend.direction} ${(conversionTrend.magnitude * 100).toFixed(1)}%

Recent Performance Data:
${salesData.slice(-14).map((s: any) => `${s.date}: ${s.units} units, ${s.sessions} sessions, ${((s.units / s.sessions) * 100).toFixed(2)}% CVR`).join('\n')}

Traffic Quality:
- Session Percentage: ${(product.session_percentage_30d * 100).toFixed(1)}%
- Buy Box Percentage: ${(product.buy_box_percentage_30d * 100).toFixed(1)}%

Competitive Context:
${(product.competitor_data || []).slice(0, 5).map((c: any) => `Competitor: $${c.price}, Rating: ${c.rating}, Reviews: ${c.review_count}`).join('\n')}

Identify conversion optimization opportunities:
{
  "conversionIssues": [
    {
      "issue": "string describing the issue",
      "impact": "high|medium|low",
      "recommendation": "specific action to take",
      "expectedImprovement": number (percentage points)
    }
  ],
  "optimizationStrategy": "string",
  "expectedConversionIncrease": number (percentage points),
  "expectedRevenueIncrease": number (monthly),
  "confidence": number (0-1),
  "implementationComplexity": "simple|moderate|complex",
  "timeframe": "immediate|days|weeks",
  "successMetrics": ["metric1", "metric2"]
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon conversion rate optimization specialist with deep knowledge of customer behavior, psychology, and e-commerce best practices.'
        }, {
          role: 'user',
          content: conversionPrompt
        }],
        temperature: 0.2,
        max_tokens: 1200
      })

      const conversionAnalysis = JSON.parse(response.choices[0].message.content || '{}')
      
      if (!conversionAnalysis.conversionIssues || conversionAnalysis.expectedConversionIncrease < 0.5) {
        return null
      }

      const adjustedConfidence = conversionAnalysis.confidence * (this.learningWeights.conversionAccuracy || 0.79)

      return {
        type: 'conversion_rate_optimization',
        title: `Conversion Optimization: ${product.title}`,
        description: `${conversionAnalysis.optimizationStrategy}. Expected conversion increase: +${conversionAnalysis.expectedConversionIncrease.toFixed(1)}%`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'conversion_optimization',
          issues: conversionAnalysis.conversionIssues,
          strategy: conversionAnalysis.optimizationStrategy,
          priority_fixes: conversionAnalysis.conversionIssues.filter((i: any) => i.impact === 'high'),
          implementation_complexity: conversionAnalysis.implementationComplexity,
          timeframe: conversionAnalysis.timeframe,
          success_metrics: conversionAnalysis.successMetrics,
          target_conversion_rate: recentConversionRate + (conversionAnalysis.expectedConversionIncrease / 100)
        },
        predictedImpact: conversionAnalysis.expectedRevenueIncrease,
        confidence: adjustedConfidence,
        riskLevel: 'low',
        urgency: conversionTrend.direction === 'down' && conversionTrend.magnitude > 0.1 ? 'high' : 'normal',
        reasoning: {
          conversion_analysis: {
            current_rate: recentConversionRate,
            trend: conversionTrend,
            benchmark_gap: 0.12 - recentConversionRate,
            issues_identified: conversionAnalysis.conversionIssues.length
          },
          optimization_potential: conversionAnalysis,
          traffic_quality: {
            session_percentage: product.session_percentage_30d,
            buy_box_percentage: product.buy_box_percentage_30d
          }
        },
        supportingData: {
          performance_history: salesData.slice(-14),
          conversion_issues: conversionAnalysis.conversionIssues,
          competitive_context: product.competitor_data?.slice(0, 5)
        },
        expiresInHours: 48
      }

    } catch (error) {
      console.error('Conversion optimization analysis failed:', error)
      return null
    }
  }

  private async analyzePortfolioRevenue(products: any[], recommendations: RecommendationInput[]): Promise<RecommendationInput[]> {
    const portfolioRecs: RecommendationInput[] = []

    try {
      const totalRevenue = products.reduce((sum, p) => sum + (p.revenue_30d || 0), 0)
      const topPerformers = products.filter(p => (p.revenue_30d || 0) > totalRevenue * 0.1).length
      const underperformers = products.filter(p => (p.revenue_30d || 0) < totalRevenue * 0.01).length

      // Resource reallocation opportunity
      if (topPerformers >= 3 && underperformers >= 5) {
        const pricingOpportunities = recommendations.filter(r => r.type === 'ai_pricing_optimization').length
        const totalPotentialImpact = recommendations.reduce((sum, r) => sum + (r.predictedImpact || 0), 0)

        portfolioRecs.push({
          type: 'portfolio_revenue_optimization',
          title: `Portfolio Revenue Strategy: ${pricingOpportunities} Pricing Opportunities`,
          description: `Focus resources on ${topPerformers} top performers. Total optimization potential: $${totalPotentialImpact.toFixed(0)}/month`,
          actionRequired: {
            type: 'portfolio_rebalancing',
            top_performers: topPerformers,
            underperformers: underperformers,
            optimization_opportunities: pricingOpportunities,
            recommended_actions: [
              'Increase ad spend on top performers',
              'Optimize pricing on underperformers',
              'Consider discontinuing worst performers',
              'Focus inventory investment on winners'
            ],
            expected_roi_improvement: totalPotentialImpact / totalRevenue
          },
          predictedImpact: totalPotentialImpact * 0.8, // Conservative estimate
          confidence: 0.85,
          riskLevel: 'medium',
          urgency: 'normal',
          reasoning: {
            portfolio_analysis: {
              total_products: products.length,
              top_performers: topPerformers,
              underperformers: underperformers,
              revenue_concentration: (products.slice(0, 5).reduce((sum, p) => sum + (p.revenue_30d || 0), 0) / totalRevenue)
            }
          },
          supportingData: {
            revenue_distribution: products.slice(0, 10).map(p => ({
              asin: p.asin,
              title: p.title,
              revenue_30d: p.revenue_30d
            }))
          },
          expiresInHours: 168
        })
      }

    } catch (error) {
      console.error('Portfolio revenue analysis failed:', error)
    }

    return portfolioRecs
  }

  // Learning implementation
  async learn(learningData: LearningData): Promise<void> {
    try {
      const { data: recommendation } = await supabaseAdmin
        .from('recommendations')
        .select('recommendation_type, predicted_impact')
        .eq('id', learningData.recommendationId)
        .single()

      if (!recommendation) return

      const recType = recommendation.recommendation_type
      const accuracy = learningData.accuracy

      // Update learning weights based on outcomes
      if (recType.includes('pricing')) {
        this.learningWeights.pricingAccuracy = 
          (this.learningWeights.pricingAccuracy * 0.9) + (accuracy * 0.1)
      } else if (recType.includes('listing')) {
        this.learningWeights.listingOptimizationAccuracy = 
          (this.learningWeights.listingOptimizationAccuracy * 0.9) + (accuracy * 0.1)
      } else if (recType.includes('keyword')) {
        this.learningWeights.keywordAccuracy = 
          (this.learningWeights.keywordAccuracy * 0.9) + (accuracy * 0.1)
      } else if (recType.includes('conversion')) {
        this.learningWeights.conversionAccuracy = 
          (this.learningWeights.conversionAccuracy * 0.9) + (accuracy * 0.1)
      }

      // Cache learning insights
      await this.cacheIntelligence(
        null,
        'revenue_learning',
        {
          agent_type: 'revenue_optimization',
          recommendation_type: recType,
          accuracy_achieved: accuracy,
          impact_achieved: learningData.actualImpact,
          predicted_impact: recommendation.predicted_impact,
          learning_weights: this.learningWeights
        },
        accuracy,
        168
      )

      console.log(`Revenue Optimization Agent learned: ${recType} accuracy now ${accuracy.toFixed(3)}`)

    } catch (error) {
      console.error('Revenue optimization learning failed:', error)
    }
  }

  // Helper methods
  private async hasRecentPriceChange(productId: string): Promise<boolean> {
    try {
      const { data: recentRecs } = await supabaseAdmin
        .from('recommendations')
        .select('created_at')
        .contains('action_required', { type: 'price_change' })
        .eq('asin', productId)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .limit(1)

      return (recentRecs?.length || 0) > 0
    } catch (error) {
      return false
    }
  }

  private async getCategoryBenchmarks(category: string): Promise<any> {
    // In production, this would query actual category benchmarks
    return {
      avgConversionRate: 0.12,
      avgSessionPercentage: 0.25
    }
  }

  protected calculateTrend(values: number[], periods = 7): { direction: 'up' | 'down' | 'stable', magnitude: number, confidence: number } {
    if (values.length < periods) return { direction: 'stable', magnitude: 0, confidence: 0 }

    const recent = values.slice(-periods)
    const previous = values.slice(-periods * 2, -periods)

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const previousAvg = previous.length > 0 ? previous.reduce((sum, val) => sum + val, 0) / previous.length : recentAvg

    if (previousAvg === 0) return { direction: 'stable', magnitude: 0, confidence: 0 }

    const change = (recentAvg - previousAvg) / previousAvg
    const magnitude = Math.abs(change)
    const confidence = Math.min(1.0, values.length / periods)

    return {
      direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      magnitude,
      confidence
    }
  }
}