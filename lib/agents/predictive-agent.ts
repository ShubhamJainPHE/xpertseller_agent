// Note: MCP system removed - this agent needs refactoring to use direct Supabase queries
import { NotificationService } from '../utils/notifications'
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
    // TODO: Replace MCP with direct Supabase queries
    console.warn('PredictiveAgent.predictStockouts: MCP system removed - returning empty results')
    return []
    
    /* Original MCP-based logic - needs refactoring:
    const productsResult = await unifiedMCPSystem.queryDatabase('get_products', {
      seller_id: sellerId,
      limit: 50,
      columns: '*'
    })

    if (!productsResult.success || !productsResult.data.results) return []
    const products = productsResult.data.results

    */ 
    // End of commented MCP-based logic
  }

  /**
   * 🥇 Predict Buy Box loss based on competitor patterns
   */
  private static async predictBuyBoxLoss(sellerId: string): Promise<PredictionModel[]> {
    // TODO: Replace MCP with direct Supabase queries
    console.warn('PredictiveAgent.predictBuyBoxLoss: MCP system removed - returning empty results')
    return []
  }

  /**
   * 🌊 Predict seasonal changes using external data
   */
  private static async predictSeasonalChanges(sellerId: string): Promise<PredictionModel[]> {
    // TODO: Replace MCP with direct Supabase queries
    console.warn('PredictiveAgent.predictSeasonalChanges: MCP system removed - returning empty results')
    return []
  }

  /**
   * ⚔️ Predict competitor threats using market intelligence
   */
  private static async predictCompetitorThreats(sellerId: string): Promise<PredictionModel[]> {
    // TODO: Replace MCP with direct Supabase queries
    console.warn('PredictiveAgent.predictCompetitorThreats: MCP system removed - returning empty results')
    return []
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
    // TODO: Replace MCP with direct Supabase queries
    console.warn('PredictiveAgent.storePredictions: MCP system removed - skipping storage')
    // for (const prediction of predictions) {
    //   // Store predictions using direct Supabase queries
    // }
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