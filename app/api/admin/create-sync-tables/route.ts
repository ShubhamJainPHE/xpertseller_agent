import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ Creating Amazon sync database tables...')

    // Create inventory table
    const inventoryTableSQL = `
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        sku TEXT,
        fnsku TEXT,
        condition TEXT DEFAULT 'New',
        total_quantity INTEGER DEFAULT 0,
        sellable_quantity INTEGER DEFAULT 0,
        reserved_quantity INTEGER DEFAULT 0,
        inventory_details JSONB,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(seller_id, asin)
      );
    `

    // Create orders table
    const ordersTableSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        amazon_order_id TEXT NOT NULL,
        order_status TEXT,
        purchase_date TIMESTAMP WITH TIME ZONE,
        order_total DECIMAL(10,2) DEFAULT 0,
        currency_code TEXT DEFAULT 'USD',
        marketplace_id TEXT,
        order_details JSONB,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(seller_id, amazon_order_id)
      );
    `

    // Create products table for catalog data
    const productsTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        sku TEXT,
        title TEXT,
        brand TEXT,
        category TEXT,
        price DECIMAL(10,2),
        competitive_price DECIMAL(10,2),
        sales_rank INTEGER,
        product_details JSONB,
        images JSONB,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(seller_id, asin)
      );
    `

    // Create sync_logs table to track sync history
    const syncLogsTableSQL = `
      CREATE TABLE IF NOT EXISTS sync_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        records_processed INTEGER DEFAULT 0,
        errors JSONB,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER
      );
    `

    // Execute table creation queries
    const tables = [
      { name: 'inventory', sql: inventoryTableSQL },
      { name: 'orders', sql: ordersTableSQL },
      { name: 'products', sql: productsTableSQL },
      { name: 'sync_logs', sql: syncLogsTableSQL }
    ]

    const results = []

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          query: table.sql 
        })

        if (error) {
          console.error(`Failed to create ${table.name} table:`, error)
          results.push({
            table: table.name,
            success: false,
            error: error.message
          })
        } else {
          console.log(`✅ Created/verified ${table.name} table`)
          results.push({
            table: table.name,
            success: true
          })
        }
      } catch (err) {
        console.error(`Error creating ${table.name} table:`, err)
        results.push({
          table: table.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Add indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_inventory_seller_asin ON inventory(seller_id, asin);',
      'CREATE INDEX IF NOT EXISTS idx_orders_seller_date ON orders(seller_id, purchase_date DESC);',
      'CREATE INDEX IF NOT EXISTS idx_products_seller_asin ON products(seller_id, asin);',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_type ON sync_logs(seller_id, sync_type, started_at DESC);'
    ]

    for (const indexSQL of indexes) {
      try {
        await supabaseAdmin.rpc('exec_sql', { query: indexSQL })
        console.log('✅ Created index')
      } catch (error) {
        console.error('Failed to create index:', error)
      }
    }

    // Add columns to sellers table if they don't exist
    try {
      const sellerUpdatesSQL = `
        ALTER TABLE sellers 
        ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS marketplace_ids TEXT[] DEFAULT ARRAY['ATVPDKIKX0DER'];
      `
      
      await supabaseAdmin.rpc('exec_sql', { query: sellerUpdatesSQL })
      console.log('✅ Updated sellers table with sync columns')
      
      results.push({
        table: 'sellers_updates',
        success: true
      })
    } catch (error) {
      console.error('Failed to update sellers table:', error)
      results.push({
        table: 'sellers_updates', 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    return NextResponse.json({
      success: successCount === totalCount,
      message: `Created ${successCount}/${totalCount} database structures`,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to create sync tables:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create sync tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}