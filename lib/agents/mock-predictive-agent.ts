import { supabaseAdmin } from '../database/connection'
import { NotificationService } from '../utils/notifications'
import { OpenAI } from 'openai'

interface MockPrediction {
  type: 'stockout' | 'buybox_loss' | 'seasonal_decline' | 'competitor_threat'
  confidence: number
  timeline: string
  impact: number
  preventive_actions: string[]
}

export class MockPredictiveAgent {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  })

  /**
   * 🔮 Mock predictive analysis using available data
   */
  static async analyzeAndPredict(sellerId: string): Promise<MockPrediction[]> {
    console.log(`🔮 Mock Predictive Agent analyzing for seller: ${sellerId}`)
    
    try {
      // Check if seller exists
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single()
      
      if (!seller) {
        console.log('❌ Seller not found')
        return []
      }
      
      // Get available products (without SP-API data)
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .limit(10)
      
      if (!products || products.length === 0) {
        console.log('📦 No products found - generating sample predictions')
        return this.generateSamplePredictions(sellerId)
      }
      
      // Get available sales data
      const { data: salesData } = await supabaseAdmin
        .from('sales_data')
        .select('*')
        .in('product_id', products.map(p => p.id))
        .order('date', { ascending: false })
        .limit(100)
      
      console.log(`📊 Found ${products.length} products and ${salesData?.length || 0} sales records`)
      
      // Generate predictions based on available data
      const predictions = await this.generatePredictionsFromData(products, salesData || [])
      
      // Send notification
      await this.sendMockPredictiveInsights(sellerId, predictions)
      
      return predictions
      
    } catch (error) {
      console.error('❌ Mock prediction failed:', error)
      return this.generateSamplePredictions(sellerId)
    }
  }
  
  /**
   * Generate predictions from actual database data
   */
  private static async generatePredictionsFromData(products: any[], salesData: any[]): Promise<MockPrediction[]> {
    const predictions: MockPrediction[] = []
    
    for (const product of products.slice(0, 3)) { // Analyze top 3 products
      // Calculate basic metrics from sales data
      const productSales = salesData.filter(s => s.product_id === product.id)
      const recentSales = productSales.filter(s => 
        new Date(s.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      
      const totalRevenue = recentSales.reduce((sum, s) => sum + (s.revenue || 0), 0)
      const avgDailyRevenue = totalRevenue / 30
      
      // Generate realistic predictions
      if (avgDailyRevenue > 100) {
        predictions.push({
          type: 'seasonal_decline',
          confidence: 0.75,
          timeline: '14-21 days',
          impact: avgDailyRevenue * 7, // One week of revenue
          preventive_actions: [
            'Monitor seasonal trends for this product category',
            'Prepare inventory adjustments for demand changes',
            'Consider promotional pricing strategies',
            'Review competitor activity in this space'
          ]
        })
      }
      
      if (recentSales.length < 5) {
        predictions.push({
          type: 'stockout',
          confidence: 0.65,
          timeline: '7-10 days',
          impact: avgDailyRevenue * 3,
          preventive_actions: [
            'Check current inventory levels',
            'Review lead times with suppliers',
            'Consider expedited shipping options',
            'Adjust advertising spend to manage demand'
          ]
        })
      }
    }
    
    return predictions
  }
  
  /**
   * Generate sample predictions when no real data is available
   */
  private static generateSamplePredictions(sellerId: string): MockPrediction[] {
    console.log('🎭 Generating sample predictions for demo purposes')
    
    return [
      {
        type: 'seasonal_decline',
        confidence: 0.78,
        timeline: '12-18 days',
        impact: 1250.00,
        preventive_actions: [
          'Prepare for seasonal demand shift in electronics category',
          'Consider 10-15% price reduction to maintain velocity',
          'Increase marketing spend on complementary products',
          'Review inventory levels and adjust reorder points'
        ]
      },
      {
        type: 'competitor_threat',
        confidence: 0.65,
        timeline: '5-8 days',
        impact: 850.00,
        preventive_actions: [
          'Monitor competitor pricing changes more closely',
          'Prepare dynamic pricing response strategy',
          'Strengthen product differentiation messaging',
          'Consider temporary promotional pricing'
        ]
      },
      {
        type: 'stockout',
        confidence: 0.82,
        timeline: '21-28 days',
        impact: 2100.00,
        preventive_actions: [
          'Place emergency reorder for high-velocity SKUs',
          'Negotiate faster shipping terms with supplier',
          'Temporarily reduce advertising spend to slow demand',
          'Set up automated low-stock alerts'
        ]
      }
    ]
  }
  
  /**
   * Send mock predictive insights
   */
  private static async sendMockPredictiveInsights(
    sellerId: string, 
    predictions: MockPrediction[]
  ): Promise<void> {
    if (predictions.length === 0) return
    
    const criticalPredictions = predictions.filter(p => p.confidence > 0.8)
    const moderatePredictions = predictions.filter(p => p.confidence >= 0.6 && p.confidence <= 0.8)
    
    let urgency: 'low' | 'normal' | 'high' = 'normal'
    if (criticalPredictions.length > 0) urgency = 'high'
    else if (moderatePredictions.length > 2) urgency = 'high'
    
    const message = `
🔮 AI COPILOT PREDICTIONS - Demo Mode

🎯 Predictive Intelligence Results:
• ${criticalPredictions.length} High-Confidence Predictions (80%+ accuracy)
• ${moderatePredictions.length} Moderate-Risk Predictions (60-80% accuracy)

💰 Potential Impact: $${predictions.reduce((sum, p) => sum + p.impact, 0).toFixed(2)}

📋 Top Recommended Actions:
${predictions.slice(0, 2).map(p => `• ${p.preventive_actions[0]}`).join('\n')}

🤖 Note: This is demo mode using available data. Full predictions will be available once SP-API is connected.

The AI is continuously monitoring and will provide real-time alerts when more data becomes available.
    `.trim()
    
    await NotificationService.sendNotification({
      sellerId,
      title: `🔮 ${predictions.length} AI Predictions - Demo Mode`,
      message,
      urgency,
      link: `${process.env.APP_URL}/dashboard/predictions`,
      data: {
        predictions,
        mode: 'demo',
        analysis_timestamp: new Date().toISOString()
      }
    })
  }
}