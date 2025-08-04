import { EventHandler, XpertSellerEvent } from '../event-bus'
import { EVENT_TYPES, PROCESSING_PRIORITIES } from '../types'
import { supabaseAdmin } from '../../database/connection'

export class RevenueOptimizationEventHandler {
  getHandlers(): EventHandler[] {
    return [
      // Pricing optimization opportunities
      {
        name: 'pricing-optimization',
        pattern: EVENT_TYPES.PRICING.PRICING_OPPORTUNITY,
        priority: PROCESSING_PRIORITIES.HIGH,
        handler: this.handlePricingOptimization.bind(this)
      },

      // Performance monitoring
      {
        name: 'performance-optimization',
        pattern: new RegExp(`(${EVENT_TYPES.PERFORMANCE.CONVERSION_RATE_CHANGE}|${EVENT_TYPES.PERFORMANCE.SESSION_PERCENTAGE_CHANGE})`),
        priority: PROCESSING_PRIORITIES.NORMAL,
        handler: this.handlePerformanceOptimization.bind(this)
      },

      // Advertising opportunities
      {
        name: 'advertising-optimization',
        pattern: new RegExp(`(${EVENT_TYPES.ADVERTISING.KEYWORD_OPPORTUNITY}|${EVENT_TYPES.ADVERTISING.ACOS_THRESHOLD})`),
        priority: PROCESSING_PRIORITIES.NORMAL,
        handler: this.handleAdvertisingOptimization.bind(this)
      }
    ]
  }

  private async handlePricingOptimization(event: XpertSellerEvent): Promise<void> {
    console.log(`Revenue Optimization Agent: Processing pricing opportunity for ${event.asin}`)

    try {
      const currentPrice = event.data.current_price
      const recommendedPrice = event.data.recommended_price
      const expectedImpact = event.data.expected_impact
      const confidence = event.data.confidence

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, title, velocity_30d, margin_floor')
        .eq('seller_id', event.sellerId)
        .eq('asin', event.asin)
        .single()

      if (!product) throw new Error(`Product not found: ${event.asin}`)

      const priceChange = ((recommendedPrice - currentPrice) / currentPrice * 100)
      const dailyImpact = (product.velocity_30d || 1) * (recommendedPrice - currentPrice)

      const recommendation = {
        seller_id: event.sellerId,
        asin: event.asin,
        agent_type: 'revenue_optimization',
        recommendation_type: 'dynamic_pricing',
        title: `💰 Pricing Opportunity - ${product.title}`,
        description: `${priceChange > 0 ? 'Increase' : 'Decrease'} price by ${Math.abs(priceChange).toFixed(1)}% to optimize revenue`,
        action_required: {
          type: 'price_change',
          asin: event.asin,
          current_price: currentPrice,
          recommended_price: recommendedPrice,
          price_change_percentage: priceChange,
          expected_daily_impact: dailyImpact
        },
        predicted_impact: expectedImpact,
        confidence_score: confidence,
        risk_level: Math.abs(priceChange) > 10 ? 'medium' : 'low',
        urgency_level: 'normal',
        reasoning: {
          market_analysis: event.data.market_analysis,
          competitor_prices: event.data.competitor_prices,
          demand_elasticity: event.data.demand_elasticity
        },
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000)
      }

      await supabaseAdmin
        .from('recommendations')
        .insert(recommendation)

    } catch (error) {
      console.error('Failed to handle pricing optimization:', error)
      throw error
    }
  }

  private async handlePerformanceOptimization(event: XpertSellerEvent): Promise<void> {
    console.log(`Revenue Optimization Agent: Processing performance optimization for ${event.asin}`)

    try {
      const metric = event.data.metric
      const currentValue = event.data.current_value
      const previousValue = event.data.previous_value
      const change = ((currentValue - previousValue) / previousValue * 100)

      const recommendationType = 'performance_improvement'
      let title = ''
      let description = ''
      let actions: any = {}

      if (metric === 'conversion_rate') {
        if (change < -10) {
          title = `📉 Conversion Rate Drop - ${event.data.product_title}`
          description = `Conversion rate dropped ${Math.abs(change).toFixed(1)}% from ${previousValue.toFixed(2)}% to ${currentValue.toFixed(2)}%`
          actions = {
            type: 'improve_conversion',
            recommended_actions: [
              'review_main_image',
              'update_bullet_points', 
              'analyze_reviews',
              'check_competitor_listings'
            ]
          }
        }
      } else if (metric === 'session_percentage') {
        if (change < -15) {
          title = `👁️ Session Share Drop - ${event.data.product_title}`
          description = `Session percentage dropped ${Math.abs(change).toFixed(1)}% - losing visibility`
          actions = {
            type: 'improve_visibility',
            recommended_actions: [
              'optimize_keywords',
              'increase_advertising',
              'improve_ranking_factors'
            ]
          }
        }
      }

      if (title) {
        const recommendation = {
          seller_id: event.sellerId,
          asin: event.asin,
          agent_type: 'revenue_optimization',
          recommendation_type: recommendationType,
          title,
          description,
          action_required: actions,
          predicted_impact: Math.abs(change) * 10, // Rough estimate
          confidence_score: 0.7,
          risk_level: 'medium',
          urgency_level: Math.abs(change) > 20 ? 'high' : 'normal',
          reasoning: {
            metric,
            current_value: currentValue,
            previous_value: previousValue,
            change_percentage: change
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }

        await supabaseAdmin
          .from('recommendations')
          .insert(recommendation)
      }

    } catch (error) {
      console.error('Failed to handle performance optimization:', error)
      throw error
    }
  }

  private async handleAdvertisingOptimization(event: XpertSellerEvent): Promise<void> {
    console.log(`Revenue Optimization Agent: Processing advertising optimization for ${event.asin}`)

    try {
      if (event.type === EVENT_TYPES.ADVERTISING.KEYWORD_OPPORTUNITY) {
        const keywords = event.data.keywords
        const estimatedImpact = event.data.estimated_impact

        const recommendation = {
          seller_id: event.sellerId,
          asin: event.asin,
          agent_type: 'revenue_optimization',
          recommendation_type: 'keyword_expansion',
          title: `🔍 Keyword Opportunity - ${event.data.product_title}`,
          description: `Found ${keywords.length} high-potential keywords for advertising expansion`,
          action_required: {
            type: 'add_keywords',
            asin: event.asin,
            keywords: keywords,
            recommended_bids: event.data.recommended_bids,
            match_types: event.data.match_types
          },
          predicted_impact: estimatedImpact,
          confidence_score: 0.75,
          risk_level: 'low',
          urgency_level: 'normal',
          reasoning: {
            keyword_analysis: event.data.keyword_analysis,
            search_volume_data: event.data.search_volumes,
            competition_analysis: event.data.competition_levels
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }

        await supabaseAdmin
          .from('recommendations')
          .insert(recommendation)
      }

    } catch (error) {
      console.error('Failed to handle advertising optimization:', error)
      throw error
    }
  }
}