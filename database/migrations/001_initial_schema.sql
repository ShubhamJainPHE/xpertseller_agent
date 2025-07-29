-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Core Authentication & Seller Management
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  amazon_seller_id TEXT UNIQUE NOT NULL,
  marketplace_ids TEXT[] DEFAULT '{}',
  sp_api_credentials JSONB NOT NULL, -- encrypted refresh tokens
  business_context JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{
    "alert_channels": ["email", "dashboard"],
    "risk_tolerance": 0.5,
    "auto_execute_low_risk": false,
    "preferred_communication_hours": {"start": 9, "end": 17, "timezone": "UTC"},
    "minimum_impact_threshold": 10.00
  }'::jsonb,
  risk_tolerance DECIMAL(3,2) DEFAULT 0.5 CHECK (risk_tolerance BETWEEN 0 AND 1),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'paused', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  
  -- Constraint to ensure valid email format
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Product Catalog & Inventory Management
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  marketplace_id TEXT NOT NULL,
  parent_asin TEXT, -- For variations
  sku TEXT,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  current_price DECIMAL(10,2),
  cost_price DECIMAL(10,2), -- Seller's cost
  margin_floor DECIMAL(10,2) NOT NULL,
  target_margin DECIMAL(10,2),
  max_price DECIMAL(10,2), -- Price ceiling
  min_price DECIMAL(10,2), -- Price floor
  
  -- Inventory tracking
  stock_level INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  inbound_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (stock_level - reserved_quantity) STORED,
  
  -- Velocity and forecasting
  velocity_7d DECIMAL(8,2) DEFAULT 0,
  velocity_30d DECIMAL(8,2) DEFAULT 0,
  velocity_90d DECIMAL(8,2) DEFAULT 0,
  seasonality_factor DECIMAL(5,4) DEFAULT 1.0,
  
  -- Supply chain
  lead_time_days INTEGER DEFAULT 14,
  reorder_point INTEGER DEFAULT 0,
  max_inventory INTEGER,
  supplier_info JSONB DEFAULT '{}',
  
  -- Product attributes
  product_dimensions JSONB DEFAULT '{}',
  weight DECIMAL(8,3),
  is_fba BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_variation BOOLEAN DEFAULT FALSE,
  variation_theme TEXT, -- 'Color', 'Size', etc.
  
  -- Performance metrics
  buy_box_percentage DECIMAL(5,4) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  session_percentage DECIMAL(5,4) DEFAULT 0,
  
  -- Review metrics
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(seller_id, asin, marketplace_id),
  CHECK (margin_floor >= 0),
  CHECK (current_price > 0 OR current_price IS NULL),
  CHECK (stock_level >= 0),
  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

-- Sales Performance Data
CREATE TABLE sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Sales metrics
  units_sold INTEGER DEFAULT 0,
  units_ordered INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  
  -- Traffic metrics
  sessions INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Conversion metrics
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  add_to_cart_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Buy Box and competitive metrics
  buy_box_percentage DECIMAL(5,4) DEFAULT 0,
  buy_box_price DECIMAL(10,2),
  lowest_competitor_price DECIMAL(10,2),
  
  -- Return and refund data
  units_returned INTEGER DEFAULT 0,
  return_rate DECIMAL(5,4) DEFAULT 0,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, date),
  CHECK (units_sold >= 0),
  CHECK (revenue >= 0),
  CHECK (conversion_rate >= 0 AND conversion_rate <= 1)
);

-- Advertising Campaign Data
CREATE TABLE advertising_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  campaign_id TEXT,
  campaign_name TEXT,
  campaign_type TEXT CHECK (campaign_type IN ('sponsored_products', 'sponsored_brands', 'sponsored_display', 'video')),
  targeting_type TEXT CHECK (targeting_type IN ('manual', 'auto')),
  date DATE NOT NULL,
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  sales DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  
  -- Calculated metrics
  ctr DECIMAL(5,4), -- Click-through rate
  cpc DECIMAL(8,2), -- Cost per click
  acos DECIMAL(5,4), -- Advertising Cost of Sales
  roas DECIMAL(8,2), -- Return on Ad Spend
  
  -- Keyword and targeting data
  keywords JSONB DEFAULT '[]',
  targets JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (impressions >= 0),
  CHECK (clicks <= impressions),
  CHECK (spend >= 0),
  CHECK (acos IS NULL OR acos >= 0)
);

