import { supabaseAdmin } from '../database/connection'
import { NotificationService } from '../utils/notifications'
import { ComposioToolSet } from 'composio-core'
import { OpenAI } from 'openai'
import { SecureQueries } from '../database/secure-queries'
import { withErrorHandling, circuitBreakers } from '../utils/error-handling'
import { PerformanceMonitor } from '../utils/monitoring'
import { sanitizeForAI } from '../utils/validation'

interface PredictionModel {
  type: 'stockout' | 'buybox_loss' | 'seasonal_decline' | 'competitor_threat'
  confidence: number
  timeline: string
  impact: number
  preventive_actions: string[]
}

export class PredictiveAgent {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  })
  
  private static toolset = new ComposioToolSet({
    apiKey: process.env.COMPOSIO_API_KEY!
  })

  /**
   * 🔮 Main predictive analysis - thinks 7-30 days ahead
   */
  static async analyzeAndPredict(sellerId: string): Promise<void> {
    const timer = PerformanceMonitor.startTimer('predictive_analysis')
    
    const result = await withErrorHandling(
      async () => {
        console.log(`🔮 Predictive Agent analyzing future risks for seller: ${sellerId}`)
        
        const predictions = await Promise.all([
          this.predictStockouts(sellerId),
          this.predictBuyBoxLoss(sellerId), 
          this.predictSeasonalChanges(sellerId),
          this.predictCompetitorThreats(sellerId),
          this.predictMarketOpportunities(sellerId)
        ])

        const allPredictions = predictions.flat().filter(p => p !== null)
        
        // Sort by urgency (confidence × impact × timeline proximity)
        allPredictions.sort((a, b) => this.calculateUrgencyScore(b) - this.calculateUrgencyScore(a))
        
        // Send predictive insights
        await this.sendPredictiveInsights(sellerId, allPredictions)
        
        // Store predictions for learning
        await this.storePredictions(sellerId, allPredictions)
        
        return allPredictions
      },
      {
        operationName: 'predictive_analysis',
        sellerId,
        retryOptions: { maxRetries: 2, delay: 1000 }
      }
    )
    
    timer()
    
    if (!result) {
      console.warn(`Predictive analysis failed for seller ${sellerId} - continuing with degraded functionality`)
    }
  }

  /**
   * 📦 Predict stockouts 7-21 days before they happen
   */
  private static async predictStockouts(sellerId: string): Promise<PredictionModel[]> {
    const { data: products } = await SecureQueries.getSellerProducts(sellerId, {
      isActive: true,
      includeAnalytics: true,
      limit: 50
    })

    if (!products) return []

    const predictions: PredictionModel[] = []

    for (const product of products) {
      // Get sales velocity trend
      const last30Days = product.sales_data?.filter(s => 
        new Date(s.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ) || []
      
      const last7Days = last30Days.filter(s =>
        new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )

      if (last7Days.length === 0) continue

      const currentVelocity = last7Days.reduce((sum, s) => sum + (s.units_sold || 0), 0) / 7
      const historicalVelocity = last30Days.reduce((sum, s) => sum + (s.units_sold || 0), 0) / 30
      
      // Detect acceleration in sales
      const velocityTrend = currentVelocity / Math.max(historicalVelocity, 0.1)
      const projectedVelocity = currentVelocity * Math.max(velocityTrend, 1)
      
      // Account for advertising impact
      const recentAdSpend = product.advertising_data?.filter(a =>
        new Date(a.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).reduce((sum, a) => sum + (a.spend || 0), 0) || 0
      
      const adImpactMultiplier = recentAdSpend > 0 ? 1.2 : 1.0
      const adjustedVelocity = projectedVelocity * adImpactMultiplier
      
      // Predict stockout date
      const daysUntilStockout = product.stock_level / Math.max(adjustedVelocity, 0.1)
      const leadTime = product.lead_time_days || 14
      
      // Predict problems 7-21 days ahead
      if (daysUntilStockout <= leadTime + 7 && daysUntilStockout > 3) {
        const confidence = Math.min(0.95, 0.6 + (velocityTrend * 0.3))
        const impact = adjustedVelocity * product.current_price * Math.max(0, leadTime - daysUntilStockout + 7)
        
        predictions.push({
          type: 'stockout',
          confidence,
          timeline: `${Math.ceil(daysUntilStockout)} days`,
          impact,
          preventive_actions: [
            `Reorder ${Math.ceil(adjustedVelocity * (leadTime + 14))} units now`,
            'Negotiate faster shipping with supplier',
            'Reduce advertising spend to slow demand',
            'Increase price by 5-10% to reduce velocity'
          ]
        })
      }
    }

    return predictions
  }

  /**
   * 🥇 Predict Buy Box loss based on competitor patterns
   */
  private static async predictBuyBoxLoss(sellerId: string): Promise<PredictionModel[]> {
    // Get products with declining Buy Box performance
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .lt('buy_box_percentage_7d', 0.9) // Less than 90% in last 7 days

    if (!products) return []

    const predictions: PredictionModel[] = []

    for (const product of products) {
      const buyBox7d = product.buy_box_percentage_7d || 0
      const buyBox30d = product.buy_box_percentage_30d || 0
      
      // Calculate trend
      const buyBoxTrend = buyBox7d - buyBox30d
      
      // If declining trend continues, predict full loss
      if (buyBoxTrend < -0.1 && buyBox7d < 0.8) {
        const daysToLoss = Math.max(1, buyBox7d / Math.abs(buyBoxTrend) * 7)
        const confidence = Math.min(0.9, Math.abs(buyBoxTrend) * 5)
        const impact = product.velocity_30d * product.current_price * 0.6 // 60% revenue loss
        
        predictions.push({
          type: 'buybox_loss',
          confidence,
          timeline: `${Math.ceil(daysToLoss)} days`,
          impact,
          preventive_actions: [
            'Monitor competitor prices more closely',
            'Prepare 3-5% price reduction strategy',
            'Improve fulfillment speed if possible',
            'Check inventory levels vs competitors'
          ]
        })
      }
    }

    return predictions
  }

  /**
   * 🌊 Predict seasonal changes using external data
   */
  private static async predictSeasonalChanges(sellerId: string): Promise<PredictionModel[]> {
    try {
      // Get Google Trends data for product categories
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('category, subcategory, velocity_30d, current_price')
        .eq('seller_id', sellerId)
        .eq('is_active', true)

      if (!products) return []

      const categories = [...new Set(products.map(p => p.category))]
      const predictions: PredictionModel[] = []

      for (const category of categories) {
        // Use AI to analyze seasonal patterns
        const seasonalAnalysis = await circuitBreakers.openai.execute(async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{
              role: 'system',
              content: `You are a seasonal trend analyst. Analyze the category "${sanitizeForAI(category)}" for the next 30 days considering current month is ${new Date().toLocaleString('default', { month: 'long' })}.`
            }, {
              role: 'user', 
              content: `What seasonal changes should I expect for "${sanitizeForAI(category)}" products in the next 30 days? Consider:
              1. Upcoming holidays/events
              2. Weather changes
              3. Shopping patterns
              4. Competition levels
              
              Respond with JSON: {"trend": "increasing|decreasing|stable", "confidence": 0.0-1.0, "peak_date": "YYYY-MM-DD", "impact_percentage": -50 to 200}`
            }]
          })
        })

        const analysis = JSON.parse(seasonalAnalysis.choices[0]?.message?.content || '{}')
        
        if (analysis.confidence > 0.6) {
          const categoryProducts = products.filter(p => p.category === category)
          const totalRevenue = categoryProducts.reduce((sum, p) => sum + (p.velocity_30d * p.current_price), 0)
          const impact = totalRevenue * (analysis.impact_percentage / 100)

          predictions.push({
            type: 'seasonal_decline',
            confidence: analysis.confidence,
            timeline: `Peak: ${analysis.peak_date}`,
            impact,
            preventive_actions: [
              analysis.trend === 'increasing' ? 'Increase inventory levels' : 'Prepare inventory liquidation',
              analysis.trend === 'increasing' ? 'Scale advertising spend' : 'Reduce advertising budget',
              'Adjust pricing strategy for seasonal demand',
              'Plan promotional campaigns accordingly'
            ]
          })
        }
      }

      return predictions
    } catch (error) {
      console.error('Seasonal prediction failed:', error)
      return []
    }
  }

  /**
   * ⚔️ Predict competitor threats using market intelligence
   */
  private static async predictCompetitorThreats(sellerId: string): Promise<PredictionModel[]> {
    // This would integrate with competitor monitoring tools
    // For now, we'll use price history patterns
    
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .order('velocity_30d', { ascending: false })
      .limit(20) // Focus on top products

    if (!products) return []

    const predictions: PredictionModel[] = []

    for (const product of products) {
      // Simulate competitor threat analysis
      // In real implementation, this would use web scraping or market data APIs
      
      const priceVolatility = Math.random() * 0.3 // Simulated competitor price volatility
      const marketShare = product.buy_box_percentage_30d || 0.5
      
      if (priceVolatility > 0.15 && marketShare > 0.7) {
        // High-performing product with volatile competitor pricing = threat
        const impact = product.velocity_30d * product.current_price * 0.3
        
        predictions.push({
          type: 'competitor_threat',
          confidence: 0.7,
          timeline: '7-14 days',
          impact,
          preventive_actions: [
            'Set up automated competitor price monitoring',
            'Prepare dynamic pricing response strategy', 
            'Strengthen product differentiation',
            'Build customer loyalty programs'
          ]
        })
      }
    }

    return predictions
  }

  /**
   * 🚀 Predict market opportunities
   */
  private static async predictMarketOpportunities(sellerId: string): Promise<PredictionModel[]> {
    // Analyze market gaps and opportunities
    const predictions: PredictionModel[] = []
    
    // This would integrate with market research APIs
    // For now, simulate opportunity detection
    
    return predictions
  }

  /**
   * 📊 Send predictive insights to seller
   */
  private static async sendPredictiveInsights(
    sellerId: string, 
    predictions: PredictionModel[]
  ): Promise<void> {
    if (predictions.length === 0) return

    const criticalPredictions = predictions.filter(p => p.confidence > 0.8)
    const moderatePredictions = predictions.filter(p => p.confidence >= 0.6 && p.confidence <= 0.8)

    let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal'
    if (criticalPredictions.length > 0) urgency = 'critical'
    else if (moderatePredictions.length > 2) urgency = 'high'

    const message = `
🔮 PREDICTIVE INSIGHTS - Looking Ahead

🚨 Critical Predictions (${criticalPredictions.length}):
${criticalPredictions.map(p => `• ${p.type.toUpperCase()} in ${p.timeline} - ${p.confidence * 100}% confidence`).join('\n')}

⚠️ Moderate Risk Predictions (${moderatePredictions.length}):
${moderatePredictions.map(p => `• ${p.type.toUpperCase()} in ${p.timeline} - ${p.confidence * 100}% confidence`).join('\n')}

💰 Total Potential Impact: $${predictions.reduce((sum, p) => sum + Math.abs(p.impact), 0).toFixed(2)}

🛡️ Preventive Actions Available:
${predictions.slice(0, 3).map(p => `• ${p.preventive_actions[0]}`).join('\n')}

The AI is continuously monitoring and will alert you when action is needed.
    `

    await NotificationService.sendNotification({
      sellerId,
      title: `🔮 ${criticalPredictions.length + moderatePredictions.length} Predictions - Action Needed`,
      message: message.trim(),
      urgency,
      link: `${process.env.APP_URL}/dashboard/predictions`,
      data: {
        predictions,
        analysis_timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * 💾 Store predictions for learning
   */
  private static async storePredictions(
    sellerId: string,
    predictions: PredictionModel[]
  ): Promise<void> {
    for (const prediction of predictions) {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: sellerId,
          event_type: 'prediction.generated',
          event_category: 'intelligence',
          data: {
            prediction_type: prediction.type,
            confidence: prediction.confidence,
            timeline: prediction.timeline,
            predicted_impact: prediction.impact,
            preventive_actions: prediction.preventive_actions,
            created_at: new Date().toISOString()
          },
          importance_score: Math.ceil(prediction.confidence * 10),
          requires_action: prediction.confidence > 0.8,
          processing_status: 'completed',
          processed_by: ['predictive_agent']
        })
    }
  }

  /**
   * Calculate urgency score for prioritization
   */
  private static calculateUrgencyScore(prediction: PredictionModel): number {
    const timelineDays = parseInt(prediction.timeline) || 30
    const proximityScore = Math.max(0, (30 - timelineDays) / 30) // Closer = higher score
    
    return prediction.confidence * Math.abs(prediction.impact) * (1 + proximityScore)
  }
}