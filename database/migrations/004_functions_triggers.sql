-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sp_api_credentials()
RETURNS TRIGGER AS $$
BEGIN
    -- In production, implement proper encryption
    -- For now, just ensure the data is marked as sensitive
    NEW.sp_api_credentials = NEW.sp_api_credentials || '{"encrypted": true}'::jsonb;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate recommendation priority
CREATE OR REPLACE FUNCTION calculate_recommendation_priority()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate priority based on impact, confidence, and risk
    NEW.priority = LEAST(10, GREATEST(1, 
        COALESCE(NEW.predicted_impact, 0) / 100 * 3 +
        COALESCE(NEW.confidence_score, 0) * 3 +
        CASE NEW.risk_level 
            WHEN 'low' THEN 4
            WHEN 'medium' THEN 2
            WHEN 'high' THEN 1
            ELSE 2
        END
    ));
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-expire old recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at = NOW() + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate business rules
CREATE OR REPLACE FUNCTION validate_business_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate product margins
    IF TG_TABLE_NAME = 'products' THEN
        IF NEW.current_price IS NOT NULL AND NEW.cost_price IS NOT NULL THEN
            IF NEW.current_price <= NEW.cost_price THEN
                RAISE EXCEPTION 'Current price must be greater than cost price';
            END IF;
        END IF;
        
        IF NEW.margin_floor < 0 THEN
            RAISE EXCEPTION 'Margin floor cannot be negative';
        END IF;
    END IF;
    
    -- Validate recommendation data
    IF TG_TABLE_NAME = 'recommendations' THEN
        IF NEW.confidence_score < 0 OR NEW.confidence_score > 1 THEN
            RAISE EXCEPTION 'Confidence score must be between 0 and 1';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update seller last_active_at
CREATE OR REPLACE FUNCTION update_seller_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sellers 
    SET last_active_at = NOW()
    WHERE id = NEW.seller_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Delete expired recommendations
    DELETE FROM recommendations 
    WHERE status = 'pending' AND expires_at < NOW();
    
    -- Delete expired intelligence cache
    DELETE FROM intelligence_cache 
    WHERE expires_at < NOW();
    
    -- Delete old system metrics
    DELETE FROM system_metrics 
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
    
    -- Archive old fact stream events
    DELETE FROM fact_stream 
    WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to calculate inventory velocity
CREATE OR REPLACE FUNCTION calculate_inventory_velocity()
RETURNS TRIGGER AS $$
DECLARE
    velocity_7d DECIMAL(8,2);
    velocity_30d DECIMAL(8,2);
    velocity_90d DECIMAL(8,2);
BEGIN
    -- Calculate 7-day velocity
    SELECT COALESCE(AVG(units_sold), 0) INTO velocity_7d
    FROM sales_data sd
    JOIN products p ON sd.product_id = p.id
    WHERE p.asin = NEW.asin 
    AND sd.date >= NOW() - INTERVAL '7 days';
    
    -- Calculate 30-day velocity
    SELECT COALESCE(AVG(units_sold), 0) INTO velocity_30d
    FROM sales_data sd
    JOIN products p ON sd.product_id = p.id
    WHERE p.asin = NEW.asin 
    AND sd.date >= NOW() - INTERVAL '30 days';
    
    -- Calculate 90-day velocity
    SELECT COALESCE(AVG(units_sold), 0) INTO velocity_90d
    FROM sales_data sd
    JOIN products p ON sd.product_id = p.id
    WHERE p.asin = NEW.asin 
    AND sd.date >= NOW() - INTERVAL '90 days';
    
    -- Update product velocities
    UPDATE products 
    SET 
        velocity_7d = calculate_inventory_velocity.velocity_7d,
        velocity_30d = calculate_inventory_velocity.velocity_30d,
        velocity_90d = calculate_inventory_velocity.velocity_90d
    WHERE asin = NEW.asin;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at timestamps
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automated_actions_updated_at BEFORE UPDATE ON automated_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intelligence_cache_updated_at BEFORE UPDATE ON intelligence_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER encrypt_sp_api_credentials_trigger BEFORE INSERT OR UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION encrypt_sp_api_credentials();

CREATE TRIGGER calculate_recommendation_priority_trigger BEFORE INSERT OR UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION calculate_recommendation_priority();

CREATE TRIGGER expire_old_recommendations_trigger BEFORE INSERT ON recommendations
    FOR EACH ROW EXECUTE FUNCTION expire_old_recommendations();

CREATE TRIGGER validate_business_rules_products BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION validate_business_rules();

CREATE TRIGGER validate_business_rules_recommendations BEFORE INSERT OR UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION validate_business_rules();

-- Activity tracking triggers
CREATE TRIGGER update_seller_activity_products AFTER INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_seller_activity();

CREATE TRIGGER update_seller_activity_recommendations AFTER INSERT OR UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_seller_activity();

-- Inventory velocity calculation trigger
CREATE TRIGGER calculate_velocity_trigger AFTER INSERT OR UPDATE ON sales_data
    FOR EACH ROW EXECUTE FUNCTION calculate_inventory_velocity();