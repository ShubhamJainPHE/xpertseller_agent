import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST() {
  try {
    console.log('🚀 Setting up database tables...')

    // Create the basic tables we need for the dashboard
    const createTablesSQL = `
      -- Create products table if it doesn't exist
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        marketplace_id TEXT DEFAULT 'ATVPDKIKX0DER',
        title TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        current_price DECIMAL(10,2),
        cost_basis DECIMAL(10,2),
        stock_level INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(seller_id, asin, marketplace_id)
      );

      -- Create sales_data table if it doesn't exist
      CREATE TABLE IF NOT EXISTS sales_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        units_sold INTEGER DEFAULT 0,
        revenue DECIMAL(12,2) DEFAULT 0,
        profit DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, date)
      );

      -- Create financial_performance table if it doesn't exist
      CREATE TABLE IF NOT EXISTS financial_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        date DATE NOT NULL,
        net_sales DECIMAL(12,2) DEFAULT 0,
        net_profit DECIMAL(12,2) DEFAULT 0,
        units_sold INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(seller_id, asin, date)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
      CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
      CREATE INDEX IF NOT EXISTS idx_sales_data_product_date ON sales_data(product_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_financial_performance_seller_date ON financial_performance(seller_id, date DESC);
    `

    // Execute the SQL using Supabase's RPC function (if available) or raw SQL
    try {
      // Try using the sql method (newer Supabase clients)
      const { error } = await supabase.rpc('exec_sql', { 
        sql: createTablesSQL 
      })

      if (error) {
        console.log('RPC method failed, trying alternative approach...')
        throw error
      }

      console.log('✅ Tables created successfully using RPC!')

    } catch (rpcError) {
      console.log('RPC failed, tables might already exist or need manual creation')
      console.log('RPC Error:', rpcError)
      
      // Alternative: Check if tables exist by trying to select from them
      const tableChecks = []
      
      // Check sellers table
      try {
        await supabase.from('sellers').select('id').limit(1)
        tableChecks.push('sellers: ✅')
      } catch (e) {
        tableChecks.push('sellers: ❌ (required)')
      }

      // Check products table
      try {
        await supabase.from('products').select('id').limit(1)
        tableChecks.push('products: ✅')
      } catch (e) {
        tableChecks.push('products: ❌ (needs creation)')
      }

      // Check sales_data table
      try {
        await supabase.from('sales_data').select('id').limit(1)
        tableChecks.push('sales_data: ✅')
      } catch (e) {
        tableChecks.push('sales_data: ❌ (needs creation)')
      }

      return NextResponse.json({
        success: false,
        error: 'Cannot create tables automatically',
        details: 'Tables need to be created manually in Supabase dashboard',
        tableStatus: tableChecks,
        sqlToRun: createTablesSQL,
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Paste the provided SQL and run it',
          '4. Come back and try seeding again'
        ]
      }, { status: 400 })
    }

    // Verify tables were created
    const verificationResults = []
    
    try {
      await supabase.from('products').select('id').limit(1)
      verificationResults.push('products: ✅')
    } catch (e) {
      verificationResults.push('products: ❌')
    }

    try {
      await supabase.from('sales_data').select('id').limit(1)
      verificationResults.push('sales_data: ✅')
    } catch (e) {
      verificationResults.push('sales_data: ❌')
    }

    try {
      await supabase.from('financial_performance').select('id').limit(1)
      verificationResults.push('financial_performance: ✅')
    } catch (e) {
      verificationResults.push('financial_performance: ❌')
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup completed!',
      tablesCreated: verificationResults,
      nextStep: 'You can now populate the database with sample data'
    })

  } catch (error) {
    console.error('Table setup error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to setup database tables', 
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        suggestion: 'You may need to create tables manually in Supabase dashboard'
      },
      { status: 500 }
    )
  }
}