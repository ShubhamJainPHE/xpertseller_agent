import { supabaseAdmin } from '../database/connection'
import { NotificationService } from '../utils/notifications'
import { OpenAI } from 'openai'

interface LearningModel {
  seller_id: string
  patterns: {
    approval_preferences: Record<string, number>
    timing_patterns: Record<string, number>
    risk_tolerance: number
    success_factors: string[]
  }
  accuracy_metrics: {
    prediction_accuracy: number
    recommendation_success_rate: number
    false_positive_rate: number
  }
  last_updated: string
}

export class LearningAgent {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  /**
   * 🧠 Main learning cycle - analyzes outcomes and improves predictions
   */
  static async learnFromOutcomes(sellerId: string): Promise<void> {
    console.log(`🧠 Learning Agent analyzing outcomes for seller: ${sellerId}`)
    
    try {
      const outcomes = await this.gatherOutcomes(sellerId)
      const learnings = await this.analyzeLearnings(sellerId, outcomes)
      const updatedModel = await this.updateLearningModel(sellerId, learnings)
      
      // Apply learnings to improve future predictions
      await this.applyLearnings(sellerId, updatedModel)
      
      // Send learning insights to seller
      await this.sendLearningInsights(sellerId, learnings)
      
    } catch (error) {
      console.error('Learning cycle failed:', error)
    }
  }

  /**
   * 📊 Gather outcomes from past recommendations and predictions
   */
  private static async gatherOutcomes(sellerId: string): Promise<{recommendations: any[], predictions: any[], outcomes: any[]}> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    // Get recommendations from last 30 days with their outcomes
    const { data: recommendations } = await supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('seller_id', sellerId)
      .gte('created_at', thirtyDaysAgo)
    
    // Get predictions from last 30 days
    const { data: predictions } = await supabaseAdmin
      .from('fact_stream')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('event_type', 'prediction.generated')
      .gte('created_at', thirtyDaysAgo)
    
    // Get actual outcomes (sales data, inventory changes, etc.)
    const { data: outcomes } = await supabaseAdmin
      .from('sales_data')
      .select('*')
      .gte('date', thirtyDaysAgo.split('T')[0])
    
