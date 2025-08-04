import { BaseAgent, AgentConfig, AgentContext, RecommendationInput, LearningData } from './base-agent'
import { supabaseAdmin } from '../database/connection'
import { spApiManager } from '../sp-api/manager'
// import { intelligenceEngine } from '../intelligence/intelligence-engine' // TODO: Create intelligence engine
import { OpenAI } from 'openai'

export class LossPreventionAgent extends BaseAgent {
  private openai: OpenAI
  private learningWeights = {
    stockoutAccuracy: 0.85,
    buyBoxAccuracy: 0.78,
    marginProtectionAccuracy: 0.92
  }

  constructor() {
    super({
      name: 'Loss Prevention',
      version: '2.0.0',
      capabilities: [
        'intelligent_stockout_prediction',
        'dynamic_buy_box_monitoring', 
        'adaptive_margin_protection',
        'supply_chain_intelligence'
      ],
      updateFrequency: 15,
      confidenceThreshold: 0.7,
      maxRecommendationsPerHour: 20
    })
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  async analyze(context: AgentContext): Promise<RecommendationInput[]> {
    const recommendations: RecommendationInput[] = []

    try {
      // Get seller's products with REAL data analysis
      const products = await this.getProductsWithIntelligence(context.sellerId)
      
      if (!products || products.length === 0) {
        return recommendations
      }

      // Process each product with AI-powered analysis
      for (const product of products) {
        try {
          // 1. Intelligent Stockout Prediction
          const stockoutRisk = await this.analyzeStockoutRiskWithAI(product, context)
          if (stockoutRisk && stockoutRisk.confidence >= this.config.confidenceThreshold) {
            recommendations.push(stockoutRisk)
          }

          // 2. Dynamic Buy Box Analysis
          const buyBoxAnalysis = await this.analyzeBuyBoxWithCompetitiveIntel(product, context)
          if (buyBoxAnalysis && buyBoxAnalysis.confidence >= this.config.confidenceThreshold) {
            recommendations.push(buyBoxAnalysis)
          }

          // 3. Margin Protection with Market Context
          const marginAnalysis = await this.analyzeMarginWithMarketIntel(product, context)
          if (marginAnalysis && marginAnalysis.confidence >= this.config.confidenceThreshold) {
            recommendations.push(marginAnalysis)
          }

        } catch (error) {
          console.error(`Error analyzing product ${product.asin}:`, error)
        }
      }

      // Apply cross-product intelligence
      const portfolioInsights = await this.generatePortfolioInsights(products, recommendations)
      recommendations.push(...portfolioInsights)

    } catch (error) {
      console.error('Loss Prevention Agent analysis failed:', error)
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  private async getProductsWithIntelligence(sellerId: string): Promise<any[]> {
    try {
      // Get products with enriched data
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          id, asin, title, marketplace_id, current_price, margin_floor, target_margin,
          stock_level, reserved_quantity, inbound_quantity, velocity_7d, velocity_30d,
          lead_time_days, reorder_point, buy_box_percentage_30d, conversion_rate_30d,
          supplier_info, is_active,
          sales_data!left(date, units_sold, revenue, buy_box_percentage, sessions, page_views),
          competitor_data!left(date, price, buy_box_winner, stock_status)
        `)
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .gte('sales_data.date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('velocity_30d', { ascending: false })
        .limit(50)

      if (error) throw error

      // Enrich with intelligence insights
      const enrichedProducts = await Promise.all((products || []).map(async (product) => {
        // const insights = await intelligenceEngine.query({ // TODO: Implement intelligence engine
        const insights = {
          patterns: [],
          risk_score: 0.5,
          recommendations: []
        }

        return {
          ...product,
          intelligence_insights: insights
        }
      }))

      return enrichedProducts

    } catch (error) {
      console.error('Failed to get products with intelligence:', error)
      return []
    }
  }

  private async analyzeStockoutRiskWithAI(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const availableStock = (product.stock_level || 0) - (product.reserved_quantity || 0)
      const salesHistory = (product.sales_data || []).map((s: any) => s.units_sold || 0)
      
      if (salesHistory.length < 7) return null // Need at least a week of data

      // Use AI to analyze stockout risk with context
      const analysisPrompt = `
Analyze stockout risk for this Amazon product:

Product: ${product.title}
Current Available Stock: ${availableStock} units
Daily Sales History (last ${salesHistory.length} days): ${salesHistory.join(', ')}
Current Velocity (7d avg): ${product.velocity_7d || 0}
Current Velocity (30d avg): ${product.velocity_30d || 0}
Lead Time: ${product.lead_time_days || 14} days
Reorder Point: ${product.reorder_point || 0}

Intelligence Insights: ${JSON.stringify(product.intelligence_insights?.slice(0, 3) || [])}

Consider:
- Seasonal patterns in the data
- Recent trend changes
- Weekend/weekday effects
- Supply chain reliability
- Market demand shifts

Provide risk analysis as JSON:
{
  "riskLevel": "low|medium|high|critical",
  "daysUntilStockout": number,
  "confidence": number (0-1),
  "predictedVelocity": number,
  "reasoning": ["reason1", "reason2", "reason3"],
  "recommendedAction": "specific action to take",
  "urgencyLevel": "low|normal|high|critical",
  "orderQuantity": number
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert inventory analyst. Analyze data patterns and provide accurate stockout predictions.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.1,
        max_tokens: 800
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      // Validate and adjust confidence based on historical accuracy
      const adjustedConfidence = analysis.confidence * (this.learningWeights.stockoutAccuracy || 0.85)
      
      if (analysis.riskLevel === 'low' || adjustedConfidence < 0.6) {
        return null
      }

      // Calculate predicted impact
      const dailyRevenue = (product.velocity_7d || 0) * (product.current_price || 0)
      const predictedLoss = dailyRevenue * Math.min(analysis.daysUntilStockout, 30)

      return {
        type: 'intelligent_stockout_prevention',
        title: `${analysis.riskLevel.toUpperCase()} Stockout Risk: ${product.title}`,
        description: `${analysis.reasoning.join('. ')}. ${analysis.recommendedAction}`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'intelligent_restock',
          current_stock: availableStock,
          predicted_days_until_stockout: analysis.daysUntilStockout,
          predicted_velocity: analysis.predictedVelocity,
          recommended_order_quantity: analysis.orderQuantity,
          urgency_level: analysis.urgencyLevel,
          reasoning: analysis.reasoning,
          supplier_info: product.supplier_info
        },
        predictedImpact: -predictedLoss,
        confidence: adjustedConfidence,
        riskLevel: analysis.riskLevel === 'critical' ? 'high' : 'medium',
        urgency: analysis.urgencyLevel,
        reasoning: {
          ai_analysis: analysis,
          historical_accuracy: this.learningWeights.stockoutAccuracy,
          data_quality: salesHistory.length / 30,
          intelligence_insights: product.intelligence_insights?.slice(0, 2) || []
        },
        supportingData: {
          sales_history: salesHistory,
          current_metrics: {
            available_stock: availableStock,
            velocity_7d: product.velocity_7d,
            velocity_30d: product.velocity_30d
          },
          ai_reasoning: analysis.reasoning
        },
        expiresInHours: analysis.urgencyLevel === 'critical' ? 2 : 12
      }

    } catch (error) {
      console.error('AI stockout analysis failed:', error)
      return null
    }
  }

  private async analyzeBuyBoxWithCompetitiveIntel(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const currentBuyBoxPercentage = product.buy_box_percentage_30d || 0
      
      // Skip if already dominating Buy Box
      if (currentBuyBoxPercentage > 0.8) return null

      // Get competitive intelligence
      const services = spApiManager.getSellerServices(context.sellerId)
      if (!services) return null

      const competitiveAnalysis = await services.pricing.analyzeBuyBoxPosition(
        product.asin,
        product.marketplace_id,
        product.current_price || 0
      )

      if (!competitiveAnalysis.buyBoxPrice) return null

      // Use AI for strategic Buy Box analysis
      const competitorData = (product.competitor_data || []).slice(0, 10)
      
      const analysisPrompt = `
Analyze Buy Box strategy for this Amazon product:

Product: ${product.title}
Current Price: $${product.current_price}
Current Buy Box %: ${(currentBuyBoxPercentage * 100).toFixed(1)}%
Margin Floor: $${product.margin_floor}

Current Buy Box Price: $${competitiveAnalysis.buyBoxPrice}
Competitor Count: ${competitiveAnalysis.competitorCount}
Prime Eligible Competitors: ${competitiveAnalysis.primeEligibleCount}

Recent Competitor Pricing:
${competitorData.map((c: any) => `${c.date}: $${c.price} (Buy Box: ${c.buy_box_winner})`).join('\n')}

Intelligence Insights: ${JSON.stringify(product.intelligence_insights?.slice(0, 2) || [])}

Provide strategic analysis as JSON:
{
  "canCompete": boolean,
  "recommendedPrice": number,
  "strategy": "string explaining the strategy",
  "confidence": number (0-1),
  "expectedBuyBoxRecovery": number (0-1),
  "riskAssessment": "low|medium|high",
  "alternativeStrategies": ["strategy1", "strategy2"],
  "timeToImplement": "immediate|hours|days",
  "expectedImpact": number (daily revenue change)
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert Amazon Buy Box strategist. Analyze competitive positioning and provide actionable strategies.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.2,
        max_tokens: 1000
      })

      const strategy = JSON.parse(response.choices[0].message.content || '{}')
      
      // Adjust confidence based on learning
      const adjustedConfidence = strategy.confidence * (this.learningWeights.buyBoxAccuracy || 0.78)
      
      if (!strategy.canCompete || adjustedConfidence < 0.6) {
        return null
      }

      return {
        type: 'intelligent_buy_box_recovery',
        title: `Buy Box Recovery Strategy: ${product.title}`,
        description: `${strategy.strategy}. Expected recovery: ${(strategy.expectedBuyBoxRecovery * 100).toFixed(0)}%`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'strategic_price_adjustment',
          current_price: product.current_price,
          recommended_price: strategy.recommendedPrice,
          strategy: strategy.strategy,
          time_to_implement: strategy.timeToImplement,
          alternative_strategies: strategy.alternativeStrategies,
          expected_buy_box_recovery: strategy.expectedBuyBoxRecovery
        },
        predictedImpact: strategy.expectedImpact,
        confidence: adjustedConfidence,
        riskLevel: strategy.riskAssessment,
        urgency: strategy.timeToImplement === 'immediate' ? 'high' : 'normal',
        reasoning: {
          competitive_analysis: competitiveAnalysis,
          ai_strategy: strategy,
          buy_box_history: currentBuyBoxPercentage,
          price_competitiveness: (product.current_price || 0) / (competitiveAnalysis.buyBoxPrice || 1)
        },
        supportingData: {
          competitor_pricing: competitorData,
          market_position: competitiveAnalysis,
          strategic_options: strategy.alternativeStrategies
        },
        expiresInHours: strategy.timeToImplement === 'immediate' ? 1 : 6
      }

    } catch (error) {
      console.error('Buy Box intelligence analysis failed:', error)
      return null
    }
  }

  private async analyzeMarginWithMarketIntel(product: any, context: AgentContext): Promise<RecommendationInput | null> {
    try {
      const currentPrice = product.current_price || 0
      const marginFloor = product.margin_floor || 0
      
      if (currentPrice <= marginFloor * 1.1) return null // Already at or near floor

      // Get market intelligence for margin optimization
      // const marketAnalysis = await intelligenceEngine.query({ // TODO: Implement intelligence engine
      const marketAnalysis = {
        price_trends: [],
        competitive_analysis: {},
        recommendations: []
      }

      const analysisPrompt = `
Analyze margin protection strategy for this Amazon product:

Product: ${product.title}
Current Price: $${currentPrice}
Margin Floor: $${marginFloor}
Target Margin: $${product.target_margin || 'not set'}
Current Margin: ${marginFloor > 0 ? (((currentPrice - marginFloor) / currentPrice) * 100).toFixed(1) + '%' : 'unknown'}

Recent Performance:
- Conversion Rate: ${(product.conversion_rate_30d * 100).toFixed(2)}%
- Buy Box %: ${(product.buy_box_percentage_30d * 100).toFixed(1)}%
- Velocity: ${product.velocity_30d} units/month

Market Intelligence: ${JSON.stringify(marketAnalysis)}

Analyze margin protection needs:
{
  "marginRisk": "low|medium|high",
  "canOptimizeMargin": boolean,
  "recommendedPrice": number,
  "marginImprovement": number (percentage points),
  "confidence": number (0-1),
  "strategy": "string explaining approach",
  "tradeoffs": ["tradeoff1", "tradeoff2"],
  "expectedImpact": number (monthly profit change)
}
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert pricing strategist focused on margin optimization while maintaining competitiveness.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.15,
        max_tokens: 800
      })

      const marginStrategy = JSON.parse(response.choices[0].message.content || '{}')
      
      if (!marginStrategy.canOptimizeMargin || marginStrategy.confidence < 0.7) {
        return null
      }

      const adjustedConfidence = marginStrategy.confidence * (this.learningWeights.marginProtectionAccuracy || 0.92)

      return {
        type: 'intelligent_margin_optimization',
        title: `Margin Optimization: ${product.title}`,
        description: `${marginStrategy.strategy}. Expected margin improvement: +${marginStrategy.marginImprovement.toFixed(1)}%`,
        asin: product.asin,
        marketplaceId: product.marketplace_id,
        actionRequired: {
          type: 'margin_optimization',
          current_price: currentPrice,
          recommended_price: marginStrategy.recommendedPrice,
          margin_improvement: marginStrategy.marginImprovement,
          strategy: marginStrategy.strategy,
          tradeoffs: marginStrategy.tradeoffs
        },
        predictedImpact: marginStrategy.expectedImpact,
        confidence: adjustedConfidence,
        riskLevel: 'low',
        urgency: 'normal',
        reasoning: {
          margin_analysis: marginStrategy,
          market_intelligence: marketAnalysis,
          current_performance: {
            conversion_rate: product.conversion_rate_30d,
            buy_box_percentage: product.buy_box_percentage_30d
          }
        },
        supportingData: {
          margin_calculation: {
            current_margin: marginFloor > 0 ? ((currentPrice - marginFloor) / currentPrice) : 0,
            target_margin: marginStrategy.recommendedPrice > 0 ? ((marginStrategy.recommendedPrice - marginFloor) / marginStrategy.recommendedPrice) : 0
          },
          market_insights: marketAnalysis
        },
        expiresInHours: 24
      }

    } catch (error) {
      console.error('Margin intelligence analysis failed:', error)
      return null
    }
  }

