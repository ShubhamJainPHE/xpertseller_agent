import { EventHandler, XpertSellerEvent } from '../event-bus'
import { EVENT_TYPES, IMPORTANCE_LEVELS, PROCESSING_PRIORITIES } from '../types'
import { supabaseAdmin } from '../../database/connection'

export class LossPreventionEventHandler {
  getHandlers(): EventHandler[] {
    return [
      // Critical inventory alerts
      {
        name: 'stockout-prevention',
        pattern: new RegExp(`(${EVENT_TYPES.INVENTORY.LOW_STOCK}|${EVENT_TYPES.INVENTORY.STOCKOUT}|${EVENT_TYPES.INVENTORY.STOCKOUT_PREDICTED})`),
        priority: PROCESSING_PRIORITIES.IMMEDIATE,
        handler: this.handleStockoutPrevention.bind(this),
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          exponential: true
        }
      },

      // Buy Box monitoring
      {
        name: 'buy-box-recovery',
        pattern: EVENT_TYPES.PRICING.BUY_BOX_LOST,
        priority: PROCESSING_PRIORITIES.HIGH,
        handler: this.handleBuyBoxLoss.bind(this),
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 2000,
          exponential: false
        }
      },

      // Margin protection
      {
        name: 'margin-protection',
        pattern: EVENT_TYPES.PRICING.MARGIN_BELOW_FLOOR,
        priority: PROCESSING_PRIORITIES.HIGH,
        handler: this.handleMarginViolation.bind(this)
      },