-- Keyword Performance & Rankings
CREATE TABLE keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  rank_position INTEGER,
  rank_page INTEGER,
  search_volume INTEGER,
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
  bid_amount DECIMAL(8,2),
  match_type TEXT CHECK (match_type IN ('exact', 'phrase', 'broad')),
  campaign_type TEXT CHECK (campaign_type IN ('organic', 'sponsored')),
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4),
  
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, keyword, match_type, campaign_type, date)
);

-- Competitor Intelligence
CREATE TABLE competitor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  competitor_asin TEXT NOT NULL,
  competitor_sku TEXT,
  competitor_title TEXT,
  competitor_brand TEXT,
  
  -- Pricing data
  price DECIMAL(10,2),
  shipping_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (price + shipping_price) STORED,
  
  -- Ranking and visibility
  rank_position INTEGER,
  rank_category TEXT,
  
  -- Product quality indicators
  rating DECIMAL(3,2),
  review_count INTEGER,
  
  -- Availability and fulfillment
  stock_status TEXT CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  buy_box_winner BOOLEAN DEFAULT FALSE,
  prime_eligible BOOLEAN DEFAULT FALSE,
  seller_name TEXT,
  seller_rating DECIMAL(3,2),
  
  -- Additional competitive metrics
  listing_quality_score INTEGER CHECK (listing_quality_score BETWEEN 0 AND 100),
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CHECK (seller_rating IS NULL OR (seller_rating >= 0 AND seller_rating <= 5))
);

-- Review & Rating Management
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  review_id TEXT UNIQUE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  reviewer_name TEXT,
  reviewer_profile_url TEXT,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  review_date DATE NOT NULL,
  
  -- AI-powered analysis
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1), -- -1 to 1
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  key_topics JSONB DEFAULT '[]',
  product_issues JSONB DEFAULT '[]', -- Identified product problems
  service_issues JSONB DEFAULT '[]', -- Identified service problems
  
  -- Response management
  response_needed BOOLEAN DEFAULT FALSE,
  response_priority INTEGER CHECK (response_priority BETWEEN 1 AND 5),
  responded_at TIMESTAMPTZ,
  response_text TEXT,
  response_helpful_votes INTEGER DEFAULT 0,
  
  -- Content flags
  is_spam BOOLEAN DEFAULT FALSE,
  is_fake BOOLEAN DEFAULT FALSE,
  language_code TEXT DEFAULT 'en',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event-Driven Fact Stream