  private async generatePortfolioInsights(products: any[], recommendations: RecommendationInput[]): Promise<RecommendationInput[]> {
    const portfolioRecs: RecommendationInput[] = []

    try {
      // Analyze portfolio-level risks
      const criticalStockouts = recommendations.filter(r => 
        r.type === 'intelligent_stockout_prevention' && r.urgency === 'critical'
      ).length

      const buyBoxLosses = products.filter(p => (p.buy_box_percentage_30d || 0) < 0.5).length
      
      if (criticalStockouts >= 3 || buyBoxLosses >= 5) {
        portfolioRecs.push({
          type: 'portfolio_risk_alert',
          title: `Portfolio Risk Alert: ${criticalStockouts} Critical Stockouts, ${buyBoxLosses} Buy Box Issues`,
          description: `Your portfolio has systemic issues requiring immediate attention. Consider supply chain diversification and competitive strategy review.`,
          actionRequired: {
            type: 'portfolio_review',
            critical_stockouts: criticalStockouts,
            buy_box_issues: buyBoxLosses,
            recommended_actions: [
              'Review supplier relationships',
              'Implement emergency inventory protocols',
              'Analyze competitive positioning',
              'Consider pricing strategy adjustment'
            ]
          },
          predictedImpact: -(criticalStockouts * 500 + buyBoxLosses * 200),
          confidence: 0.9,
          riskLevel: 'high',
          urgency: 'high',
          reasoning: {
            portfolio_analysis: {
              total_products: products.length,
              critical_stockouts: criticalStockouts,
              buy_box_issues: buyBoxLosses,
              portfolio_health_score: Math.max(0, 1 - (criticalStockouts + buyBoxLosses) / products.length)
            }
          },
          supportingData: {
            affected_products: recommendations.slice(0, 10)
          },
          expiresInHours: 4
        })
      }

    } catch (error) {
      console.error('Portfolio insights generation failed:', error)
    }

    return portfolioRecs
  }

