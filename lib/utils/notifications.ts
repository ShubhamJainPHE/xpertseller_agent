import { ComposioToolSet } from 'composio-core'
import { supabaseAdmin } from '../database/connection'

const toolset = new ComposioToolSet({
  apiKey: process.env.COMPOSIO_API_KEY
})

interface NotificationOptions {
  sellerId: string
  title: string
  message: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  link?: string
  data?: any
}

export class NotificationService {
  
  /**
   * Send notification via appropriate channel based on urgency
   */
  static async sendNotification(options: NotificationOptions): Promise<void> {
    try {
      // Get seller preferences
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('email, preferences')
        .eq('id', options.sellerId)
        .single()

      if (!seller) {
        console.error(`Seller not found: ${options.sellerId}`)
        return
      }

      const { urgency = 'normal' } = options
      
      // For critical/high urgency, try WhatsApp first
      if ((urgency === 'critical' || urgency === 'high') && seller.preferences?.whatsapp_number) {
        await this.sendWhatsApp(seller.preferences.whatsapp_number, options)
      }
      
      // Always send email notification
      await this.sendEmail(seller.email, options)
      
      // Log notification
      await this.logNotification(options)
      
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  /**
   * Send WhatsApp message
   */
  private static async sendWhatsApp(phoneNumber: string, options: NotificationOptions): Promise<void> {
    try {
      const message = `🤖 XpertSeller Alert
      
${options.title}

${options.message}

${options.link ? `View Details: ${options.link}` : ''}

Reply STOP to unsubscribe`

      await toolset.executeAction({
        action: 'whatsapp_send_message',
        params: {
          to: phoneNumber,
          message: message
        }
      })
      
      console.log(`📱 WhatsApp sent to ${phoneNumber}`)
    } catch (error) {
      console.error('WhatsApp failed:', error)
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(email: string, options: NotificationOptions): Promise<void> {
    try {
      const urgencyEmoji = {
        low: '💡',
        normal: '📊', 
        high: '⚠️',
        critical: '🚨'
      }[options.urgency || 'normal']

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .urgency-${options.urgency} { border-left: 4px solid ${this.getUrgencyColor(options.urgency)}; padding-left: 15px; }
            .button { background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 15px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${urgencyEmoji} XpertSeller Alert</h1>
          </div>
          <div class="content">
            <div class="urgency-${options.urgency}">
              <h2>${options.title}</h2>
              <p>${options.message}</p>
              
              ${options.data ? `
                <h3>Details:</h3>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${JSON.stringify(options.data, null, 2)}</pre>
              ` : ''}
              
              ${options.link ? `
                <a href="${options.link}" class="button">View in Dashboard</a>
              ` : ''}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from XpertSeller AI Agents.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `

      await toolset.executeAction({
        action: 'gmail_send_email', 
        params: {
          to: email,
          subject: `${urgencyEmoji} ${options.title}`,
          html: htmlContent
        }
      })
      
      console.log(`📧 Email sent to ${email}`)
    } catch (error) {
      console.error('Email failed:', error)
    }
  }

  /**
   * Log notification to database for tracking
   */
  private static async logNotification(options: NotificationOptions): Promise<void> {
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: options.sellerId,
          event_type: 'notification.sent',
          event_category: 'communication',
          data: {
            title: options.title,
            message: options.message,
            urgency: options.urgency,
            timestamp: new Date().toISOString()
          },
          importance_score: this.getImportanceScore(options.urgency),
          requires_action: false,
          processing_status: 'completed',
          processed_by: ['notification_service'],
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log notification:', error)
    }
  }

  /**
   * Send daily summary to seller
   */
  static async sendDailySummary(sellerId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's recommendations
      const { data: recommendations } = await supabaseAdmin
        .from('recommendations')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('created_at', today)
        .order('predicted_impact', { ascending: false })

      if (!recommendations || recommendations.length === 0) {
        return // No activity today
      }

      const totalImpact = recommendations.reduce((sum, rec) => sum + (rec.predicted_impact || 0), 0)
      const criticalCount = recommendations.filter(r => r.urgency_level === 'critical').length
      const pendingCount = recommendations.filter(r => r.status === 'pending').length

      const summary = `
📊 Daily Summary - ${new Date().toLocaleDateString()}

🎯 ${recommendations.length} new recommendations generated
💰 Total potential impact: $${totalImpact.toFixed(2)}
🚨 ${criticalCount} critical issues need attention
⏳ ${pendingCount} recommendations pending your review

Top Opportunities:
${recommendations.slice(0, 3).map(r => 
  `• ${r.title} - $${(r.predicted_impact || 0).toFixed(2)} impact`
).join('\n')}
      `

      await this.sendNotification({
        sellerId,
        title: `Daily Summary: ${recommendations.length} New Recommendations`,
        message: summary,
        urgency: criticalCount > 0 ? 'high' : 'normal',
        link: `${process.env.APP_URL}/dashboard`
      })

    } catch (error) {
      console.error('Failed to send daily summary:', error)
    }
  }

  /**
   * Send weekly performance report
   */
  static async sendWeeklyReport(sellerId: string): Promise<void> {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Get week's data
      const { data: recommendations } = await supabaseAdmin
        .from('recommendations')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('created_at', weekAgo)

      const { data: actions } = await supabaseAdmin
        .from('fact_stream')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('event_category', 'automation')
        .gte('created_at', weekAgo)

      if (!recommendations?.length && !actions?.length) {
        return // No activity this week
      }

      const approvedRecs = recommendations?.filter(r => r.status === 'approved') || []
      const totalPotentialImpact = recommendations?.reduce((sum, r) => sum + (r.predicted_impact || 0), 0) || 0
      const approvedImpact = approvedRecs.reduce((sum, r) => sum + (r.predicted_impact || 0), 0)

      const report = `
📈 Weekly Performance Report

🎯 Recommendations: ${recommendations?.length || 0} generated
✅ Approved: ${approvedRecs.length} 
🤖 AI Actions: ${actions?.length || 0} executed
💰 Potential Impact: $${totalPotentialImpact.toFixed(2)}
💵 Approved Impact: $${approvedImpact.toFixed(2)}
📊 Approval Rate: ${recommendations?.length ? ((approvedRecs.length / recommendations.length) * 100).toFixed(1) : 0}%

Keep optimizing! 🚀
      `

      await this.sendNotification({
        sellerId,
        title: 'Weekly Performance Report',
        message: report,
        urgency: 'normal',
        link: `${process.env.APP_URL}/dashboard/analytics`
      })

    } catch (error) {
      console.error('Failed to send weekly report:', error)
    }
  }

  /**
   * Helper functions
   */
  private static getUrgencyColor(urgency?: string): string {
    const colors = {
      low: '#34a853',      // Green
      normal: '#1a73e8',   // Blue  
      high: '#ff9800',     // Orange
      critical: '#ea4335'  // Red
    }
    return colors[urgency as keyof typeof colors] || colors.normal
  }

  private static getImportanceScore(urgency?: string): number {
    const scores = {
      low: 3,
      normal: 5,
      high: 7,
      critical: 9
    }
    return scores[urgency as keyof typeof scores] || scores.normal
  }
}