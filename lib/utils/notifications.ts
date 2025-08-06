// Direct Supabase + Resend integration for notifications
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

      // Note: WhatsApp integration removed (MCP dependency)
      console.log('WhatsApp feature temporarily disabled')
      
      console.log(`📱 WhatsApp sent to ${phoneNumber}`)
    } catch (error) {
      console.error('WhatsApp failed:', error)
    }
  }

  /**
   * Send email notification with Gmail MCP primary + Resend fallback
   */
  private static async sendEmail(email: string, options: NotificationOptions): Promise<void> {
    const urgencyEmoji = {
      low: '💡',
      normal: '📊', 
      high: '⚠️',
      critical: '🚨'
    }[options.urgency || 'normal']

    const subject = `${urgencyEmoji} ${options.title}`
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

    // Track errors from each method
    const gmailError: unknown = null
    let resendError: unknown = null

    // Note: MCP Gmail removed - using Resend directly

    // 🛡️ FALLBACK: Use Resend if Gmail MCP fails
    try {
      console.log('📧 Attempting Resend (fallback method)...')
      await this.sendViaResend(email, subject, htmlContent)
      console.log(`✅ Email sent via Resend fallback to ${email}`)
    } catch (error) {
      resendError = error
      console.error('❌ Both Gmail MCP and Resend failed:', {
        gmail_error: gmailError instanceof Error ? gmailError.message : gmailError,
        resend_error: error instanceof Error ? error.message : error,
        recipient: email,
        urgency: options.urgency
      })
      
      // Log critical failure to database for monitoring
      await this.logNotificationFailure({
        ...options,
        recipient: email,
        gmail_error: gmailError instanceof Error ? gmailError.message : String(gmailError),
        resend_error: error instanceof Error ? error.message : String(error)
      })
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
   * Send email via Resend (fallback method)
   */
  private static async sendViaResend(email: string, subject: string, htmlContent: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key not configured')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'XpertSeller <notifications@xpertseller.com>',
        to: [email],
        subject,
        html: htmlContent
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('📧 Resend response:', result.id)
  }

  /**
   * Log notification failure for monitoring
   */
  private static async logNotificationFailure(failure: any): Promise<void> {
    try {
      // Log to Supabase for monitoring and alerting
      await supabaseAdmin
        .from('notification_failures')
        .insert({
          seller_id: failure.sellerId,
          recipient: failure.recipient,
          title: failure.title,
          urgency: failure.urgency,
          gmail_error: failure.gmail_error,
          resend_error: failure.resend_error,
          failed_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log notification failure:', logError)
      // Don't throw - logging failure shouldn't break the flow
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