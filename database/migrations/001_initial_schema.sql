-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Core Authentication & Seller Management
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  amazon_seller_id TEXT UNIQUE NOT NULL,
  marketplace_ids TEXT[] DEFAULT '{}',
  sp_api_credentials JSONB NOT NULL, -- encrypted refresh tokens
  business_context JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{
    "risk_tolerance": 0.5,
    "auto_execute_threshold": 0.8,
    "notification_channels": ["email", "dashboard"],
    "working_hours": {"start": "09:00", "end": "18:00", "timezone": "UTC"},
    "max_daily_spend": 1000,
    "margin_floors": {}
  }',
  risk_tolerance DECIMAL(3,2) DEFAULT 0.5 CHECK (risk_tolerance BETWEEN 0 AND 1),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  monthly_profit_target DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended', 'trial'))
);

-- Product Catalog & Inventory
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  marketplace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  product_group TEXT,
  current_price DECIMAL(10,2),
  list_price DECIMAL(10,2),
  cost_basis DECIMAL(10,2), -- Cost per unit for margin calculations
  margin_floor DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_margin DECIMAL(10,2),
  min_price DECIMAL(10,2), -- Absolute minimum price
  max_price DECIMAL(10,2), -- Maximum price for repricing
  stock_level INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  inbound_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (stock_level - reserved_quantity) STORED,
  velocity_7d DECIMAL(8,2) DEFAULT 0,
  velocity_30d DECIMAL(8,2) DEFAULT 0,
  velocity_90d DECIMAL(8,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 14,
  reorder_point INTEGER DEFAULT 0,
  max_inventory INTEGER,
  supplier_info JSONB DEFAULT '{}',
  product_dimensions JSONB DEFAULT '{}',
  weight DECIMAL(8,3),
  is_fba BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_buy_box_win TIMESTAMPTZ,
  buy_box_percentage_30d DECIMAL(5,4) DEFAULT 0,
  session_percentage_30d DECIMAL(5,4) DEFAULT 0,
  conversion_rate_30d DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, marketplace_id)
);

-- Sales & Performance Data
CREATE TABLE sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  units_sold INTEGER DEFAULT 0,
  units_ordered INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  buy_box_percentage DECIMAL(5,4) DEFAULT 0,
  organic_rank INTEGER,
  sponsored_rank INTEGER,
  total_advertising_cost DECIMAL(10,2) DEFAULT 0,
  advertising_sales DECIMAL(12,2) DEFAULT 0,
  tacos DECIMAL(5,4), -- Total Advertising Cost of Sales
  roas DECIMAL(8,2), -- Return on Ad Spend
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, date)
);

-- Advertising & Campaign Data
CREATE TABLE advertising_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('sponsored_products', 'sponsored_brands', 'sponsored_display')),
  ad_group_id TEXT,
  ad_group_name TEXT,
  keyword_id TEXT,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  ctr DECIMAL(5,4), -- Click-through rate
  acos DECIMAL(5,4), -- Advertising Cost of Sales
  cpc DECIMAL(8,2), -- Cost per click
  cpm DECIMAL(8,2), -- Cost per thousand impressions
  keywords JSONB DEFAULT '[]',
  targeting_type TEXT CHECK (targeting_type IN ('manual', 'auto')),
  match_type TEXT CHECK (match_type IN ('exact', 'phrase', 'broad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, campaign_id, ad_group_id, keyword_id, date)
);

-- Event-Driven Architecture - Fact Stream
CREATE TABLE fact_stream (
  id BIGSERIAL PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT,
  marketplace_id TEXT,
  event_type TEXT NOT NULL, 
  event_category TEXT NOT NULL CHECK (event_category IN ('inventory', 'pricing', 'competition', 'reviews', 'advertising', 'performance')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  processed_by TEXT[] DEFAULT '{}',
  correlation_id UUID DEFAULT gen_random_uuid(),
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  requires_action BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Agent Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT,
  marketplace_id TEXT,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('loss_prevention', 'revenue_optimization', 'strategic_intelligence', 'meta_agent')),
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_required JSONB NOT NULL DEFAULT '{}',
  predicted_impact DECIMAL(10,2),
  impact_timeframe TEXT DEFAULT 'short_term' CHECK (impact_timeframe IN ('immediate', 'short_term', 'medium_term', 'long_term')),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'critical')),
  reasoning JSONB DEFAULT '{}',
  supporting_data JSONB DEFAULT '{}',
  prerequisites JSONB DEFAULT '[]',
  expected_outcome JSONB DEFAULT '{}',
  rollback_plan JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired', 'executed', 'simulated')),
  simulation_results JSONB DEFAULT '{}',
  execution_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intelligence Cache for AI Agents
CREATE TABLE intelligence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('pattern', 'correlation', 'prediction', 'insight', 'model_state')),
  domain TEXT CHECK (domain IN ('inventory', 'pricing', 'competition', 'advertising', 'reviews', 'cross_domain')),
  data JSONB NOT NULL DEFAULT '{}',
  embeddings VECTOR(1536), -- pgvector for semantic search
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  usage_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_refresh BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Actions & Executions
CREATE TABLE automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('price_change', 'bid_adjustment', 'inventory_order', 'listing_update', 'campaign_create', 'keyword_add')),
  action_data JSONB NOT NULL DEFAULT '{}',
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'approved', 'executing', 'completed', 'failed', 'rolled_back', 'cancelled')),
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES sellers(id),
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sp_api_request JSONB DEFAULT '{}',
  sp_api_response JSONB DEFAULT '{}',
  error_details JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication & Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'important', 'informational', 'success')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'dashboard', 'sms', 'push')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  related_recommendation_id UUID REFERENCES recommendations(id),
  related_asin TEXT,
  send_after TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'expired')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);