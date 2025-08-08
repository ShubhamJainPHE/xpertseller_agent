-- ============================================
-- COMPREHENSIVE DATABASE SCHEMA FOR ALL 20 TABLES
-- India Amazon Seller Dashboard
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products ✅ (already exists)
-- No changes needed

-- 2. Orders ✅ (already exists)  
-- No changes needed

-- 3. Order Items ✅ (already exists)
-- No changes needed

-- 4. Sales Data ✅ (already exists)
-- No changes needed

-- 5. Inventory Levels
CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  sku TEXT,
  marketplace_id TEXT DEFAULT 'A21TJRUUN4KGV',
  total_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  inbound_quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, sku, marketplace_id)
);

-- 6. Financial Events
CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  event_group_id TEXT,
  event_type TEXT NOT NULL,
  posted_date TIMESTAMPTZ,
  amount DECIMAL(12,2),
  currency_code TEXT DEFAULT 'INR',
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Pricing History  
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  date DATE NOT NULL,
  our_price DECIMAL(10,2),
  competitor_min_price DECIMAL(10,2),
  competitor_avg_price DECIMAL(10,2),
  competitor_max_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- 8. Competitor Data
CREATE TABLE IF NOT EXISTS competitor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  competitor_seller_id TEXT,
  competitor_price DECIMAL(10,2),
  competitor_rating DECIMAL(3,2),
  competitor_review_count INTEGER,
  fulfillment_type TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Returns & Refunds
CREATE TABLE IF NOT EXISTS returns_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amazon_order_id TEXT NOT NULL,
  asin TEXT,
  return_reason TEXT,
  return_quantity INTEGER DEFAULT 1,
  refund_amount DECIMAL(10,2),
  return_date TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Customer Metrics
CREATE TABLE IF NOT EXISTS customer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  customer_lifetime_value DECIMAL(12,2),
  avg_order_value DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, date)
);

-- 11. FBA Inventory (update existing)
ALTER TABLE fba_inventory ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 12. Shipments Inbound
CREATE TABLE IF NOT EXISTS shipments_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  shipment_id TEXT NOT NULL,
  shipment_name TEXT,
  destination_center TEXT,
  shipment_status TEXT,
  total_units INTEGER DEFAULT 0,
  shipped_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, shipment_id)
);

-- 13. Fees Breakdown
CREATE TABLE IF NOT EXISTS fees_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  fee_type TEXT NOT NULL,
  fee_amount DECIMAL(10,2),
  currency_code TEXT DEFAULT 'INR',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Advertising Spend
CREATE TABLE IF NOT EXISTS advertising_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  campaign_id TEXT,
  campaign_name TEXT,
  asin TEXT,
  date DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  acos DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Reviews & Ratings
CREATE TABLE IF NOT EXISTS reviews_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  review_id TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  reviewer_name TEXT,
  review_date TIMESTAMPTZ,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Profit Margins
CREATE TABLE IF NOT EXISTS profit_margins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  revenue_per_unit DECIMAL(10,2),
  cost_per_unit DECIMAL(10,2),
  profit_per_unit DECIMAL(10,2),
  profit_margin_percent DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- 17. Velocity Trends
CREATE TABLE IF NOT EXISTS velocity_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  velocity_7d DECIMAL(10,2),
  velocity_30d DECIMAL(10,2),
  velocity_90d DECIMAL(10,2),
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- 18. Seasonal Patterns
CREATE TABLE IF NOT EXISTS seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  seasonal_factor DECIMAL(5,2),
  peak_season BOOLEAN DEFAULT FALSE,
  avg_monthly_sales DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, month)
);

-- 19. Market Share
CREATE TABLE IF NOT EXISTS market_share (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  category TEXT,
  our_rank INTEGER,
  total_competitors INTEGER,
  market_share_percent DECIMAL(5,2),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- 20. Forecasting Data
CREATE TABLE IF NOT EXISTS forecasting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_sales INTEGER,
  predicted_revenue DECIMAL(12,2),
  confidence_level DECIMAL(3,2),
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, forecast_date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_inventory_levels_seller_asin ON inventory_levels(seller_id, asin);
CREATE INDEX IF NOT EXISTS idx_financial_events_seller_date ON financial_events(seller_id, posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_seller_asin_date ON pricing_history(seller_id, asin, date DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_data_asin ON competitor_data(asin);
CREATE INDEX IF NOT EXISTS idx_returns_refunds_order ON returns_refunds(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_seller_date ON customer_metrics(seller_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_inbound_status ON shipments_inbound(shipment_status);
CREATE INDEX IF NOT EXISTS idx_fees_breakdown_asin_date ON fees_breakdown(asin, date DESC);
CREATE INDEX IF NOT EXISTS idx_advertising_spend_date ON advertising_spend(seller_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_ratings_asin_date ON reviews_ratings(asin, review_date DESC);
CREATE INDEX IF NOT EXISTS idx_profit_margins_seller_date ON profit_margins(seller_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_velocity_trends_asin_date ON velocity_trends(asin, date DESC);
CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_asin_month ON seasonal_patterns(asin, month);
CREATE INDEX IF NOT EXISTS idx_market_share_seller_date ON market_share(seller_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_forecasting_data_asin_forecast_date ON forecasting_data(asin, forecast_date);

-- ============================================
-- SUCCESS CONFIRMATION
-- ============================================

-- Log table creation success
INSERT INTO fact_stream (
  seller_id, 
  event_type, 
  event_category, 
  data,
  importance_score
) 
SELECT 
  id as seller_id,
  'database.tables_created' as event_type,
  'system' as event_category,
  jsonb_build_object(
    'message', 'All 20 tables created successfully',
    'tables', array[
      'products', 'orders', 'order_items', 'sales_data', 'inventory_levels',
      'financial_events', 'pricing_history', 'competitor_data', 'returns_refunds',
      'customer_metrics', 'fba_inventory', 'shipments_inbound', 'fees_breakdown',
      'advertising_spend', 'reviews_ratings', 'profit_margins', 'velocity_trends',
      'seasonal_patterns', 'market_share', 'forecasting_data'
    ],
    'indexes_created', 15,
    'timestamp', NOW()
  ) as data,
  9 as importance_score
FROM sellers 
WHERE amazon_seller_id = 'A14IOOJN7DLJME'
ON CONFLICT DO NOTHING;