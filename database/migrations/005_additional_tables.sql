-- Additional Tables for Complete Amazon Seller Intelligence

-- Market Intelligence & Competitor Tracking
CREATE TABLE market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  marketplace_id TEXT NOT NULL,
  date DATE NOT NULL,
  best_seller_rank INTEGER,
  bsr_category TEXT,
  estimated_monthly_sales INTEGER,
  estimated_monthly_revenue DECIMAL(12,2),
  review_rating DECIMAL(3,2),
  review_count INTEGER,
  price DECIMAL(10,2),
  availability_status TEXT,
  buy_box_winner TEXT,
  competitor_count INTEGER,
  market_share_estimate DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, marketplace_id, date)
);

-- Competitor Products for Benchmarking
CREATE TABLE competitor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  competitor_asin TEXT NOT NULL,
  competitor_brand TEXT,
  competitor_seller_name TEXT,
  your_competing_asin TEXT,
  category TEXT,
  price DECIMAL(10,2),
  rating DECIMAL(3,2),
  review_count INTEGER,
  bsr INTEGER,
  estimated_monthly_sales INTEGER,
  features JSONB DEFAULT '{}',
  strengths TEXT[],
  weaknesses TEXT[],
  competitive_advantage TEXT,
  threat_level TEXT CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  last_analyzed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, competitor_asin, your_competing_asin)
);

-- Keyword Performance & SEO
CREATE TABLE keyword_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  keyword TEXT NOT NULL,
  date DATE NOT NULL,
  organic_rank INTEGER,
  sponsored_rank INTEGER,
  search_volume INTEGER,
  search_frequency_rank INTEGER,
  click_share DECIMAL(5,4),
  conversion_share DECIMAL(5,4),
  relevance_score DECIMAL(3,2),
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),
  cpc_estimate DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, keyword, date)
);

-- Review Analytics & Sentiment
CREATE TABLE review_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  date DATE NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  rating_5_star INTEGER DEFAULT 0,
  rating_4_star INTEGER DEFAULT 0,
  rating_3_star INTEGER DEFAULT 0,
  rating_2_star INTEGER DEFAULT 0,
  rating_1_star INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  sentiment_score DECIMAL(3,2), -- -1 to 1
  review_velocity_30d INTEGER DEFAULT 0,
  positive_keywords TEXT[],
  negative_keywords TEXT[],
  top_complaints TEXT[],
  top_praises TEXT[],
  review_authenticity_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- FBA Inventory Management
CREATE TABLE fba_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  sku TEXT NOT NULL,
  fnsku TEXT,
  marketplace_id TEXT NOT NULL,
  fulfillment_center_id TEXT,
  total_quantity INTEGER DEFAULT 0,
  sellable_quantity INTEGER DEFAULT 0,
  unsellable_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  inbound_working_quantity INTEGER DEFAULT 0,
  inbound_shipped_quantity INTEGER DEFAULT 0,
  inbound_receiving_quantity INTEGER DEFAULT 0,
  per_unit_volume DECIMAL(10,6),
  total_volume DECIMAL(10,2),
  days_of_supply INTEGER,
  restock_recommendation TEXT,
  storage_fees DECIMAL(10,2),
  long_term_storage_fees DECIMAL(10,2),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, sku, marketplace_id)
);

-- Financial Performance & P&L
CREATE TABLE financial_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  date DATE NOT NULL,
  gross_sales DECIMAL(12,2) DEFAULT 0,
  returns DECIMAL(12,2) DEFAULT 0,
  net_sales DECIMAL(12,2) DEFAULT 0,
  amazon_fees DECIMAL(12,2) DEFAULT 0,
  referral_fees DECIMAL(12,2) DEFAULT 0,
  fba_fees DECIMAL(12,2) DEFAULT 0,
  storage_fees DECIMAL(12,2) DEFAULT 0,
  advertising_costs DECIMAL(12,2) DEFAULT 0,
  cost_of_goods_sold DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,
  profit_margin DECIMAL(5,4) DEFAULT 0,
  roi DECIMAL(5,4) DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  profit_per_unit DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, date)
);

