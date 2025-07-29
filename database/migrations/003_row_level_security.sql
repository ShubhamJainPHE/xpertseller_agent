-- Enable Row Level Security on all tables
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertising_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Seller isolation policies - Users can only access their own data
CREATE POLICY seller_isolation_policy ON sellers 
  FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY seller_products_policy ON products 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY seller_sales_policy ON sales_data 
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p 
      JOIN sellers s ON p.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_advertising_policy ON advertising_data 
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p 
      JOIN sellers s ON p.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_keywords_policy ON keyword_rankings 
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p 
      JOIN sellers s ON p.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_competitors_policy ON competitor_data 
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p 
      JOIN sellers s ON p.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_reviews_policy ON reviews 
  FOR ALL USING (
    product_id IN (
      SELECT p.id FROM products p 
      JOIN sellers s ON p.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_facts_policy ON fact_stream 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY seller_recommendations_policy ON recommendations 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY seller_outcomes_policy ON recommendation_outcomes 
  FOR ALL USING (
    recommendation_id IN (
      SELECT r.id FROM recommendations r 
      JOIN sellers s ON r.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_actions_policy ON automated_actions 
  FOR ALL USING (
    recommendation_id IN (
      SELECT r.id FROM recommendations r 
      JOIN sellers s ON r.seller_id = s.id 
      WHERE auth.uid()::text = s.id::text
    )
  );

CREATE POLICY seller_intelligence_policy ON intelligence_cache 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    ) OR cache_scope = 'global'
  );

CREATE POLICY seller_context_policy ON seller_context 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY seller_alerts_policy ON alerts 
  FOR ALL USING (
    seller_id IN (
      SELECT id FROM sellers WHERE auth.uid()::text = id::text
    )
  );

-- System metrics policy - Only service role can access
CREATE POLICY system_metrics_policy ON system_metrics 
  FOR ALL USING (auth.role() = 'service_role');

-- Service role policies for system operations
CREATE POLICY service_role_full_access ON sellers 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_products_access ON products 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_sales_access ON sales_data 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_advertising_access ON advertising_data 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_keywords_access ON keyword_rankings 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_competitors_access ON competitor_data 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_reviews_access ON reviews 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_facts_access ON fact_stream 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_recommendations_access ON recommendations 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_outcomes_access ON recommendation_outcomes 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_actions_access ON automated_actions 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_intelligence_access ON intelligence_cache 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_context_access ON seller_context 
  FOR ALL TO service_role USING (true);

CREATE POLICY service_role_alerts_access ON alerts 
  FOR ALL TO service_role USING (true);

-- Anonymous access policies for public endpoints
CREATE POLICY public_signup_policy ON sellers 
  FOR INSERT TO anon WITH CHECK (true);