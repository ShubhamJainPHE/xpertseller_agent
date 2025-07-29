// Event type constants for consistency
export const EVENT_TYPES = {
    // Inventory Events
    INVENTORY: {
      UPDATED: 'inventory.updated',
      LOW_STOCK: 'inventory.low_stock',
      STOCKOUT: 'inventory.stockout',
      STOCKOUT_PREDICTED: 'inventory.stockout_predicted',
      RESTOCK_NEEDED: 'inventory.restock_needed',
      INBOUND_RECEIVED: 'inventory.inbound_received'
    },
  
    // Pricing Events
    PRICING: {
      BUY_BOX_WON: 'pricing.buy_box_won',
      BUY_BOX_LOST: 'pricing.buy_box_lost',
      PRICE_CHANGED: 'pricing.price_changed',
      COMPETITOR_PRICE_DROP: 'pricing.competitor_price_drop',
      MARGIN_BELOW_FLOOR: 'pricing.margin_below_floor',
      PRICING_OPPORTUNITY: 'pricing.opportunity_detected'
    },
  
    // Competition Events
    COMPETITION: {
      NEW_COMPETITOR: 'competition.new_competitor',
      COMPETITOR_STOCKOUT: 'competition.competitor_stockout',
      COMPETITOR_REVIEW_SURGE: 'competition.review_surge',
      MARKET_SHARE_CHANGE: 'competition.market_share_change',
      RANKING_CHANGE: 'competition.ranking_change'
    },
  
    // Review Events
    REVIEWS: {
      NEW_REVIEW: 'reviews.new_review',
      NEGATIVE_REVIEW: 'reviews.negative_review',
      REVIEW_RESPONSE_NEEDED: 'reviews.response_needed',
      RATING_DROPPED: 'reviews.rating_dropped',
      REVIEW_SENTIMENT_CHANGE: 'reviews.sentiment_change'
    },
  
    // Performance Events
    PERFORMANCE: {
      SALES_SPIKE: 'performance.sales_spike',
      SALES_DROP: 'performance.sales_drop',
      CONVERSION_RATE_CHANGE: 'performance.conversion_rate_change',
      SESSION_PERCENTAGE_CHANGE: 'performance.session_percentage_change',
      VELOCITY_CHANGE: 'performance.velocity_change'
    },
  
    // Advertising Events
    ADVERTISING: {
      CAMPAIGN_PERFORMANCE: 'advertising.campaign_performance',
      KEYWORD_OPPORTUNITY: 'advertising.keyword_opportunity',
      ACOS_THRESHOLD: 'advertising.acos_threshold',
      BID_ADJUSTMENT_NEEDED: 'advertising.bid_adjustment_needed',
      BUDGET_EXHAUSTED: 'advertising.budget_exhausted'
    }
  } as const
  
  // Event importance levels
  export const IMPORTANCE_LEVELS = {
    CRITICAL: 10,
    HIGH: 8,
    MEDIUM: 5,
    LOW: 3,
    INFO: 1
  } as const
  
  // Event processing priorities
  export const PROCESSING_PRIORITIES = {
    IMMEDIATE: 100,
    HIGH: 80,
    NORMAL: 50,
    LOW: 20,
    BACKGROUND: 10
  } as const