import { supabaseAdmin } from '../database/connection'
import { Database } from '../database/types'
import { ComposioToolSet } from 'composio-core'
import { OpenAI } from 'openai'
import { createSPApiService } from '../services/sp-api'
import { NotificationService } from '../utils/notifications'

type Recommendation = Database['public']['Tables']['recommendations']['Insert']
type FactStream = Database['public']['Tables']['fact_stream']['Row']

export class LossPreventionAgent {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  
  private static toolset = new ComposioToolSet({
    apiKey: process.env.COMPOSIO_API_KEY
  })
  
  /**
   * AI-powered analysis with real actions using Composio
   */
  static async analyzeAndRecommend(sellerId: string): Promise<void> {
    console.log(`🛡️ AI Loss Prevention Agent analyzing seller: ${sellerId}`)
    
    try {
      // Get seller data and SP-API service
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single()
      
      if (!seller) throw new Error('Seller not found')
      
      const spApi = await createSPApiService(sellerId)
      if (!spApi) throw new Error('SP-API service unavailable')
      
      // Get available Composio tools  
      const tools = await this.toolset.getTools({
        apps: ['gmail', 'slack', 'twilio', 'amazonsellercentral']
      })
      
      // Run AI analysis with action capabilities
      await this.runAIAnalysis(sellerId, seller, spApi, tools)
      
      console.log(`✅ AI Loss Prevention analysis completed for seller: ${sellerId}`)
    } catch (error) {
      console.error(`❌ AI Loss Prevention analysis failed:`, error)
    }
  }
  
