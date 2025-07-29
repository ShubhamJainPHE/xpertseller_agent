-- Performance Indexes for Products
CREATE INDEX idx_products_seller_asin ON products(seller_id, asin);
CREATE INDEX idx_products_seller_active ON products(seller_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_low_stock ON products(seller_id, stock_level) WHERE stock_level <= reorder_point;
CREATE INDEX idx_products_buy_box ON products(seller_id, buy_box_percentage_30d DESC) WHERE is_active = TRUE;

-- Performance Indexes for Sales Data
CREATE INDEX idx_sales_data_product_date ON sales_data(product_id, date DESC);
CREATE INDEX idx_sales_data_revenue ON sales_data(product_id, revenue DESC, date DESC) WHERE revenue > 0;

-- Event Stream Indexes
CREATE INDEX idx_fact_stream_seller_timestamp ON fact_stream(seller_id, timestamp DESC);
CREATE INDEX idx_fact_stream_event_type ON fact_stream(event_type, timestamp DESC);
CREATE INDEX idx_fact_stream_category_status ON fact_stream(event_category, processing_status, timestamp DESC);
CREATE INDEX idx_fact_stream_requires_action ON fact_stream(seller_id, requires_action, timestamp DESC) WHERE requires_action = TRUE;

-- Recommendations Indexes
CREATE INDEX idx_recommendations_seller_status ON recommendations(seller_id, status, priority DESC);
CREATE INDEX idx_recommendations_expires ON recommendations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_recommendations_agent_type ON recommendations(agent_type, status, created_at DESC);
CREATE INDEX idx_recommendations_urgency ON recommendations(seller_id, urgency_level, priority DESC) WHERE status IN ('pending', 'viewed');

-- Intelligence Cache Indexes
CREATE INDEX idx_intelligence_cache_key ON intelligence_cache(cache_key);
CREATE INDEX idx_intelligence_cache_seller_type ON intelligence_cache(seller_id, cache_type, last_accessed DESC);
CREATE INDEX idx_intelligence_embeddings ON intelligence_cache USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_intelligence_tags ON intelligence_cache USING GIN(tags);

-- Alerts & Communication Indexes
CREATE INDEX idx_alerts_seller_status ON alerts(seller_id, status, created_at DESC);
CREATE INDEX idx_alerts_channel_status ON alerts(channel, status, send_after);
CREATE INDEX idx_alerts_recommendation ON alerts(related_recommendation_id) WHERE related_recommendation_id IS NOT NULL;

-- Advertising Performance Indexes
CREATE INDEX idx_advertising_product_date ON advertising_data(product_id, date DESC);
CREATE INDEX idx_advertising_campaign_performance ON advertising_data(campaign_id, date DESC, acos);
CREATE INDEX idx_advertising_spend ON advertising_data(product_id, spend DESC, date DESC) WHERE spend > 0;