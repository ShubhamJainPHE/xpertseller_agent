-- Security & Performance Updates Migration
-- Run this before deploying the security fixes

-- Add API key and version columns for authentication
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Add indexes for performance (run concurrently in production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_active 
ON products(seller_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_velocity 
ON products(seller_id, velocity_30d DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_seller_status 
ON recommendations(seller_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_stream_seller_type 
ON fact_stream(seller_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_data_date 
ON sales_data(product_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advertising_data_date 
ON advertising_data(product_id, date DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_pending 
ON recommendations(seller_id, created_at DESC) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_stream_unprocessed 
ON fact_stream(seller_id, importance_score DESC) WHERE processing_status = 'pending';

-- Add table for learning models
CREATE TABLE IF NOT EXISTS seller_learning_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  patterns JSONB NOT NULL DEFAULT '{}',
  accuracy_metrics JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_learning_models ENABLE ROW LEVEL SECURITY;

-- Create policies for sellers table
CREATE POLICY sellers_policy ON sellers 
  FOR ALL USING (id = current_setting('app.current_seller_id')::uuid);

-- Create policies for products table  
CREATE POLICY products_policy ON products 
  FOR ALL USING (seller_id = current_setting('app.current_seller_id')::uuid);

-- Create policies for recommendations table
CREATE POLICY recommendations_policy ON recommendations 
  FOR ALL USING (seller_id = current_setting('app.current_seller_id')::uuid);

-- Create policies for fact_stream table
CREATE POLICY fact_stream_policy ON fact_stream 
  FOR ALL USING (
    seller_id = current_setting('app.current_seller_id')::uuid 
    OR seller_id = 'system'
    OR current_setting('app.admin_access')::boolean = true
  );

-- Create policies for learning models table
CREATE POLICY learning_models_policy ON seller_learning_models 
  FOR ALL USING (seller_id = current_setting('app.current_seller_id')::uuid);

-- Create function for seller metrics aggregation
CREATE OR REPLACE FUNCTION get_seller_metrics(
  p_seller_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate seller access
  IF p_seller_id != current_setting('app.current_seller_id')::uuid THEN
    RAISE EXCEPTION 'Unauthorized access to seller metrics';
  END IF;
  
  RETURN (
    SELECT json_build_object(
      'total_revenue', COALESCE(SUM(s.revenue), 0),
      'total_profit', COALESCE(SUM(s.profit), 0),
      'product_count', COUNT(DISTINCT p.id),
      'avg_velocity', COALESCE(AVG(p.velocity_30d), 0),
      'total_ad_spend', COALESCE(SUM(a.spend), 0)
    )
    FROM products p
    LEFT JOIN sales_data s ON p.id = s.product_id 
      AND s.date BETWEEN p_start_date AND p_end_date
    LEFT JOIN advertising_data a ON p.id = a.product_id 
      AND a.date BETWEEN p_start_date AND p_end_date
    WHERE p.seller_id = p_seller_id
      AND p.is_active = true
  );
END;
$$;

-- Add rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_time < NOW();
END;
$$;

-- Generate API keys for existing sellers
UPDATE sellers 
SET api_key = 'sk_' || substr(gen_random_uuid()::text, 1, 32)
WHERE api_key IS NULL;

-- Add constraints
ALTER TABLE sellers ADD CONSTRAINT chk_api_key_format 
  CHECK (api_key ~ '^sk_[a-f0-9]{32}$');

-- Create stored procedure for secure seller authentication
CREATE OR REPLACE FUNCTION authenticate_seller(p_api_key TEXT)
RETURNS TABLE(seller_id UUID, subscription_tier TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.subscription_tier
  FROM sellers s
  WHERE s.api_key = p_api_key
    AND s.status = 'active';
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE seller_learning_models IS 'Stores AI learning patterns and accuracy metrics for each seller';
COMMENT ON TABLE rate_limits IS 'Rate limiting storage for API endpoints';
COMMENT ON FUNCTION get_seller_metrics IS 'Secure aggregation function for seller performance metrics';
COMMENT ON FUNCTION authenticate_seller IS 'Secure seller authentication via API key';

-- Create view for system health monitoring
CREATE OR REPLACE VIEW system_health AS
SELECT 
  'database' as component,
  CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'unhealthy' END as status,
  COUNT(*) as active_connections
FROM pg_stat_activity
UNION ALL
SELECT 
  'sellers' as component,
  CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'unhealthy' END as status,
  COUNT(*) as active_sellers
FROM sellers WHERE status = 'active'
UNION ALL
SELECT 
  'recommendations' as component,
  CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'degraded' END as status,
  COUNT(*) as pending_recommendations
FROM recommendations WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Grant permissions
GRANT SELECT ON system_health TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_seller_metrics TO PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_seller TO PUBLIC;