  /**
   * AI-powered analysis with autonomous actions
   */
  private static async runAIAnalysis(
    sellerId: string,
    seller: any,
    spApi: any,
    tools: any[]
  ): Promise<void> {
    // Get current product data
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .limit(10) // Process in batches
    
    if (!products?.length) {
      console.log('No active products found')
      return
    }
    
    // Create AI system prompt
    const systemPrompt = `You are an AI Loss Prevention Agent for Amazon sellers. Your job is to:
    1. Analyze seller data for loss scenarios (stockouts, negative margins, Buy Box loss)
    2. Take IMMEDIATE autonomous actions to prevent losses
    3. Send alerts and notifications when human intervention is needed
    
    Available actions via Composio tools:
    - Send email alerts via Gmail
    - Send Slack notifications to seller's team
    - Send SMS alerts via Twilio for critical issues
    - Update product prices via Amazon Seller Central
    
    Seller Preferences:
    - Risk tolerance: ${seller.risk_tolerance}
    - Auto-execute threshold: ${seller.preferences?.auto_execute_threshold || 0.8}
    - Notification channels: ${JSON.stringify(seller.preferences?.notification_channels)}
    - Working hours: ${JSON.stringify(seller.preferences?.working_hours)}
    
    CRITICAL: For confidence scores above ${seller.preferences?.auto_execute_threshold || 0.8}, take immediate action.
    For lower confidence, send notifications for human approval.`
    
    // Analyze each product with AI
    for (const product of products) {
      const analysisPrompt = `Analyze this product for loss prevention:
      
      Product: ${product.title} (ASIN: ${product.asin})
      Current Price: $${product.current_price}
      Cost Basis: $${product.cost_basis}
      Current Margin: ${product.current_price && product.cost_basis ? (((product.current_price - product.cost_basis) / product.current_price) * 100).toFixed(1) : 'N/A'}%
      Margin Floor: ${product.margin_floor}%
      Stock Level: ${product.stock_level}
      Reserved: ${product.reserved_quantity}
      Velocity (7d): ${product.velocity_7d}
      Velocity (30d): ${product.velocity_30d}
      Buy Box Win Rate: ${product.buy_box_percentage_30d ? (product.buy_box_percentage_30d * 100).toFixed(1) : 'N/A'}%
      
      Check for:
      1. Stockout risk (stock vs velocity)
      2. Negative margins (price vs cost)
      3. Prices below margin floor
      4. Buy Box loss risk
      
      If you find critical issues (confidence > ${seller.preferences?.auto_execute_threshold || 0.8}):
      - Take immediate corrective action
      - Send notification about action taken
      
      If you find potential issues (confidence < ${seller.preferences?.auto_execute_threshold || 0.8}):
      - Send alert for human review
      
      Respond with specific actions to take using the available tools.`
      
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: analysisPrompt }
          ],
          tools: tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: tool.parameters || {}
            }
          })),
          tool_choice: 'auto'
        })
        
        const message = response.choices[0]?.message
        
        if (message?.tool_calls) {
          // Execute AI-recommended actions
          for (const toolCall of message.tool_calls) {
            try {
              console.log(`🤖 AI executing: ${toolCall.function.name} for ${product.asin}`)
              
              const result = await this.toolset.executeAction({
                action: toolCall.function.name,
                params: JSON.parse(toolCall.function.arguments)
              })
              
              console.log(`✅ Action completed:`, result)
              
              // Log the action taken
              await this.logAction(sellerId, product.asin, {
                action: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments),
                result: result,
                confidence: 'AI-executed',
                timestamp: new Date().toISOString()
              })
              
            } catch (error) {
              console.error(`❌ Failed to execute ${toolCall.function.name}:`, error)
            }
          }
        }
        
        // Also create recommendation record for audit trail
        if (message?.content) {
          await this.createAIRecommendation(sellerId, product.asin, {
            analysis: message.content,
            actions_taken: message.tool_calls?.map(tc => tc.function.name) || [],
            confidence: 'AI-generated',
            product_data: product
          })
        }
        
      } catch (error) {
        console.error(`Failed to analyze product ${product.asin}:`, error)
      }
    }
  }

  /**
   * Legacy method - kept for compatibility
   */
  private static async checkStockouts(sellerId: string): Promise<void> {
    console.log('📦 Checking for stockout risks...')
    
    // Get products with low stock relative to sales velocity
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id, asin, title, stock_level, velocity_7d, velocity_30d, 
        lead_time_days, inbound_quantity, reserved_quantity, current_price
      `)
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .gt('velocity_7d', 0) // Only products with sales

    if (!products) return

    for (const product of products) {
      const availableStock = product.stock_level - product.reserved_quantity
      const dailyVelocity = product.velocity_7d / 7
      const daysOfStock = dailyVelocity > 0 ? availableStock / dailyVelocity : 999
      
      // Stockout risk scenarios
      if (daysOfStock <= product.lead_time_days) {
        const severity = daysOfStock <= 3 ? 'critical' : daysOfStock <= 7 ? 'high' : 'medium'
        const urgency = daysOfStock <= 3 ? 'critical' : 'high'
        
        await this.createRecommendation(sellerId, {
          asin: product.asin,
          recommendation_type: 'stockout_prevention',
          title: `Stockout Risk: ${product.title}`,
          description: `Product will stock out in ${Math.ceil(daysOfStock)} days based on current sales velocity. Immediate reorder recommended.`,
          action_required: {
            action: 'reorder_inventory',
            urgency: severity,
            suggested_quantity: Math.ceil(dailyVelocity * (product.lead_time_days + 14)), // 2 weeks buffer
            current_stock: availableStock,
            days_remaining: Math.ceil(daysOfStock)
          },
          predicted_impact: -dailyVelocity * product.current_price * Math.max(0, product.lead_time_days - daysOfStock),
          confidence_score: 0.9,
          risk_level: severity === 'critical' ? 'high' : 'medium',
          urgency_level: urgency,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })

        console.log(`⚠️ Stockout risk detected for ${product.asin}: ${Math.ceil(daysOfStock)} days remaining`)
      }
    }
  }

  /**
   * Check for Buy Box losses
   */
  private static async checkBuyBoxLoss(sellerId: string): Promise<void> {
    console.log('🥇 Checking Buy Box performance...')
    
    // Get products with declining Buy Box percentage
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id, asin, title, current_price, buy_box_percentage_30d,
        last_buy_box_win, velocity_30d
      `)
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .lt('buy_box_percentage_30d', 0.8) // Less than 80% Buy Box win rate

    if (!products) return

    for (const product of products) {
      const buyBoxPercentage = product.buy_box_percentage_30d
      const lastWin = product.last_buy_box_win ? new Date(product.last_buy_box_win) : null
      const daysSinceWin = lastWin ? (Date.now() - lastWin.getTime()) / (1000 * 60 * 60 * 24) : 999
      
      if (buyBoxPercentage < 0.3 || daysSinceWin > 3) {
        // Severe Buy Box loss
        await this.createRecommendation(sellerId, {
          asin: product.asin,
          recommendation_type: 'buybox_recovery',
          title: `Buy Box Lost: ${product.title}`,
          description: `Buy Box win rate has dropped to ${Math.round(buyBoxPercentage * 100)}%. Competitor analysis and pricing adjustment needed.`,
          action_required: {
            action: 'analyze_competition',
            current_win_rate: buyBoxPercentage,
            days_since_win: Math.round(daysSinceWin),
            requires_price_check: true,
            requires_inventory_check: true
          },
          predicted_impact: -product.velocity_30d * product.current_price * (0.8 - buyBoxPercentage),
          confidence_score: 0.85,
          risk_level: 'high',
          urgency_level: 'high',
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
        })

        console.log(`📉 Buy Box loss detected for ${product.asin}: ${Math.round(buyBoxPercentage * 100)}% win rate`)
      }
    }
  }

  /**
   * Check for prices below margin floor
   */
  private static async checkPriceBelowFloor(sellerId: string): Promise<void> {
    console.log('💰 Checking margin floors...')
    
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id, asin, title, current_price, cost_basis, margin_floor,
        target_margin
      `)
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .not('current_price', 'is', null)
      .not('cost_basis', 'is', null)

    if (!products) return

    for (const product of products) {
      const currentMargin = ((product.current_price - product.cost_basis) / product.current_price) * 100
      const marginFloor = product.margin_floor || 0
      
      if (currentMargin < marginFloor) {
        const requiredPrice = product.cost_basis / (1 - marginFloor / 100)
        
        await this.createRecommendation(sellerId, {
          asin: product.asin,
          recommendation_type: 'margin_protection',
          title: `Margin Below Floor: ${product.title}`,
          description: `Current margin of ${currentMargin.toFixed(1)}% is below your floor of ${marginFloor}%. Price increase recommended.`,
          action_required: {
            action: 'increase_price',
            current_price: product.current_price,
            suggested_price: requiredPrice,
            current_margin: currentMargin,
            floor_margin: marginFloor,
            cost_basis: product.cost_basis
          },
          predicted_impact: (requiredPrice - product.current_price) * 30, // Assume 30 units/month
          confidence_score: 0.95,
          risk_level: 'medium',
          urgency_level: 'normal',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
        })

        console.log(`📊 Margin violation for ${product.asin}: ${currentMargin.toFixed(1)}% < ${marginFloor}%`)
      }
    }
  }

  /**
   * Check for negative margins
   */
  private static async checkNegativeMargins(sellerId: string): Promise<void> {
    console.log('🔴 Checking for negative margins...')
    
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id, asin, title, current_price, cost_basis
      `)
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .not('current_price', 'is', null)
      .not('cost_basis', 'is', null)

    if (!products) return

    for (const product of products) {
      if (product.current_price <= product.cost_basis) {
        const lossPerUnit = product.cost_basis - product.current_price
        
        await this.createRecommendation(sellerId, {
          asin: product.asin,
          recommendation_type: 'negative_margin_alert',
          title: `URGENT: Negative Margin - ${product.title}`,
          description: `You're losing $${lossPerUnit.toFixed(2)} per unit. Immediate price adjustment or product review required.`,
          action_required: {
            action: 'emergency_price_fix',
            current_price: product.current_price,
            cost_basis: product.cost_basis,
            loss_per_unit: lossPerUnit,
            minimum_viable_price: product.cost_basis * 1.1 // 10% minimum margin
          },
          predicted_impact: -lossPerUnit * 100, // Assume continued losses
          confidence_score: 1.0,
          risk_level: 'high',
          urgency_level: 'critical',
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
        })

        console.log(`🚨 NEGATIVE MARGIN: ${product.asin} losing $${lossPerUnit.toFixed(2)} per unit`)
      }
    }
  }

  /**
   * Check for unusual sales drops
   */
  private static async checkUnusualSalesDrops(sellerId: string): Promise<void> {
    console.log('📉 Checking for sales anomalies...')
    
    // Get products with recent sales drops
    const { data: salesData } = await supabaseAdmin
      .rpc('get_sales_anomalies', { seller_id: sellerId })

    // This would be a custom PostgreSQL function - for now, simplified version
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        id, asin, title, velocity_7d, velocity_30d, velocity_90d
      `)
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .gt('velocity_30d', 0)

    if (!products) return

    for (const product of products) {
      const recentVelocity = product.velocity_7d
      const baselineVelocity = product.velocity_30d
      const dropPercentage = ((baselineVelocity - recentVelocity) / baselineVelocity) * 100
      
      if (dropPercentage > 50 && recentVelocity < baselineVelocity * 0.5) {
        await this.createRecommendation(sellerId, {
          asin: product.asin,
          recommendation_type: 'sales_anomaly_investigation',
          title: `Sales Drop Alert: ${product.title}`,
          description: `Sales velocity has dropped ${dropPercentage.toFixed(1)}% in the last 7 days. Investigation recommended.`,
          action_required: {
            action: 'investigate_sales_drop',
            drop_percentage: dropPercentage,
            recent_velocity: recentVelocity,
            baseline_velocity: baselineVelocity,
            check_inventory: true,
            check_reviews: true,
            check_competition: true
          },
          predicted_impact: -(baselineVelocity - recentVelocity) * 30, // Lost revenue estimate
          confidence_score: 0.7,
          risk_level: 'medium',
          urgency_level: 'high',
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        })

        console.log(`📉 Sales drop detected for ${product.asin}: ${dropPercentage.toFixed(1)}% decline`)
      }
    }
  }

  /**
   * Process fact stream events for real-time analysis
   */
  static async processFactStreamEvents(sellerId: string): Promise<void> {
    console.log('⚡ Processing real-time events...')
    
    // Get unprocessed events for this agent
    const { data: events } = await supabaseAdmin
      .from('fact_stream')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('processing_status', 'pending')
      .not('processed_by', 'cs', '{"loss_prevention"}')
      .in('event_category', ['inventory', 'pricing', 'competition'])
      .order('importance_score', { ascending: false })
      .limit(50)

    if (!events) return

    for (const event of events) {
      try {
        await this.processEvent(event)
        
        // Mark as processed
        await supabaseAdmin
          .from('fact_stream')
          .update({
            processed_by: [...(event.processed_by || []), 'loss_prevention'],
            processing_status: 'completed'
          })
          .eq('id', event.id)
          
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error)
        
        // Mark as failed and increment retry count
        await supabaseAdmin
          .from('fact_stream')
          .update({
            processing_status: 'failed',
            retry_count: event.retry_count + 1
          })
          .eq('id', event.id)
      }
    }
  }

  /**
   * Process individual fact stream event
   */
  private static async processEvent(event: FactStream): Promise<void> {
    switch (event.event_type) {
      case 'inventory.low_stock':
        await this.handleLowStockEvent(event)
        break
      case 'pricing.competitor_update':
        await this.handleCompetitorPriceEvent(event)
        break
      case 'buybox.lost':
        await this.handleBuyBoxLostEvent(event)
        break
      default:
        console.log(`Unhandled event type: ${event.event_type}`)
    }
  }

  private static async handleLowStockEvent(event: FactStream): Promise<void> {
    const data = event.data as any
    
    // Create immediate stockout recommendation if critical
    if (data.current_stock <= 5) {
      await this.createRecommendation(event.seller_id, {
        asin: event.asin,
        recommendation_type: 'critical_stockout',
        title: `CRITICAL: Only ${data.current_stock} units left`,
        description: 'Immediate reorder required to prevent stockout.',
        action_required: {
          action: 'emergency_reorder',
          current_stock: data.current_stock,
          urgency: 'immediate'
        },
        predicted_impact: -1000, // High impact estimate
        confidence_score: 0.95,
        risk_level: 'high',
        urgency_level: 'critical',
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      })
    }
  }

  private static async handleCompetitorPriceEvent(event: FactStream): Promise<void> {
    const data = event.data as any
    
    // Get current product price
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('current_price, cost_basis, margin_floor')
      .eq('seller_id', event.seller_id)
      .eq('asin', event.asin)
      .single()

    if (product && data.competitor_price < product.current_price * 0.95) {
      // Competitor is significantly cheaper
      await this.createRecommendation(event.seller_id, {
        asin: event.asin,
        recommendation_type: 'competitive_pricing',
        title: 'Competitor Price Alert',
        description: `Competitor is ${((product.current_price - data.competitor_price) / product.current_price * 100).toFixed(1)}% cheaper`,
        action_required: {
          action: 'review_pricing',
          our_price: product.current_price,
          competitor_price: data.competitor_price,
          price_gap: product.current_price - data.competitor_price
        },
        predicted_impact: -500,
        confidence_score: 0.8,
        risk_level: 'medium',
        urgency_level: 'normal',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    }
  }

  private static async handleBuyBoxLostEvent(event: FactStream): Promise<void> {
    // Immediate Buy Box recovery recommendation
    await this.createRecommendation(event.seller_id, {
      asin: event.asin,
      recommendation_type: 'buybox_recovery_urgent',
      title: 'Buy Box Lost - Immediate Action Required',
      description: 'You have lost the Buy Box. Revenue impact imminent.',
      action_required: {
        action: 'recover_buybox',
        check_price: true,
        check_inventory: true,
        check_metrics: true
      },
      predicted_impact: -2000,
      confidence_score: 0.9,
      risk_level: 'high',
      urgency_level: 'critical',
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })
  }

  /**
   * Create recommendation record
   */
  private static async createRecommendation(
    sellerId: string, 
    data: Partial<Recommendation>
  ): Promise<void> {
    const recommendation: Recommendation = {
      seller_id: sellerId,
      asin: data.asin || null,
      marketplace_id: data.marketplace_id || 'ATVPDKIKX0DER',
      agent_type: 'loss_prevention',
      recommendation_type: data.recommendation_type!,
      title: data.title!,
      description: data.description!,
      action_required: data.action_required || {},
      predicted_impact: data.predicted_impact || 0,
      impact_timeframe: data.impact_timeframe || 'short_term',
      confidence_score: data.confidence_score!,
      risk_level: data.risk_level || 'medium',
      urgency_level: data.urgency_level || 'normal',
      reasoning: data.reasoning || {},
      supporting_data: data.supporting_data || {},
      prerequisites: data.prerequisites || [],
      expected_outcome: data.expected_outcome || {},
      rollback_plan: data.rollback_plan || {},
      status: 'pending',
      simulation_results: data.simulation_results || {},
      execution_count: 0,
      expires_at: data.expires_at!,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await supabaseAdmin
      .from('recommendations')
      .insert(recommendation)

    console.log(`💡 Created recommendation: ${data.title}`)
    
    // 🚀 NEW: Send notification after creating recommendation
    await this.sendLossPreventionNotification(sellerId, recommendation)
  }
  
  /**
   * Create AI-generated recommendation with enhanced data
   */
  private static async createAIRecommendation(
    sellerId: string,
    asin: string,
    data: {
      analysis: string
      actions_taken: string[]
      confidence: string
      product_data: any
    }
  ): Promise<void> {
    const recommendation = {
      seller_id: sellerId,
      asin: asin,
      marketplace_id: 'ATVPDKIKX0DER',
      agent_type: 'ai_loss_prevention',
      recommendation_type: 'ai_analysis',
      title: `AI Analysis: ${data.product_data.title}`,
      description: data.analysis,
      action_required: {
        actions_taken: data.actions_taken,
        ai_confidence: data.confidence,
        requires_human_review: data.actions_taken.length === 0
      },
      predicted_impact: 0,
      impact_timeframe: 'immediate',
      confidence_score: 0.9,
      risk_level: 'medium',
      urgency_level: 'normal',
      reasoning: { ai_analysis: true },
      supporting_data: { product_snapshot: data.product_data },
      status: 'completed',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    await supabaseAdmin
      .from('recommendations')
      .insert(recommendation)
  }
  
  /**
   * Log autonomous actions taken by AI
   */
  private static async logAction(
    sellerId: string,
    asin: string,
    actionData: any
  ): Promise<void> {
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: sellerId,
        asin: asin,
        event_type: 'ai.autonomous_action',
        event_category: 'automation',
        data: actionData,
        importance_score: 7,
        requires_action: false,
        processing_status: 'completed',
        processed_by: ['ai_loss_prevention'],
        created_at: new Date().toISOString()
      })
    
    console.log(`📝 Logged AI action for ${asin}: ${actionData.action}`)
  }
  
  /**
   * 🚀 NEW: Send notifications for loss prevention recommendations
   */
  private static async sendLossPreventionNotification(
    sellerId: string,
    recommendation: any
  ): Promise<void> {
    try {
      const urgencyMap = {
        'critical': 'critical' as const,
        'high': 'high' as const,
        'medium': 'normal' as const,
        'normal': 'normal' as const,
        'low': 'low' as const
      }
      
      const urgency = urgencyMap[recommendation.urgency_level] || 'normal'
      
      // Create notification message based on recommendation type
      let message = recommendation.description
      let title = recommendation.title
      
      // Add urgency-specific messaging
      if (urgency === 'critical') {
        title = `🚨 URGENT: ${title}`
        message = `IMMEDIATE ACTION REQUIRED!\n\n${message}\n\nPotential Loss: $${Math.abs(recommendation.predicted_impact || 0).toFixed(2)}\n\nThis expires in: ${this.getTimeUntilExpiry(recommendation.expires_at)}`
      } else if (urgency === 'high') {
        title = `⚠️ HIGH PRIORITY: ${title}`
        message = `${message}\n\nPotential Impact: $${Math.abs(recommendation.predicted_impact || 0).toFixed(2)}`
      }
      
      // Send notification
      await NotificationService.sendNotification({
        sellerId,
        title,
        message,
        urgency,
        link: `${process.env.APP_URL}/dashboard?highlight=${recommendation.asin}`,
        data: {
          asin: recommendation.asin,
          recommendation_type: recommendation.recommendation_type,
          predicted_impact: recommendation.predicted_impact,
          confidence_score: recommendation.confidence_score,
          expires_at: recommendation.expires_at
        }
      })
      
      // For critical stockouts, also log to Google Sheets
      if (recommendation.recommendation_type === 'critical_stockout') {
        await this.logCriticalStockout(sellerId, recommendation)
      }
      
    } catch (error) {
      console.error('Failed to send loss prevention notification:', error)
    }
  }
  
  /**
   * Log critical stockouts to Google Sheets for tracking
   */
  private static async logCriticalStockout(
    sellerId: string,
    recommendation: any
  ): Promise<void> {
    try {
      const toolset = new ComposioToolSet({
        apiKey: process.env.COMPOSIO_API_KEY
      })
      
      await toolset.executeAction({
        action: 'googlesheets_append_row',
        params: {
          spreadsheet_id: process.env.GOOGLE_SHEET_ID, // Add this to .env
          range: 'Critical_Stockouts!A:G',
          values: [
            new Date().toISOString(),
            sellerId,
            recommendation.asin,
            recommendation.title,
            recommendation.predicted_impact,
            recommendation.expires_at,
            'pending'
          ]
        }
      })
      
      console.log(`📈 Logged critical stockout to Google Sheets: ${recommendation.asin}`)
    } catch (error) {
      console.error('Failed to log to Google Sheets:', error)
    }
  }
  
  /**
   * Helper to get human-readable time until expiry
   */
  private static getTimeUntilExpiry(expiresAt: string): string {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'EXPIRED'
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days === 1 ? '' : 's'}`
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min`
    } else {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`
    }
  }
}