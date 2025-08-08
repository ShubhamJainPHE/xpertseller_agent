-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create fact_stream table (main event log for data sync)
CREATE TABLE IF NOT EXISTS fact_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT,
  marketplace_id TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  requires_action BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create FBA inventory table
CREATE TABLE IF NOT EXISTS fba_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,
  sku TEXT,
  fnsku TEXT,
  marketplace_id TEXT DEFAULT 'ATVPDKIKX0DER',
  total_quantity INTEGER DEFAULT 0,
  sellable_quantity INTEGER DEFAULT 0,
  unsellable_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  inbound_working_quantity INTEGER DEFAULT 0,
  inbound_shipped_quantity INTEGER DEFAULT 0,
  inbound_receiving_quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, asin, sku, marketplace_id)
);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amazon_order_id TEXT NOT NULL,
  order_status TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  last_update_date TIMESTAMPTZ,
  fulfillment_channel TEXT DEFAULT 'MFN',
  sales_channel TEXT DEFAULT 'Amazon.com',
  marketplace_id TEXT DEFAULT 'ATVPDKIKX0DER',
  is_prime BOOLEAN DEFAULT FALSE,
  is_business_order BOOLEAN DEFAULT FALSE,
  number_of_items_shipped INTEGER DEFAULT 0,
  number_of_items_unshipped INTEGER DEFAULT 0,
  order_total JSONB,
  order_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, amazon_order_id)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  amazon_order_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  asin TEXT NOT NULL,
  seller_sku TEXT,
  title TEXT,
  quantity_ordered INTEGER DEFAULT 0,
  quantity_shipped INTEGER DEFAULT 0,
  item_price JSONB,
  item_tax JSONB,
  promotion_discount JSONB,
  item_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(amazon_order_id, order_item_id)
);

-- Add missing columns to products table if they don't exist
DO $$ 
BEGIN 
  -- Add inbound_quantity if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'inbound_quantity') THEN
    ALTER TABLE products ADD COLUMN inbound_quantity INTEGER DEFAULT 0;
  END IF;

  -- Add reserved_quantity if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'reserved_quantity') THEN
    ALTER TABLE products ADD COLUMN reserved_quantity INTEGER DEFAULT 0;
  END IF;

  -- Add velocity_7d if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'velocity_7d') THEN
    ALTER TABLE products ADD COLUMN velocity_7d DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Add velocity_30d if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'velocity_30d') THEN
    ALTER TABLE products ADD COLUMN velocity_30d DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Add reorder_point if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 10;
  END IF;

  -- Add is_fba if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'is_fba') THEN
    ALTER TABLE products ADD COLUMN is_fba BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add list_price if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'list_price') THEN
    ALTER TABLE products ADD COLUMN list_price DECIMAL(10,2);
  END IF;

  -- Add seller_sku if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'seller_sku') THEN
    ALTER TABLE products ADD COLUMN seller_sku TEXT;
  END IF;

  -- Add supplier_info if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'supplier_info') THEN
    ALTER TABLE products ADD COLUMN supplier_info JSONB DEFAULT '{}';
  END IF;

  -- Add product_group if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'product_group') THEN
    ALTER TABLE products ADD COLUMN product_group TEXT;
  END IF;

  -- Add product_dimensions if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'product_dimensions') THEN
    ALTER TABLE products ADD COLUMN product_dimensions JSONB DEFAULT '{}';
  END IF;

  -- Add weight if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'weight') THEN
    ALTER TABLE products ADD COLUMN weight DECIMAL(10,3);
  END IF;
END $$;

-- Add missing columns to sellers table if they don't exist
DO $$ 
BEGIN 
  -- Add marketplace_ids if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sellers' AND column_name = 'marketplace_ids') THEN
    ALTER TABLE sellers ADD COLUMN marketplace_ids TEXT[] DEFAULT ARRAY['ATVPDKIKX0DER'];
  END IF;

  -- Add amazon_seller_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sellers' AND column_name = 'amazon_seller_id') THEN
    ALTER TABLE sellers ADD COLUMN amazon_seller_id TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fact_stream_seller_timestamp ON fact_stream(seller_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fact_stream_asin ON fact_stream(asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fact_stream_event_type ON fact_stream(event_type);
CREATE INDEX IF NOT EXISTS idx_fact_stream_requires_action ON fact_stream(requires_action) WHERE requires_action = TRUE;

CREATE INDEX IF NOT EXISTS idx_fba_inventory_seller_asin ON fba_inventory(seller_id, asin);
CREATE INDEX IF NOT EXISTS idx_fba_inventory_last_updated ON fba_inventory(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_purchase_date ON orders(seller_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_amazon_order_id ON orders(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);

CREATE INDEX IF NOT EXISTS idx_order_items_amazon_order_id ON order_items(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_asin ON order_items(asin);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_seller_asin ON products(seller_id, asin);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock_level ON products(stock_level);

-- Update sales_data table to include missing columns
DO $$ 
BEGIN 
  -- Add units_ordered if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sales_data' AND column_name = 'units_ordered') THEN
    ALTER TABLE sales_data ADD COLUMN units_ordered INTEGER DEFAULT 0;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sales_data' AND column_name = 'updated_at') THEN
    ALTER TABLE sales_data ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Insert success message
INSERT INTO fact_stream (
  seller_id, 
  event_type, 
  event_category, 
  data,
  metadata
) 
SELECT 
  id as seller_id,
  'system.tables_created' as event_type,
  'system' as event_category,
  '{"message": "Database tables created successfully", "tables": ["fact_stream", "fba_inventory", "orders", "order_items"]}' as data,
  '{"created_by": "manual_setup", "version": "1.0"}' as metadata
FROM sellers 
LIMIT 1
ON CONFLICT DO NOTHING;