-- Category Trends & Market Data
CREATE TABLE category_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  date DATE NOT NULL,
  total_products INTEGER,
  new_products_30d INTEGER,
  avg_price DECIMAL(10,2),
  median_price DECIMAL(10,2),
  price_trend_30d DECIMAL(5,4), -- percentage change
  sales_volume_index INTEGER DEFAULT 100, -- normalized to 100
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),
  market_growth_rate DECIMAL(5,4),
  top_brands JSONB DEFAULT '[]',
  trending_keywords TEXT[],
  seasonal_factor DECIMAL(3,2) DEFAULT 1.0,
  opportunity_score INTEGER CHECK (opportunity_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, subcategory, date)
);

-- Business Intelligence Aggregates
CREATE TABLE business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')) DEFAULT 'daily',
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  total_units_sold INTEGER DEFAULT 0,
  avg_selling_price DECIMAL(10,2) DEFAULT 0,
  avg_profit_margin DECIMAL(5,4) DEFAULT 0,
  total_advertising_spend DECIMAL(12,2) DEFAULT 0,
  advertising_roas DECIMAL(8,2) DEFAULT 0,
  active_products INTEGER DEFAULT 0,
  products_with_buy_box INTEGER DEFAULT 0,
  avg_bsr DECIMAL(10,2),
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  overall_conversion_rate DECIMAL(5,4) DEFAULT 0,
  inventory_value DECIMAL(12,2) DEFAULT 0,
  days_of_inventory_avg INTEGER,
  stranded_inventory_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, date, period_type)
);

-- Product Launch Tracking
CREATE TABLE product_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  launch_date DATE NOT NULL,
  launch_strategy TEXT,
  target_bsr INTEGER,
  target_daily_sales INTEGER,
  launch_budget DECIMAL(10,2),
  honeymoon_period_days INTEGER DEFAULT 30,
  current_phase TEXT CHECK (current_phase IN ('pre_launch', 'honeymoon', 'growth', 'mature', 'decline')),
  days_since_launch INTEGER,
  initial_reviews_target INTEGER,
  current_reviews INTEGER,
  launch_success_score INTEGER CHECK (launch_success_score BETWEEN 1 AND 10),
  key_milestones JSONB DEFAULT '[]',
  challenges_faced TEXT[],
  lessons_learned TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin)
);

-- Create indexes for performance
CREATE INDEX idx_market_intelligence_seller_date ON market_intelligence(seller_id, date DESC);
CREATE INDEX idx_competitor_products_seller ON competitor_products(seller_id, threat_level);
CREATE INDEX idx_keyword_performance_asin_date ON keyword_performance(asin, date DESC);
CREATE INDEX idx_review_analytics_asin_date ON review_analytics(asin, date DESC);
CREATE INDEX idx_fba_inventory_seller_asin ON fba_inventory(seller_id, asin);
CREATE INDEX idx_financial_performance_seller_date ON financial_performance(seller_id, date DESC);
CREATE INDEX idx_category_trends_category_date ON category_trends(category, date DESC);
CREATE INDEX idx_business_metrics_seller_period ON business_metrics(seller_id, period_type, date DESC);
CREATE INDEX idx_fact_stream_seller_timestamp ON fact_stream(seller_id, timestamp DESC);
CREATE INDEX idx_fact_stream_category_timestamp ON fact_stream(event_category, timestamp DESC);

-- Add some useful views
CREATE VIEW seller_dashboard_summary AS
SELECT 
  s.id as seller_id,
  s.email,
  s.business_context->>'business_name' as business_name,
  COUNT(DISTINCT p.asin) as total_products,
  COALESCE(SUM(fp.net_profit), 0) as monthly_profit,
  COALESCE(SUM(fp.net_sales), 0) as monthly_revenue,
  COALESCE(AVG(fp.profit_margin), 0) as avg_profit_margin,
  COUNT(DISTINCT CASE WHEN p.stock_level <= p.reorder_point THEN p.asin END) as low_stock_products,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending' AND r.urgency_level IN ('high', 'critical')) as urgent_recommendations
FROM sellers s
LEFT JOIN products p ON s.id = p.seller_id AND p.is_active = true
LEFT JOIN financial_performance fp ON p.asin = fp.asin AND fp.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN recommendations r ON s.id = r.seller_id AND r.status = 'pending'
GROUP BY s.id, s.email, s.business_context->>'business_name';