CREATE TABLE fact_stream (
  id BIGSERIAL PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT,
  
  -- Event classification
  event_type TEXT NOT NULL, -- 'inventory.low', 'buybox.lost', 'price.changed', etc.
  event_category TEXT NOT NULL CHECK (event_category IN ('inventory', 'pricing', 'competition', 'reviews', 'performance', 'advertising')),
  event_severity TEXT DEFAULT 'medium' CHECK (event_severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Event data
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Processing tracking
  processed_by TEXT[] DEFAULT '{}', -- Track which agents processed this event
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Event correlation
  correlation_id UUID, -- Link related events
  parent_event_id BIGINT REFERENCES fact_stream(id),
  
  -- Priority and impact
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  estimated_impact DECIMAL(10,2), -- Estimated financial impact
  
  -- Retention and cleanup
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Agent Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT,
  
  -- Recommendation metadata
  agent_type TEXT NOT NULL CHECK (agent_type IN ('loss_prevention', 'revenue_optimization', 'strategic_intelligence', 'meta_agent')),
  recommendation_type TEXT NOT NULL,
  recommendation_category TEXT CHECK (recommendation_category IN ('pricing', 'inventory', 'advertising', 'listing', 'competitive', 'strategic')),
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_explanation TEXT,
  
  -- Action specification
  action_required JSONB NOT NULL DEFAULT '{}', -- Specific actions to take
  action_complexity TEXT DEFAULT 'simple' CHECK (action_complexity IN ('simple', 'moderate', 'complex')),
  estimated_time_minutes INTEGER DEFAULT 5,
  
  -- Impact and confidence
  predicted_impact DECIMAL(10,2), -- Expected profit impact
  impact_confidence DECIMAL(3,2) CHECK (impact_confidence BETWEEN 0 AND 1),
  impact_timeframe TEXT DEFAULT 'week' CHECK (impact_timeframe IN ('immediate', 'day', 'week', 'month', 'quarter')),
  
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- AI reasoning and evidence
  reasoning JSONB DEFAULT '{}', -- AI explanation for the recommendation
  supporting_data JSONB DEFAULT '{}', -- Data used to generate recommendation
  alternative_actions JSONB DEFAULT '[]', -- Other possible actions considered
  
  -- Lifecycle management
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired', 'executed', 'scheduled')),
  viewed_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Automation settings
  auto_execute_eligible BOOLEAN DEFAULT FALSE,
  auto_execute_at TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT TRUE,
  
  -- Context and personalization
  personalization_factors JSONB DEFAULT '{}',
  business_context JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation Outcomes & Learning
CREATE TABLE recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  
  -- Implementation details
  implemented_at TIMESTAMPTZ,
  implementation_method TEXT CHECK (implementation_method IN ('manual', 'one_click', 'automated', 'api_integration')),
  implementation_duration_minutes INTEGER,
  
  -- Measured results
  actual_impact DECIMAL(10,2), -- Measured profit impact
  impact_variance DECIMAL(10,2), -- Difference from predicted
  accuracy_score DECIMAL(3,2) CHECK (accuracy_score BETWEEN 0 AND 1), -- How close prediction was to reality
  
  -- Detailed success metrics
  success_metrics JSONB DEFAULT '{}', -- Detailed success measurements
  kpi_improvements JSONB DEFAULT '{}', -- Specific KPI changes
  
  -- Seller feedback
  seller_feedback TEXT,
  seller_satisfaction INTEGER CHECK (seller_satisfaction BETWEEN 1 AND 5),
  ease_of_implementation INTEGER CHECK (ease_of_implementation BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  
  -- Learning data
  lessons_learned JSONB DEFAULT '{}',
  contributing_factors JSONB DEFAULT '{}',
  contributed_to_learning BOOLEAN DEFAULT TRUE,
  
  -- Measurement metadata
  measurement_method TEXT CHECK (measurement_method IN ('direct', 'statistical', 'estimated')),
  measurement_confidence DECIMAL(3,2) CHECK (measurement_confidence BETWEEN 0 AND 1),
  measurement_period_days INTEGER DEFAULT 7,
  
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Actions & Executions
CREATE TABLE automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  
  -- Action specification
  action_type TEXT NOT NULL CHECK (action_type IN ('price_change', 'bid_adjustment', 'inventory_order', 'listing_update', 'campaign_optimization')),
  action_data JSONB NOT NULL DEFAULT '{}',
  
  -- Safety and validation
  guard_rails JSONB DEFAULT '{}', -- Safety checks applied
  validation_checks JSONB DEFAULT '{}', -- Pre-execution validations
  rollback_plan JSONB DEFAULT '{}', -- How to undo the action
  
  -- Execution lifecycle
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'validating', 'executing', 'completed', 'failed', 'rolled_back', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Rollback management
  rollback_deadline TIMESTAMPTZ, -- When auto-rollback triggers
  rollback_executed_at TIMESTAMPTZ,
  rollback_reason TEXT,
  rollback_successful BOOLEAN,
  
  -- External system integration
  sp_api_request JSONB DEFAULT '{}',
  sp_api_response JSONB DEFAULT '{}',
  external_system_ids JSONB DEFAULT '{}', -- IDs from external systems
  
  -- Error handling
  error_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}',
  last_error_at TIMESTAMPTZ,
  
  -- Monitoring and alerting
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  alert_on_failure BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Domain Intelligence & Learning Cache
CREATE TABLE intelligence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Cache metadata
  cache_type TEXT NOT NULL CHECK (cache_type IN ('pattern', 'correlation', 'prediction', 'insight', 'recommendation_template')),
  cache_scope TEXT DEFAULT 'seller' CHECK (cache_scope IN ('global', 'seller', 'product', 'category')),
  
  -- Content
  data JSONB NOT NULL DEFAULT '{}',
  embeddings VECTOR(1536), -- pgvector for semantic search
  summary TEXT,
  
  -- Quality and confidence
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  quality_score DECIMAL(3,2) DEFAULT 0.5 CHECK (quality_score BETWEEN 0 AND 1),
  
  -- Usage and lifecycle
  usage_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_frequency DECIMAL(8,4) DEFAULT 0, -- accesses per day
  
  -- Categorization and retrieval
  tags TEXT[] DEFAULT '{}', -- For categorization and retrieval
  related_cache_keys TEXT[] DEFAULT '{}',
  
  -- Expiration and cleanup
  expires_at TIMESTAMPTZ NOT NULL,
  auto_refresh BOOLEAN DEFAULT FALSE,
  refresh_interval INTERVAL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Context & Personalization
CREATE TABLE seller_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Context classification
  context_type TEXT NOT NULL CHECK (context_type IN ('goal', 'constraint', 'preference', 'behavior', 'business_model', 'market_focus')),
  context_key TEXT NOT NULL,
  context_value JSONB NOT NULL DEFAULT '{}',
  
  -- Confidence and validation
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  validation_score DECIMAL(3,2) DEFAULT 0.5 CHECK (validation_score BETWEEN 0 AND 1),
  
  -- Source and learning
  source TEXT NOT NULL CHECK (source IN ('conversation', 'behavior', 'explicit', 'inferred', 'survey', 'onboarding')),
  evidence JSONB DEFAULT '{}',
  
  -- Lifecycle
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated TIMESTAMPTZ DEFAULT NOW(),
  validation_count INTEGER DEFAULT 1,
  contradicted_count INTEGER DEFAULT 0,
  
  -- Usage and impact
  times_used INTEGER DEFAULT 0,
  impact_on_recommendations JSONB DEFAULT '{}',
  
  UNIQUE(seller_id, context_type, context_key)
);

-- Communication & Alert Management
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Alert classification
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'important', 'informational', 'opportunity', 'achievement')),
  alert_category TEXT CHECK (alert_category IN ('inventory', 'pricing', 'competition', 'performance', 'system', 'account')),
  urgency INTEGER DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5), -- 5 = most urgent
  
  -- Communication channel
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'dashboard', 'sms', 'push')),
  preferred_channel TEXT,
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  rich_content JSONB DEFAULT '{}', -- HTML, images, etc.
  
  -- Action and interaction
  action_url TEXT,
  action_text TEXT DEFAULT 'View Details',
  quick_actions JSONB DEFAULT '[]', -- One-click actions from alert
  
  -- Relationships
  related_recommendation_id UUID REFERENCES recommendations(id),
  related_product_asin TEXT,
  correlation_id UUID, -- Group related alerts
  
  -- Delivery tracking
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  action_taken_at TIMESTAMPTZ,
  
  -- Status and retry logic
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'expired', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Personalization
  personalization_data JSONB DEFAULT '{}',
  sender_context JSONB DEFAULT '{}',
  
  -- Analytics and learning
  engagement_score DECIMAL(3,2), -- How engaging was this alert
  effectiveness_score DECIMAL(3,2), -- Did it drive desired action
  
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Performance & Monitoring
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metric identification
  metric_type TEXT NOT NULL CHECK (metric_type IN ('api_performance', 'agent_accuracy', 'user_engagement', 'system_health', 'business_impact')),
  metric_name TEXT NOT NULL,
  metric_category TEXT,
  
  -- Metric data
  metric_value DECIMAL(12,4) NOT NULL,
  metric_unit TEXT, -- 'ms', '%', '$', 'count', etc.
  
  -- Context and dimensions
  dimensions JSONB DEFAULT '{}', -- Additional metric dimensions
  tags TEXT[] DEFAULT '{}',
  
  -- Aggregation support
  aggregation_level TEXT DEFAULT 'raw' CHECK (aggregation_level IN ('raw', 'minute', 'hour', 'day', 'week', 'month')),
  aggregation_function TEXT CHECK (aggregation_function IN ('sum', 'avg', 'min', 'max', 'count', 'p95', 'p99')),
  
  -- Lifecycle
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  retention_days INTEGER DEFAULT 90,
  
  -- Performance optimization
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);