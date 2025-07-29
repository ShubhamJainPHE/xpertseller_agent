import { supabaseAdmin } from '../database/connection'
import { OpenAI } from 'openai'
import { ComposioToolSet } from 'composio-core'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const toolset = new ComposioToolSet({
  apiKey: process.env.COMPOSIO_API_KEY
})

interface SmartNotificationOptions {
  sellerId: string
  title: string
  message: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'  
  context?: any // Business context for optimization
}

export class SmartNotificationAgent {
  
  /**
   * Enhance notification with AI-optimized content based on seller response patterns
   */
  static async sendOptimizedNotification(options: SmartNotificationOptions): Promise<void> {
    try {
      console.log(`🧠 Optimizing notification for seller: ${options.sellerId}`)
      
      // Get seller's notification response history
      const responsePatterns = await this.getSellerResponsePatterns(options.sellerId)
      
      // Only optimize if we have enough data and OpenAI is available
      if (responsePatterns.totalNotifications > 3 && process.env.OPENAI_API_KEY) {
        const optimizedContent = await this.optimizeNotificationContent(options, responsePatterns)
        
        if (optimizedContent) {
          options.title = optimizedContent.title
          options.message = optimizedContent.message
          console.log(`✅ Notification content optimized for better engagement`)
        }
      }
      
      // Send via the existing notification service
      const { NotificationService } = await import('../utils/notifications')
      await NotificationService.sendNotification({
        sellerId: options.sellerId,
        title: options.title,
        message: options.message,
        urgency: options.urgency,
        data: { 
          ...options.context,
          optimized: true,
          timestamp: new Date().toISOString()
        }
      })
      
      // Track the optimization
      await this.trackOptimization(options.sellerId, options, responsePatterns)
      
    } catch (error) {
      console.error('Smart notification failed:', error)
      
      // Fallback to regular notification
      const { NotificationService } = await import('../utils/notifications')
      await NotificationService.sendNotification({
        sellerId: options.sellerId,
        title: options.title,
        message: options.message,
        urgency: options.urgency
      })
    }
  }
  