  // Learning implementation with real feedback
  async learn(learningData: LearningData): Promise<void> {
    try {
      const { data: recommendation } = await supabaseAdmin
        .from('recommendations')
        .select('recommendation_type, reasoning, predicted_impact')
        .eq('id', learningData.recommendationId)
        .single()

      if (!recommendation) return

      // Update learning weights based on accuracy
      const recType = recommendation.recommendation_type
      const accuracy = learningData.accuracy

      if (recType.includes('stockout')) {
        this.learningWeights.stockoutAccuracy = 
          (this.learningWeights.stockoutAccuracy * 0.9) + (accuracy * 0.1)
      } else if (recType.includes('buy_box')) {
        this.learningWeights.buyBoxAccuracy = 
          (this.learningWeights.buyBoxAccuracy * 0.9) + (accuracy * 0.1)
      } else if (recType.includes('margin')) {
        this.learningWeights.marginProtectionAccuracy = 
          (this.learningWeights.marginProtectionAccuracy * 0.9) + (accuracy * 0.1)
      }

      // Cache learning insights
      await this.cacheIntelligence(
        null, // Global learning
        'agent_learning',
        {
          agent_type: 'loss_prevention',
          recommendation_type: recType,
          accuracy_achieved: accuracy,
          impact_achieved: learningData.actualImpact,
          learning_weights: this.learningWeights,
          context_factors: learningData.contextFactors
        },
        accuracy,
        168 // 1 week
      )

      console.log(`Loss Prevention Agent learned: ${recType} accuracy now ${accuracy.toFixed(3)}`)

    } catch (error) {
      console.error('Loss Prevention learning failed:', error)
    }
  }
}