import { Resend } from 'resend'
import { Twilio } from 'twilio'
import { supabaseAdmin } from '../database/connection'
import { eventBus, createEvent } from '../events/event-bus'

export interface CommunicationChannel {
  type: 'email' | 'whatsapp' | 'sms' | 'push' | 'dashboard'
  enabled: boolean
  config: Record<string, any>
  priority: number
  rateLimits: {
    maxPerHour: number
    maxPerDay: number
    cooldownMinutes: number
  }
}

export interface AlertTemplate {
  id: string
  name: string
  channel: string
  subject: string
  content: string
  variables: string[]
  urgencyLevel: 'low' | 'normal' | 'high' | 'critical'
  personalization: {
    tone: 'professional' | 'friendly' | 'urgent'
    includeContext: boolean
    includeRecommendations: boolean
  }
}

export interface AlertDelivery {
  id: string
  alertId: string
  sellerId: string
  channel: string
  recipient: string
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'
  attempts: number
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  failureReason?: string
  metadata: Record<string, any>
}

export interface PersonalizationContext {
  sellerId: string
  sellerName: string
  businessContext: any
  preferences: any
  recentActivity: any
  performanceMetrics: any
  communicationHistory: any
}

export class CommunicationEngine {
  private resend: Resend
  private twilio: Twilio
  private templates = new Map<string, AlertTemplate>()
  private channels = new Map<string, CommunicationChannel>()
  private deliveryTracking = new Map<string, AlertDelivery>()

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
    this.twilio = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    
    this.initializeChannels()
    this.loadTemplates()
  }

  private initializeChannels(): void {
    this.channels.set('email', {
      type: 'email',
      enabled: true,
      config: {
        fromEmail: 'alerts@xpertseller.com',
        fromName: 'XpertSeller AI Team'
      },
      priority: 1,
      rateLimits: {
        maxPerHour: 50,
        maxPerDay: 200,
        cooldownMinutes: 5
      }
    })

    this.channels.set('whatsapp', {
      type: 'whatsapp',
      enabled: true,
      config: {
        fromNumber: '+1234567890' // Twilio WhatsApp number
      },
      priority: 2,
      rateLimits: {
        maxPerHour: 20,
        maxPerDay: 100,
        cooldownMinutes: 15
      }
    })

    this.channels.set('sms', {
      type: 'sms',
      enabled: true,
      config: {
        fromNumber: '+1234567890'
      },
      priority: 3,
      rateLimits: {
        maxPerHour: 10,
        maxPerDay: 50,
        cooldownMinutes: 30
      }
    })

    this.channels.set('dashboard', {
      type: 'dashboard',
      enabled: true,
      config: {},
      priority: 4,
      rateLimits: {
        maxPerHour: 1000,
        maxPerDay: 5000,
        cooldownMinutes: 0
      }
    })
  }

  private async loadTemplates(): Promise<void> {
    try {
      // Load templates from database
      const { data: templates, error } = await supabaseAdmin
        .from('alert_templates')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Failed to load templates:', error)
        return
      }

      // Set default templates if none exist
      if (!templates || templates.length === 0) {
        await this.createDefaultTemplates()
        return
      }

      templates.forEach(template => {
        this.templates.set(template.id, {
          id: template.id,
          name: template.name,
          channel: template.channel,
          subject: template.subject,
          content: template.content,
          variables: template.variables || [],
          urgencyLevel: template.urgency_level,
          personalization: template.personalization || {
            tone: 'professional',
            includeContext: true,
            includeRecommendations: true
          }
        })
      })

      console.log(`Loaded ${templates.length} communication templates`)
    } catch (error) {
      console.error('Template loading failed:', error)
    }
  }

  // Main alert sending interface
  async sendAlert(
    sellerId: string,
    templateId: string,
    variables: Record<string, any>,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'critical'
      channels?: string[]
      scheduleAt?: Date
      expiresAt?: Date
    } = {}
  ): Promise<string> {
    try {
      console.log(`Sending alert ${templateId} to seller ${sellerId}`)

      // Get template
      const template = this.templates.get(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      // Get seller personalization context
      const context = await this.getPersonalizationContext(sellerId)
      
      // Determine optimal channels if not specified
      const channels = options.channels || await this.selectOptimalChannels(
        sellerId,
        template.urgencyLevel,
        context
      )

      // Create alert record
      const { data: alert, error: alertError } = await supabaseAdmin
        .from('alerts')
        .insert({
          seller_id: sellerId,
          alert_type: options.priority || template.urgencyLevel,
          template_id: templateId,
          variables,
          channels,
          scheduled_at: options.scheduleAt?.toISOString() || new Date().toISOString(),
          expires_at: options.expiresAt?.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (alertError) {
        throw new Error(`Failed to create alert: ${alertError.message}`)
      }

      // Process each channel
      for (const channelType of channels) {
        await this.processChannelDelivery(alert, template, channelType, variables, context)
      }

      // Log alert creation event
      await eventBus.publish(createEvent(
        'communication.alert_sent',
        'performance',
        sellerId,
        {
          alert_id: alert.id,
          template_id: templateId,
          channels,
          urgency: template.urgencyLevel
        },
        { importance: template.urgencyLevel === 'critical' ? 10 : 5 }
      ))

      return alert.id

    } catch (error) {
      console.error('Alert sending failed:', error)
      throw error
    }
  }

  // Process delivery for specific channel
  private async processChannelDelivery(
    alert: any,
    template: AlertTemplate,
    channelType: string,
    variables: Record<string, any>,
    context: PersonalizationContext
  ): Promise<void> {
    try {
      const channel = this.channels.get(channelType)
      if (!channel || !channel.enabled) {
        console.warn(`Channel ${channelType} not available`)
        return
      }

      // Check rate limits
      const canSend = await this.checkRateLimit(context.sellerId, channelType)
      if (!canSend) {
        console.warn(`Rate limit exceeded for ${channelType}`)
        return
      }

      // Personalize content
      const personalizedContent = await this.personalizeContent(
        template,
        variables,
        context,
        channelType
      )

      // Send via appropriate channel
      let deliveryResult: any
      switch (channelType) {
        case 'email':
          deliveryResult = await this.sendEmail(
            context.sellerId,
            personalizedContent.subject,
            personalizedContent.content,
            context
          )
          break
        case 'whatsapp':
          deliveryResult = await this.sendWhatsApp(
            context.sellerId,
            personalizedContent.content,
            context
          )
          break
        case 'sms':
          deliveryResult = await this.sendSMS(
            context.sellerId,
            personalizedContent.content,
            context
          )
          break
        case 'dashboard':
          deliveryResult = await this.sendDashboardNotification(
            context.sellerId,
            personalizedContent,
            alert
          )
          break
      }

      // Record delivery attempt
      await this.recordDeliveryAttempt(
        alert.id,
        channelType,
        deliveryResult.success ? 'sent' : 'failed',
        deliveryResult
      )

    } catch (error) {
      console.error(`Channel delivery failed for ${channelType}:`, error)
      
      await this.recordDeliveryAttempt(
        alert.id,
        channelType,
        'failed',
        { error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  // Email delivery
  private async sendEmail(
    sellerId: string,
    subject: string,
    content: string,
    context: PersonalizationContext
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get seller email from context
      const sellerEmail = context.preferences?.email || context.businessContext?.contact_email
      if (!sellerEmail) {
        throw new Error('No email address found for seller')
      }

      const channel = this.channels.get('email')!
      
      const result = await this.resend.emails.send({
        from: `${channel.config.fromName} <${channel.config.fromEmail}>`,
        to: [sellerEmail],
        subject,
        html: this.generateEmailHTML(content, context),
        text: content,
        headers: {
          'X-Seller-ID': sellerId,
          'X-Alert-System': 'XpertSeller'
        }
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      return {
        success: true,
        messageId: result.data?.id
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // WhatsApp delivery
  private async sendWhatsApp(
    sellerId: string,
    content: string,
    context: PersonalizationContext
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumber = context.preferences?.whatsapp_number || context.preferences?.phone_number
      if (!phoneNumber) {
        throw new Error('No WhatsApp number found for seller')
      }

      const channel = this.channels.get('whatsapp')!
      
      const message = await this.twilio.messages.create({
        body: content,
        from: `whatsapp:${channel.config.fromNumber}`,
        to: `whatsapp:${phoneNumber}`
      })

      return {
        success: true,
        messageId: message.sid
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // SMS delivery
  private async sendSMS(
    sellerId: string,
    content: string,
    context: PersonalizationContext
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const phoneNumber = context.preferences?.phone_number
      if (!phoneNumber) {
        throw new Error('No phone number found for seller')
      }

      const channel = this.channels.get('sms')!
      
      const message = await this.twilio.messages.create({
        body: content,
        from: channel.config.fromNumber,
        to: phoneNumber
      })

      return {
        success: true,
        messageId: message.sid
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // Dashboard notification
  private async sendDashboardNotification(
    sellerId: string,
    content: any,
    alert: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Store notification in database for dashboard display
      const { data: notification, error } = await supabaseAdmin
        .from('dashboard_notifications')
        .insert({
          seller_id: sellerId,
          title: content.subject,
          message: content.content,
          alert_id: alert.id,
          urgency_level: alert.alert_type,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Send real-time update to dashboard
      await supabaseAdmin
        .channel(`seller_${sellerId}`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: notification
        })

      return {
        success: true,
        messageId: notification.id
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // Content personalization using AI
  private async personalizeContent(
    template: AlertTemplate,
    variables: Record<string, any>,
    context: PersonalizationContext,
    channelType: string
  ): Promise<{ subject: string; content: string }> {
    try {
      // Replace template variables
      let subject = template.subject
      let content = template.content

      // Basic variable replacement
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
        content = content.replace(new RegExp(placeholder, 'g'), String(value))
      })

      // Add personalization based on context
      if (template.personalization.includeContext) {
        content = await this.addContextualPersonalization(content, context, channelType)
      }

      // Adjust tone
      content = await this.adjustTone(content, template.personalization.tone, context)

      // Add recommendations if specified
      if (template.personalization.includeRecommendations) {
        content = await this.addRecommendations(content, context)
      }

      // Channel-specific formatting
      content = this.formatForChannel(content, channelType)

      return { subject, content }

    } catch (error) {
      console.error('Content personalization failed:', error)
      // Return basic template if personalization fails
      return { subject: template.subject, content: template.content }
    }
  }

  private async addContextualPersonalization(
    content: string,
    context: PersonalizationContext,
    channelType: string
  ): Promise<string> {
    // Add seller-specific context
    const greeting = this.getPersonalizedGreeting(context)
    const businessContext = this.getBusinessContext(context)
    const performance = this.getPerformanceSummary(context)

    let personalizedContent = content

    // Add greeting if not present
    if (!content.toLowerCase().includes('hello') && !content.toLowerCase().includes('hi')) {
      personalizedContent = `${greeting}\n\n${personalizedContent}`
    }

    // Add context footer for email
    if (channelType === 'email' && businessContext) {
      personalizedContent += `\n\n${businessContext}`
    }

    return personalizedContent
  }

  private async adjustTone(
    content: string,
    tone: 'professional' | 'friendly' | 'urgent',
    context: PersonalizationContext
  ): Promise<string> {
    // Simple tone adjustments
    switch (tone) {
      case 'friendly':
        content = content.replace(/\./g, '! 😊')
        break
      case 'urgent':
        content = `🚨 URGENT: ${content}`
        content = content.replace(/please/gi, 'PLEASE')
        break
      case 'professional':
      default:
        // Keep as is
        break
    }

    return content
  }

  private getPersonalizedGreeting(context: PersonalizationContext): string {
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const name = context.sellerName || 'there'
    
    return `${timeGreeting}, ${name}!`
  }

  private getBusinessContext(context: PersonalizationContext): string {
    const metrics = context.performanceMetrics
    if (!metrics) return ''

    return `Your current performance: ${metrics.revenue || 0} revenue, ${metrics.units_sold || 0} units sold this week.`
  }

  private getPerformanceSummary(context: PersonalizationContext): string {
    // Generate brief performance summary
    return ''
  }

  private async addRecommendations(content: string, context: PersonalizationContext): Promise<string> {
    try {
      // Get recent recommendations for this seller
      const { data: recommendations, error } = await supabaseAdmin
        .from('recommendations')
        .select('title, predicted_impact, confidence_score')
        .eq('seller_id', context.sellerId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(3)

      if (error || !recommendations || recommendations.length === 0) {
        return content
      }

      const recText = recommendations.map((rec, index) => 
        `${index + 1}. ${rec.title} (${rec.predicted_impact > 0 ? '+' : ''}$${rec.predicted_impact})`
      ).join('\n')

      return `${content}\n\nYour top opportunities:\n${recText}`

    } catch (error) {
      console.error('Failed to add recommendations:', error)
      return content
    }
  }

  private formatForChannel(content: string, channelType: string): string {
    switch (channelType) {
      case 'sms':
      case 'whatsapp':
        // Limit length and remove HTML
        return content.replace(/<[^>]*>/g, '').substring(0, 1500)
      case 'email':
        // Keep full content
        return content
      case 'dashboard':
        // Format for dashboard display
        return content
      default:
        return content
    }
  }

  private generateEmailHTML(content: string, context: PersonalizationContext): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XpertSeller Alert</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .cta { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 XpertSeller AI Alert</h1>
  </div>
  <div class="content">
    ${content.replace(/\n/g, '<br>')}
    <a href="https://app.xpertseller.com/dashboard" class="cta">View Dashboard</a>
  </div>
  <div class="footer">
    <p>This alert was generated by your XpertSeller AI team.<br>
    <a href="https://app.xpertseller.com/settings/notifications">Manage notification preferences</a></p>
  </div>
</body>
</html>`
  }

  // Channel selection logic
  private async selectOptimalChannels(
    sellerId: string,
    urgency: string,
    context: PersonalizationContext
  ): Promise<string[]> {
    const preferences = context.preferences?.notification_channels || ['email', 'dashboard']
    const channels: string[] = []

    // Always include dashboard
    channels.push('dashboard')

    // Critical alerts go to all available channels
    if (urgency === 'critical') {
      if (preferences.includes('whatsapp')) channels.push('whatsapp')
      if (preferences.includes('sms')) channels.push('sms')
      if (preferences.includes('email')) channels.push('email')
    } else if (urgency === 'high') {
      if (preferences.includes('email')) channels.push('email')
      if (preferences.includes('whatsapp')) channels.push('whatsapp')
    } else {
      // Normal/low priority - respect preferences
      if (preferences.includes('email')) channels.push('email')
    }

    return [...new Set(channels)] // Remove duplicates
  }

  // Rate limiting
  private async checkRateLimit(sellerId: string, channelType: string): Promise<boolean> {
    try {
      const channel = this.channels.get(channelType)
      if (!channel) return false

      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Check hourly limit
      const { count: hourlyCount } = await supabaseAdmin
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .contains('channels', [channelType])
        .gte('created_at', hourAgo.toISOString())

      if ((hourlyCount || 0) >= channel.rateLimits.maxPerHour) {
        return false
      }

      // Check daily limit
      const { count: dailyCount } = await supabaseAdmin
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .contains('channels', [channelType])
        .gte('created_at', dayAgo.toISOString())

      if ((dailyCount || 0) >= channel.rateLimits.maxPerDay) {
        return false
      }

      // Check cooldown
      if (channel.rateLimits.cooldownMinutes > 0) {
        const cooldownAgo = new Date(now.getTime() - channel.rateLimits.cooldownMinutes * 60 * 1000)
        
        const { count: recentCount } = await supabaseAdmin
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerId)
          .contains('channels', [channelType])
          .gte('created_at', cooldownAgo.toISOString())

        if ((recentCount || 0) > 0) {
          return false
        }
      }

      return true

    } catch (error) {
      console.error('Rate limit check failed:', error)
      return false
    }
  }

  // Context gathering
  private async getPersonalizationContext(sellerId: string): Promise<PersonalizationContext> {
    try {
      // Get seller info
      const { data: seller, error: sellerError } = await supabaseAdmin
        .from('sellers')
        .select('email, preferences, business_context')
        .eq('id', sellerId)
        .single()

      if (sellerError) {
        throw new Error(`Failed to get seller: ${sellerError.message}`)
      }

      // Get recent performance metrics
      const { data: metrics } = await supabaseAdmin
        .from('sales_data')
        .select('units_sold, revenue')
        .eq('product_id', sellerId) // This would need to be adjusted for proper product association
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      const performanceMetrics = {
        revenue: metrics?.reduce((sum, m) => sum + (m.revenue || 0), 0) || 0,
        units_sold: metrics?.reduce((sum, m) => sum + (m.units_sold || 0), 0) || 0
      }

      // Get communication history
      const { data: history } = await supabaseAdmin
        .from('alerts')
        .select('alert_type, created_at, status')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        sellerId,
        sellerName: seller.email?.split('@')[0] || 'Seller',
        businessContext: seller.business_context || {},
        preferences: seller.preferences || {},
        recentActivity: {},
        performanceMetrics,
        communicationHistory: history || []
      }

    } catch (error) {
      console.error('Failed to get personalization context:', error)
      
      // Return minimal context
      return {
        sellerId,
        sellerName: 'Seller',
        businessContext: {},
        preferences: {},
        recentActivity: {},
        performanceMetrics: {},
        communicationHistory: []
      }
    }
  }

  // Delivery tracking
  private async recordDeliveryAttempt(
    alertId: string,
    channel: string,
    status: string,
    result: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('alert_deliveries')
        .insert({
          alert_id: alertId,
          channel,
          status,
          external_id: result.messageId,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          failure_reason: result.error || null,
          metadata: result
        })
    } catch (error) {
      console.error('Failed to record delivery attempt:', error)
    }
  }

  // Template management
  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        id: 'stockout_warning',
        name: 'Stockout Warning',
        channel: 'email',
        subject: '🚨 Stock Alert: {{product_title}} - {{days_remaining}} days remaining',
        content: `Your product "{{product_title}}" (ASIN: {{asin}}) is running low on inventory.

Current stock: {{current_stock}} units
Daily sales velocity: {{daily_velocity}} units
Estimated stockout: {{days_remaining}} days

Recommended action: Order {{recommended_quantity}} units immediately to avoid stockout.

{{#if supplier_contact}}
Supplier contact: {{supplier_contact}}
{{/if}}

Time is critical - act now to prevent lost sales!`,
        variables: ['product_title', 'asin', 'current_stock', 'daily_velocity', 'days_remaining', 'recommended_quantity', 'supplier_contact'],
        urgency_level: 'critical',
        personalization: {
          tone: 'urgent',
          includeContext: true,
          includeRecommendations: false
        }
      },
      {
        id: 'buybox_lost',
        name: 'Buy Box Lost',
        channel: 'email',
        subject: '⚡ Buy Box Alert: {{product_title}} - Action needed',
        content: `You've lost the Buy Box for "{{product_title}}" (ASIN: {{asin}}).

Current situation:
- Competitor price: $\{{competitor_price}}
- Your price: $\{{current_price}}
- Price gap: $\{{price_gap}}

\{{#if can_compete}}
💡 Recommended action: Lower your price to $\{{recommended_price}} to regain the Buy Box.
Estimated daily impact: +$\{{estimated_impact}}
\{{else}}
⚠️ Cannot compete without violating your margin floor ($\{{margin_floor}}).
Consider other strategies like improving your listing or customer service.
\{{/if}}`,
        variables: ['product_title', 'asin', 'competitor_price', 'current_price', 'price_gap', 'can_compete', 'recommended_price', 'estimated_impact', 'margin_floor'],
        urgency_level: 'high',
        personalization: {
          tone: 'professional',
          includeContext: true,
          includeRecommendations: true
        }
      }
    ]

    for (const template of defaultTemplates) {
      await supabaseAdmin
        .from('alert_templates')
        .insert(template)
    }

    console.log('Created default alert templates')
  }

  // Analytics and monitoring
  async getDeliveryStats(sellerId: string, timeframe: number = 7): Promise<{
    totalAlerts: number
    deliveryRate: number
    openRate: number
    clickRate: number
    channelPerformance: Record<string, any>
    preferredChannels: string[]
  }> {
    try {
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000)

      // Get alerts and deliveries
      const { data: alerts } = await supabaseAdmin
        .from('alerts')
        .select(`
          *,
          alert_deliveries(*)
        `)
        .eq('seller_id', sellerId)
        .gte('created_at', startDate.toISOString())

      if (!alerts) {
        return {
          totalAlerts: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          channelPerformance: {},
          preferredChannels: []
        }
      }

      const totalAlerts = alerts.length
      const deliveries = alerts.flatMap(a => (a as any).alert_deliveries || [])
      
      const deliveredCount = deliveries.filter(d => d.status === 'delivered').length
      const openedCount = deliveries.filter(d => d.opened_at).length
      const clickedCount = deliveries.filter(d => d.clicked_at).length

      const deliveryRate = deliveries.length > 0 ? deliveredCount / deliveries.length : 0
      const openRate = deliveredCount > 0 ? openedCount / deliveredCount : 0
      const clickRate = openedCount > 0 ? clickedCount / openedCount : 0

      // Channel performance
      const channelStats = new Map()
      deliveries.forEach(d => {
        if (!channelStats.has(d.channel)) {
          channelStats.set(d.channel, { sent: 0, delivered: 0, opened: 0, clicked: 0 })
        }
        const stats = channelStats.get(d.channel)
        stats.sent++
        if (d.status === 'delivered') stats.delivered++
        if (d.opened_at) stats.opened++
        if (d.clicked_at) stats.clicked++
      })

      const channelPerformance: Record<string, any> = {}
      for (const [channel, stats] of channelStats.entries()) {
        channelPerformance[channel] = {
          ...stats,
          deliveryRate: stats.sent > 0 ? stats.delivered / stats.sent : 0,
          openRate: stats.delivered > 0 ? stats.opened / stats.delivered : 0,
          clickRate: stats.opened > 0 ? stats.clicked / stats.opened : 0
        }
      }

      // Preferred channels (highest engagement)
      const preferredChannels = Object.entries(channelPerformance)
        .sort(([,a], [,b]) => (b as any).openRate - (a as any).openRate)
        .map(([channel]) => channel)
        .slice(0, 3)

      return {
        totalAlerts,
        deliveryRate,
        openRate,
        clickRate,
        channelPerformance,
        preferredChannels
      }

    } catch (error) {
      console.error('Failed to get delivery stats:', error)
      return {
        totalAlerts: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        channelPerformance: {},
        preferredChannels: []
      }
    }
  }
}

// Global singleton instance
export const communicationEngine = new CommunicationEngine()