  /**
   * Get seller's notification response patterns from database
   */
  private static async getSellerResponsePatterns(sellerId: string): Promise<{
    totalNotifications: number
    responseRate: number
    avgResponseTime: number // in minutes
    preferredTimes: number[] // hours when they respond most
    ignoredTopics: string[]
    bestPerformingTitles: string[]
  }> {
    try {
      // Get notification history from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: notifications } = await supabaseAdmin
        .from('fact_stream')
        .select('created_at, data')
        .eq('seller_id', sellerId)
        .eq('event_type', 'notification.sent')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)
      
      // Get seller actions/responses after notifications
      const { data: responses } = await supabaseAdmin
        .from('fact_stream')
        .select('created_at, data, event_type')
        .eq('seller_id', sellerId)
        .in('event_type', ['recommendation.viewed', 'recommendation.approved', 'dashboard.visited'])
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (!notifications || notifications.length === 0) {
        return {
          totalNotifications: 0,
          responseRate: 0,
          avgResponseTime: 60,
          preferredTimes: [9, 14], // Default business hours
          ignoredTopics: [],
          bestPerformingTitles: []
        }
      }
      
      // Calculate response patterns
      const responseMatches = this.matchNotificationsToResponses(notifications, responses || [])
      const responseRate = responseMatches.matches / notifications.length
      const avgResponseTime = responseMatches.avgTime
      const preferredTimes = this.analyzePreferredTimes(responses || [])
      const bestTitles = this.findBestPerformingTitles(notifications, responses || [])
      
      return {
        totalNotifications: notifications.length,
        responseRate,
        avgResponseTime,
        preferredTimes,
        ignoredTopics: [], // Could analyze this from low-response notifications
        bestPerformingTitles: bestTitles
      }
      
    } catch (error) {
      console.error('Failed to get response patterns:', error)
      return {
        totalNotifications: 0,
        responseRate: 0,
        avgResponseTime: 60,
        preferredTimes: [9, 14],
        ignoredTopics: [],
        bestPerformingTitles: []
      }
    }
  }
  
  /**
   * Use OpenAI to optimize notification content based on patterns
   */
  private static async optimizeNotificationContent(
    options: SmartNotificationOptions,
    patterns: any
  ): Promise<{ title: string; message: string } | null> {
    try {
      const prompt = `You are optimizing a business notification for an Amazon seller based on their response patterns.

SELLER RESPONSE PATTERNS:
- Total notifications received: ${patterns.totalNotifications}
- Response rate: ${(patterns.responseRate * 100).toFixed(1)}%
- Average response time: ${patterns.avgResponseTime} minutes
- Best response times: ${patterns.preferredTimes.join(', ')}:00
- Best performing titles: ${patterns.bestPerformingTitles.slice(0, 3).join(', ')}

CURRENT NOTIFICATION:
Title: "${options.title}"
Message: "${options.message}"
Urgency: ${options.urgency}

OPTIMIZATION GOALS:
1. Increase likelihood of seller reading and acting on the notification
2. Match communication style that has worked before
3. Be specific and actionable
4. Maintain professional tone while being engaging

Optimize the title and message to improve engagement. Keep the same core information but make it more compelling based on what has worked for this seller before.`

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using faster, cheaper model for this task
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'optimize_notification',
            description: 'Optimize notification title and message',
            parameters: {
              type: 'object',
              properties: {
                optimized_title: { type: 'string', maxLength: 100 },
                optimized_message: { type: 'string', maxLength: 500 },
                reasoning: { type: 'string', maxLength: 200 }
              },
              required: ['optimized_title', 'optimized_message']
            }
          }
        }],
        tool_choice: 'auto',
        max_tokens: 400
      })

      const toolCall = response.choices[0]?.message?.tool_calls?.[0]
      if (toolCall && toolCall.function.name === 'optimize_notification') {
        const result = JSON.parse(toolCall.function.arguments)
        console.log(`🎯 Optimization reasoning: ${result.reasoning}`)
        return {
          title: result.optimized_title,
          message: result.optimized_message
        }
      }

      return null

    } catch (error) {
      console.error('AI optimization failed:', error)
      return null
    }
  }
  
  /**
   * Helper methods for pattern analysis
   */
  private static matchNotificationsToResponses(notifications: any[], responses: any[]): {
    matches: number
    avgTime: number
  } {
    let matches = 0
    let totalResponseTime = 0
    
    notifications.forEach(notification => {
      const notificationTime = new Date(notification.created_at).getTime()
      
      // Look for response within 2 hours of notification
      const response = responses.find(r => {
        const responseTime = new Date(r.created_at).getTime()
        return responseTime > notificationTime && 
               responseTime < notificationTime + (2 * 60 * 60 * 1000)
      })
      
      if (response) {
        matches++
        totalResponseTime += (new Date(response.created_at).getTime() - notificationTime) / (1000 * 60)
      }
    })
    
    return {
      matches,
      avgTime: matches > 0 ? totalResponseTime / matches : 60
    }
  }
  
  private static analyzePreferredTimes(responses: any[]): number[] {
    const hourCounts = new Map<number, number>()
    
    responses.forEach(response => {
      const hour = new Date(response.created_at).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    })
    
    // Return top 3 hours
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour)
  }
  
  private static findBestPerformingTitles(notifications: any[], responses: any[]): string[] {
    const titlePerformance = new Map<string, number>()
    
    notifications.forEach(notification => {
      const title = notification.data?.title || ''
      if (!title) return
      
      const notificationTime = new Date(notification.created_at).getTime()
      const hasResponse = responses.some(r => {
        const responseTime = new Date(r.created_at).getTime()
        return responseTime > notificationTime && 
               responseTime < notificationTime + (2 * 60 * 60 * 1000)
      })
      
      if (hasResponse) {
        titlePerformance.set(title, (titlePerformance.get(title) || 0) + 1)
      }
    })
    
    return Array.from(titlePerformance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title]) => title)
  }
  
  /**
   * Track optimization results for learning
   */
  private static async trackOptimization(
    sellerId: string, 
    options: SmartNotificationOptions,
    patterns: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: sellerId,
          event_type: 'notification.optimized',
          event_category: 'ai_enhancement',
          data: {
            original_title: options.title,
            original_message: options.message,
            urgency: options.urgency,
            seller_patterns: {
              response_rate: patterns.responseRate,
              total_notifications: patterns.totalNotifications
            },
            optimization_timestamp: new Date().toISOString()
          },
          importance_score: 6,
          requires_action: false,
          processing_status: 'completed',
          processed_by: ['smart_notification_agent'],
          created_at: new Date().toISOString()
        })
        
      console.log(`📊 Tracked notification optimization for seller: ${sellerId}`)
    } catch (error) {
      console.error('Failed to track optimization:', error)
    }
  }

  /**
   * Bulk optimize notifications for all active sellers (daily job)
   */
  static async optimizeAllSellerNotifications(): Promise<void> {
    try {
      console.log('🔄 Starting bulk notification optimization...')
      
      const { data: sellers } = await supabaseAdmin
        .from('sellers')
        .select('id, email')
        .eq('status', 'active')
        .limit(50) // Process in batches
      
      if (!sellers || sellers.length === 0) return
      
      for (const seller of sellers) {
        try {
          // Get any pending high-priority notifications and optimize them
          const patterns = await this.getSellerResponsePatterns(seller.id)
          
          // Example: Send optimized weekly summary if it's time
          const lastWeeklySummary = await this.getLastWeeklySummary(seller.id)
          const daysSinceLastSummary = (Date.now() - new Date(lastWeeklySummary).getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysSinceLastSummary >= 7) {
            await this.sendOptimizedNotification({
              sellerId: seller.id,
              title: 'Weekly Business Update',
              message: 'Your weekly performance summary is ready with actionable insights.',
              urgency: 'normal',
              context: { type: 'weekly_summary', automated: true }
            })
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (error) {
          console.error(`Failed to optimize notifications for seller ${seller.id}:`, error)
        }
      }
      
      console.log(`✅ Completed notification optimization for ${sellers.length} sellers`)
    } catch (error) {
      console.error('Bulk notification optimization failed:', error)
    }
  }
  
  private static async getLastWeeklySummary(sellerId: string): Promise<string> {
    try {
      const { data: lastSummary } = await supabaseAdmin
        .from('fact_stream')
        .select('created_at')
        .eq('seller_id', sellerId)
        .eq('event_type', 'notification.sent')
        .like('data->>title', '%Weekly%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      return lastSummary?.created_at || new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    } catch (error) {
      return new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
}