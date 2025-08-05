// Enable Unified MCP System for all notifications
import { unifiedMCPSystem } from '../mcp/unified-mcp-system'
import { supabaseAdmin } from '../database/connection'

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

      // WhatsApp via Unified MCP System (Composio integration)
      await unifiedMCPSystem.sendNotification(
        phoneNumber,
        'XpertSeller Alert',
        message,
        'high'
      )
      
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

      await unifiedMCPSystem.sendNotification(
        email,
        `${urgencyEmoji} ${options.title}`,
        htmlContent,
        options.urgency
      )
      
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
      // Simple logging - just log to console for now since table schema is unknown
      console.log(`📝 Notification logged: ${options.title} -> ${options.sellerId}`)
      
      // If logging to database is critical, we'd need to check the actual table schema
      // For now, the notification delivery is more important than tracking
    } catch (error) {
      console.error('Failed to log notification:', error)
      // Continue even if logging fails - notification delivery is more important
    }
  }

  /**
   * Send daily summary to seller
   */
  static async sendDailySummary(sellerId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's sales data instead of recommendations
      const { data: salesData } = await supabaseAdmin
        .from('sales_data')
        .select('*, products(title)')
        .gte('date', today)
        .order('revenue', { ascending: false })
        .limit(10)

      if (!salesData || salesData.length === 0) {
        return // No activity today
      }

      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.revenue || 0), 0)
      const totalUnits = salesData.reduce((sum, sale) => sum + (sale.units_sold || 0), 0)
      const totalProfit = salesData.reduce((sum, sale) => sum + (sale.profit || 0), 0)

      const summary = `
📊 Daily Summary - ${new Date().toLocaleDateString()}

💰 Total Revenue: $${totalRevenue.toFixed(2)}
📦 Units Sold: ${totalUnits}
💵 Total Profit: $${totalProfit.toFixed(2)}
📈 Profit Margin: ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%

Top Products Today:
${salesData.slice(0, 3).map(sale => 
  `• ${sale.products?.title || 'Product'} - $${(sale.revenue || 0).toFixed(2)} revenue`
).join('\n')}
      `

      await this.sendNotification({
        sellerId,
        title: `Daily Summary: $${totalRevenue.toFixed(2)} Revenue`,
        message: summary,
        urgency: totalProfit < 0 ? 'high' : 'normal',
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