    return { recommendations: recommendations || [], predictions: predictions || [], outcomes: outcomes || [] }
  }

  /**
   * 🔍 Analyze learnings using AI
   */
  private static async analyzeLearnings(sellerId: string, outcomes: any): Promise<any> {
    const analysisPrompt = `
Analyze the following seller's behavior and outcomes over the last 30 days:

RECOMMENDATIONS MADE: ${outcomes.recommendations.length}
PREDICTIONS MADE: ${outcomes.predictions.length}
ACTUAL OUTCOMES: ${outcomes.outcomes.length}

Seller Behavior Patterns:
${outcomes.recommendations.map((r: any) => `
- ${r.recommendation_type}: ${r.status} (confidence: ${r.confidence_score})
- Response time: ${r.updated_at ? new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() : 'no response'}
- Impact: $${r.predicted_impact}
`).join('\n')}

Analyze and return JSON with:
{
  "approval_patterns": {
    "high_confidence_approval_rate": 0.0-1.0,
    "preferred_recommendation_types": ["type1", "type2"],
    "avoided_recommendation_types": ["type3"],
    "average_response_time_hours": number,
    "risk_tolerance_score": 0.0-1.0
  },
  "prediction_accuracy": {
    "stockout_predictions": {"made": number, "accurate": number},
    "price_predictions": {"made": number, "accurate": number},
    "revenue_predictions": {"made": number, "accurate": number}
  },
  "success_factors": [
    "what makes recommendations successful for this seller"
  ],
  "improvement_areas": [
    "what to improve in future recommendations"
  ],
  "learned_preferences": {
    "optimal_notification_time": "HH:MM",
    "preferred_communication_style": "brief|detailed|data-heavy",
    "urgency_threshold": 0.0-1.0
  }
}
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI learning analyst. Analyze seller behavior patterns and provide insights for improving future recommendations.' },
          { role: 'user', content: analysisPrompt }
        ]
      })

      return JSON.parse(response.choices[0]?.message?.content || '{}')
    } catch (error) {
      console.error('AI analysis failed:', error)
      return {}
    }
  }

  /**
   * 💾 Update learning model in database
   */
  private static async updateLearningModel(sellerId: string, learnings: any): Promise<LearningModel> {
    // Get existing model or create new one
    const { data: existingModel } = await supabaseAdmin
      .from('seller_learning_models')
      .select('*')
      .eq('seller_id', sellerId)
      .single()

    const updatedModel: LearningModel = {
      seller_id: sellerId,
      patterns: {
        approval_preferences: learnings.approval_patterns || {},
        timing_patterns: {
          optimal_notification_hour: this.parseTime(learnings.learned_preferences?.optimal_notification_time),
          average_response_time: learnings.approval_patterns?.average_response_time_hours || 24
        },
        risk_tolerance: learnings.approval_patterns?.risk_tolerance_score || 0.5,
        success_factors: learnings.success_factors || []
      },
      accuracy_metrics: {
        prediction_accuracy: this.calculateOverallAccuracy(learnings.prediction_accuracy),
        recommendation_success_rate: learnings.approval_patterns?.high_confidence_approval_rate || 0,
        false_positive_rate: this.calculateFalsePositiveRate(learnings.prediction_accuracy)
      },
      last_updated: new Date().toISOString()
    }

    // Update or insert learning model
    if (existingModel) {
      await supabaseAdmin
        .from('seller_learning_models')
        .update(updatedModel)
        .eq('seller_id', sellerId)
    } else {
      await supabaseAdmin
        .from('seller_learning_models')
        .insert(updatedModel)
    }

    return updatedModel
  }

  /**
   * ⚡ Apply learnings to improve future predictions
   */
  private static async applyLearnings(sellerId: string, model: LearningModel): Promise<void> {
    // Update seller preferences based on learnings
    const preferences = {
      auto_execute_threshold: model.patterns.risk_tolerance * 0.9, // Slightly lower than risk tolerance
      notification_preferences: {
        optimal_hour: model.patterns.timing_patterns.optimal_notification_hour,
        communication_style: 'adaptive', // Will adapt based on learned preferences
        urgency_threshold: model.patterns.risk_tolerance
      },
      learned_patterns: {
        prefers: model.patterns.success_factors,
        avoids: [], // Could extract from learnings
        confidence_threshold: model.patterns.risk_tolerance
      }
    }

    await supabaseAdmin
      .from('sellers')
      .update({ 
        preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)

    console.log(`🧠 Applied learnings for seller ${sellerId}: risk_tolerance=${model.patterns.risk_tolerance}, accuracy=${model.accuracy_metrics.prediction_accuracy}`)
  }

  /**
   * 📈 Send learning insights to seller
   */
  private static async sendLearningInsights(sellerId: string, learnings: any): Promise<void> {
    const insights = this.generateInsightsMessage(learnings)
    
    await NotificationService.sendNotification({
      sellerId,
      title: '🧠 AI Learning Update - System Improved',
      message: insights,
      urgency: 'normal',
      link: `${process.env.APP_URL}/dashboard/ai-insights`,
      data: {
        learning_cycle: new Date().toISOString(),
        improvements: learnings.improvement_areas,
        accuracy_metrics: learnings.prediction_accuracy
      }
    })
  }

  /**
   * 📝 Generate insights message for seller
   */
  private static generateInsightsMessage(learnings: any): string {
    const approval_rate = (learnings.approval_patterns?.high_confidence_approval_rate * 100).toFixed(1)
    const response_time = learnings.approval_patterns?.average_response_time_hours || 24
    
    return `
🧠 Your AI Assistant Just Got Smarter!

📊 Learning Summary:
• You approve ${approval_rate}% of high-confidence recommendations
• Average response time: ${response_time} hours
• AI accuracy is improving based on your feedback

🎯 What I Learned About You:
${learnings.success_factors?.slice(0, 3).map((factor: string) => `• ${factor}`).join('\n') || '• Analyzing your preferences...'}

🚀 Improvements Made:
${learnings.improvement_areas?.slice(0, 3).map((area: string) => `• ${area}`).join('\n') || '• Optimizing recommendation accuracy'}

Your AI assistant is continuously learning from your decisions to provide better recommendations!
    `
  }

  /**
   * 🎯 Get personalized recommendations based on learning model
   */
  static async getPersonalizedRecommendations(sellerId: string, baseRecommendations: any[]): Promise<any[]> {
    const { data: model } = await supabaseAdmin
      .from('seller_learning_models')
      .select('*')
      .eq('seller_id', sellerId)
      .single()

    if (!model) return baseRecommendations

    // Adjust recommendations based on learned preferences
    return baseRecommendations.map(rec => ({
      ...rec,
      confidence_score: this.adjustConfidenceScore(rec, model),
      urgency_level: this.adjustUrgencyLevel(rec, model),
      personalized: true,
      learning_factors: {
        risk_tolerance: model.patterns.risk_tolerance,
        historical_approval_rate: model.accuracy_metrics.recommendation_success_rate
      }
    })).sort((a, b) => b.confidence_score - a.confidence_score)
  }

  /**
   * Helper methods
   */
  private static parseTime(timeString: string): number {
    if (!timeString) return 9 // Default 9 AM
    const [hours] = timeString.split(':').map(n => parseInt(n))
    return hours
  }

  private static calculateOverallAccuracy(predictionAccuracy: any): number {
    if (!predictionAccuracy) return 0.5
    
    let totalPredictions = 0
    let totalAccurate = 0
    
    Object.values(predictionAccuracy).forEach((pred: any) => {
      totalPredictions += pred.made || 0
      totalAccurate += pred.accurate || 0
    })
    
    return totalPredictions > 0 ? totalAccurate / totalPredictions : 0.5
  }

  private static calculateFalsePositiveRate(predictionAccuracy: any): number {
    if (!predictionAccuracy) return 0.1
    
    let totalPredictions = 0
    let totalFalsePositives = 0
    
    Object.values(predictionAccuracy).forEach((pred: any) => {
      totalPredictions += pred.made || 0
      totalFalsePositives += (pred.made || 0) - (pred.accurate || 0)
    })
    
    return totalPredictions > 0 ? totalFalsePositives / totalPredictions : 0.1
  }

  private static adjustConfidenceScore(recommendation: any, model: LearningModel): number {
    const baseConfidence = recommendation.confidence_score
    const sellerRiskTolerance = model.patterns.risk_tolerance
    const historicalSuccessRate = model.accuracy_metrics.recommendation_success_rate
    
    // Adjust confidence based on seller's historical approval patterns
    let adjustedConfidence = baseConfidence * (0.7 + historicalSuccessRate * 0.3)
    
    // Factor in risk tolerance
    if (recommendation.risk_level === 'high' && sellerRiskTolerance < 0.3) {
      adjustedConfidence *= 0.8 // Lower confidence for risk-averse sellers
    }
    
    return Math.min(0.95, Math.max(0.1, adjustedConfidence))
  }

  private static adjustUrgencyLevel(recommendation: any, model: LearningModel): string {
    const baseUrgency = recommendation.urgency_level
    const sellerResponseTime = model.patterns.timing_patterns.average_response_time
    
    // If seller responds quickly, can use higher urgency
    // If seller responds slowly, reduce urgency to avoid fatigue
    if (sellerResponseTime < 4 && baseUrgency === 'normal') {
      return 'high'
    } else if (sellerResponseTime > 24 && baseUrgency === 'high') {
      return 'normal'
    }
    
    return baseUrgency
  }
}