      // Competitor advantage alerts
      {
        name: 'competitor-threat',
        pattern: new RegExp(`(${EVENT_TYPES.COMPETITION.COMPETITOR_STOCKOUT}|${EVENT_TYPES.PRICING.COMPETITOR_PRICE_DROP})`),
        priority: PROCESSING_PRIORITIES.NORMAL,
        handler: this.handleCompetitorThreat.bind(this)
      }
    ]
  }

  private async handleStockoutPrevention(event: XpertSellerEvent): Promise<void> {
    console.log(`Loss Prevention Agent: Processing stockout prevention for ${event.asin}`)

    try {
      // Get product details
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(`
          id, asin, title, stock_level, velocity_7d, velocity_30d, 
          reorder_point, lead_time_days, supplier_info
        `)
        .eq('seller_id', event.sellerId)
        .eq('asin', event.asin)
        .single()

      if (error || !product) {
        throw new Error(`Product not found: ${event.asin}`)
      }

      const stockLevel = event.data.available_quantity || product.stock_level
      const velocity = product.velocity_7d || 0
      const daysUntilStockout = velocity > 0 ? stockLevel / velocity : 999

      let urgencyLevel: 'critical' | 'high' | 'medium' = 'medium'
      let recommendedAction = ''
      let predictedImpact = 0

      if (stockLevel === 0) {
        urgencyLevel = 'critical'
        recommendedAction = 'Immediate restocking required - sales currently blocked'
        predictedImpact = -500 * velocity // Lost daily sales
      } else if (daysUntilStockout <= 3) {
        urgencyLevel = 'critical'
        recommendedAction = `Urgent: Stock will run out in ${Math.round(daysUntilStockout)} days`
        predictedImpact = -200 * velocity
      } else if (daysUntilStockout <= 7) {
        urgencyLevel = 'high'
        recommendedAction = `Restock needed: ${Math.round(daysUntilStockout)} days of inventory remaining`
        predictedImpact = -100 * velocity
      }

      // Create recommendation
      const recommendation = {
        seller_id: event.sellerId,
        asin: event.asin,
        agent_type: 'loss_prevention',
        recommendation_type: 'inventory_restock',
        title: `${urgencyLevel === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}: Low Stock Alert - ${product.title}`,
        description: `${recommendedAction}. Current stock: ${stockLevel} units, Daily velocity: ${velocity.toFixed(1)} units`,
        action_required: {
          type: 'restock_inventory',
          asin: event.asin,
          recommended_quantity: Math.max(product.reorder_point * 2, velocity * 30),
          urgency: urgencyLevel,
          supplier_contact: product.supplier_info
        },
        predicted_impact: predictedImpact,
        confidence_score: daysUntilStockout <= 7 ? 0.95 : 0.85,
        risk_level: urgencyLevel === 'critical' ? 'high' : 'medium',
        urgency_level: urgencyLevel,
        reasoning: {
          current_stock: stockLevel,
          daily_velocity: velocity,
          days_until_stockout: Math.round(daysUntilStockout),
          lead_time: product.lead_time_days,
          reorder_point: product.reorder_point
        },
        expires_at: new Date(Date.now() + (urgencyLevel === 'critical' ? 2 : 7) * 24 * 60 * 60 * 1000)
      }

      await supabaseAdmin
        .from('recommendations')
        .insert(recommendation)

      console.log(`Created stockout prevention recommendation for ${event.asin}`)

    } catch (error) {
      console.error('Failed to handle stockout prevention:', error)
      throw error
    }
  }

  private async handleBuyBoxLoss(event: XpertSellerEvent): Promise<void> {
    console.log(`Loss Prevention Agent: Processing Buy Box loss for ${event.asin}`)

    try {
      const buyBoxPrice = event.data.buy_box_price
      const currentPrice = event.data.current_price
      const competitorCount = event.data.competitor_count || 0

      // Get product margin constraints
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, title, margin_floor, target_margin, current_price')
        .eq('seller_id', event.sellerId)
        .eq('asin', event.asin)
        .single()

      if (!product) throw new Error(`Product not found: ${event.asin}`)

      const priceGap = currentPrice - buyBoxPrice
      const canCompete = buyBoxPrice >= product.margin_floor

      let recommendedAction = ''
      let newPrice = currentPrice
      let confidence = 0.5

      if (canCompete) {
        newPrice = Math.max(buyBoxPrice - 0.01, product.margin_floor)
        recommendedAction = `Lower price to $${newPrice.toFixed(2)} to recover Buy Box`
        confidence = 0.9
      } else {
        recommendedAction = `Cannot compete for Buy Box without violating margin floor ($${product.margin_floor})`
        confidence = 0.3
      }

      const recommendation = {
        seller_id: event.sellerId,
        asin: event.asin,
        agent_type: 'loss_prevention',
        recommendation_type: 'buy_box_recovery',
        title: `🏆 Buy Box Lost - ${product.title}`,
        description: `Lost Buy Box to competitor at $${buyBoxPrice}. ${recommendedAction}`,
        action_required: {
          type: 'price_change',
          asin: event.asin,
          current_price: currentPrice,
          recommended_price: newPrice,
          can_compete: canCompete,
          margin_impact: ((newPrice - product.margin_floor) / newPrice * 100).toFixed(1)
        },
        predicted_impact: canCompete ? 150 : -300, // Estimated daily impact
        confidence_score: confidence,
        risk_level: canCompete ? 'low' : 'high',
        urgency_level: 'high',
        reasoning: {
          buy_box_price: buyBoxPrice,
          current_price: currentPrice,
          price_gap: priceGap,
          competitor_count: competitorCount,
          margin_floor: product.margin_floor,
          can_compete: canCompete
        },
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
      }

      await supabaseAdmin
        .from('recommendations')
        .insert(recommendation)

      console.log(`Created Buy Box recovery recommendation for ${event.asin}`)

    } catch (error) {
      console.error('Failed to handle Buy Box loss:', error)
      throw error
    }
  }

  private async handleMarginViolation(event: XpertSellerEvent): Promise<void> {
    console.log(`Loss Prevention Agent: Processing margin violation for ${event.asin}`)

    try {
      const currentPrice = event.data.current_price
      const marginFloor = event.data.margin_floor
      const actualMargin = event.data.actual_margin

      const recommendation = {
        seller_id: event.sellerId,
        asin: event.asin,
        agent_type: 'loss_prevention',
        recommendation_type: 'margin_protection',
        title: `💰 Margin Floor Violation - ${event.data.product_title}`,
        description: `Current price ($${currentPrice}) results in ${actualMargin}% margin, below your ${marginFloor}% floor`,
        action_required: {
          type: 'price_increase',
          asin: event.asin,
          current_price: currentPrice,
          minimum_price: event.data.minimum_viable_price,
          reason: 'margin_floor_protection'
        },
        predicted_impact: -50, // Potential lost sales
        confidence_score: 0.95,
        risk_level: 'high',
        urgency_level: 'high',
        reasoning: {
          current_margin: actualMargin,
          margin_floor: marginFloor,
          violation_amount: marginFloor - actualMargin
        },
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      }

      await supabaseAdmin
        .from('recommendations')
        .insert(recommendation)

    } catch (error) {
      console.error('Failed to handle margin violation:', error)
      throw error
    }
  }

  private async handleCompetitorThreat(event: XpertSellerEvent): Promise<void> {
    console.log(`Loss Prevention Agent: Processing competitor threat for ${event.asin}`)

    try {
      if (event.type === EVENT_TYPES.COMPETITION.COMPETITOR_STOCKOUT) {
        // Competitor is out of stock - opportunity to capture market share
        const recommendation = {
          seller_id: event.sellerId,
          asin: event.asin,
          agent_type: 'loss_prevention',
          recommendation_type: 'competitor_opportunity',
          title: `🎯 Competitor Stockout Opportunity - ${event.data.product_title}`,
          description: `Key competitor is out of stock. Consider increasing visibility or adjusting pricing.`,
          action_required: {
            type: 'capitalize_on_stockout',
            competitor_asin: event.data.competitor_asin,
            actions: ['increase_advertising', 'optimize_listing', 'monitor_closely']
          },
          predicted_impact: 200,
          confidence_score: 0.75,
          risk_level: 'low',
          urgency_level: 'normal',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }

        await supabaseAdmin
          .from('recommendations')
          .insert(recommendation)
      }

    } catch (error) {
      console.error('Failed to handle competitor threat:', error)
      throw error
    }
  }
}