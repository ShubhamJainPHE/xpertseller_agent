-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automated_actions_updated_at BEFORE UPDATE ON automated_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fact stream event processor trigger
CREATE OR REPLACE FUNCTION process_fact_stream_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set processing status based on event type
    IF NEW.event_type IN ('stockout.imminent', 'buybox.lost', 'price.below_floor') THEN
        NEW.requires_action = TRUE;
        NEW.importance_score = GREATEST(NEW.importance_score, 8);
    END IF;
    
    -- Generate correlation ID if not provided
    IF NEW.correlation_id IS NULL THEN
        NEW.correlation_id = gen_random_uuid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_fact_stream_event_trigger BEFORE INSERT ON fact_stream
  FOR EACH ROW EXECUTE FUNCTION process_fact_stream_event();

-- Calculate product velocity function
CREATE OR REPLACE FUNCTION calculate_product_velocity(p_product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products SET
        velocity_7d = (
            SELECT COALESCE(AVG(units_sold), 0)
            FROM sales_data 
            WHERE product_id = p_product_id 
            AND date >= CURRENT_DATE - INTERVAL '7 days'
        ),
        velocity_30d = (
            SELECT COALESCE(AVG(units_sold), 0)
            FROM sales_data 
            WHERE product_id = p_product_id 
            AND date >= CURRENT_DATE - INTERVAL '30 days'
        ),
        velocity_90d = (
            SELECT COALESCE(AVG(units_sold), 0)
            FROM sales_data 
            WHERE product_id = p_product_id 
            AND date >= CURRENT_DATE - INTERVAL '90 days'
        ),
        buy_box_percentage_30d = (
            SELECT COALESCE(AVG(buy_box_percentage), 0)
            FROM sales_data 
            WHERE product_id = p_product_id 
            AND date >= CURRENT_DATE - INTERVAL '30 days'
        )
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate velocity on sales data insert/update
CREATE OR REPLACE FUNCTION update_product_velocity()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_product_velocity(NEW.product_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_velocity_on_sales_change AFTER INSERT OR UPDATE ON sales_data
  FOR EACH ROW EXECUTE FUNCTION update_product_velocity();

-- Recommendation priority scoring function
CREATE OR REPLACE FUNCTION calculate_recommendation_priority(
    p_predicted_impact DECIMAL,
    p_confidence_score DECIMAL,
    p_risk_level TEXT,
    p_urgency_level TEXT
) RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER;
    risk_modifier DECIMAL;
    urgency_modifier DECIMAL;
BEGIN
    -- Base score from impact and confidence
    base_score := LEAST(10, GREATEST(1, 
        ROUND(5 + (p_predicted_impact / 100) + (p_confidence_score * 3))
    ));
    
    -- Risk level modifier
    risk_modifier := CASE p_risk_level
        WHEN 'low' THEN 1.2
        WHEN 'medium' THEN 1.0
        WHEN 'high' THEN 0.8
        ELSE 1.0
    END;
    
    -- Urgency modifier
    urgency_modifier := CASE p_urgency_level
        WHEN 'critical' THEN 2.0
        WHEN 'high' THEN 1.5
        WHEN 'normal' THEN 1.0
        WHEN 'low' THEN 0.7
        ELSE 1.0
    END;
    
    RETURN LEAST(10, GREATEST(1, 
        ROUND(base_score * risk_modifier * urgency_modifier)
    ));
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate recommendation priority trigger
CREATE OR REPLACE FUNCTION set_recommendation_priority()
RETURNS TRIGGER AS $$
BEGIN
    NEW.priority := calculate_recommendation_priority(
        COALESCE(NEW.predicted_impact, 0),
        NEW.confidence_score,
        NEW.risk_level,
        NEW.urgency_level
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recommendation_priority_trigger BEFORE INSERT OR UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION set_recommendation_priority();