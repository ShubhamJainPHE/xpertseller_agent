import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

async function testSyncManually() {
  try {
    console.log('🔍 Testing manual SP-API sync...\n')
    
    // Create fact_stream table first
    console.log('1. Creating fact_stream table...')
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS fact_stream (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL,
        asin TEXT,
        marketplace_id TEXT,
        event_type TEXT NOT NULL,
        event_category TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        data JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        importance_score INTEGER DEFAULT 5,
        requires_action BOOLEAN DEFAULT FALSE,
        processing_status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_fact_stream_seller_timestamp ON fact_stream(seller_id, timestamp DESC);
    `
    
    try {
      // Try to create table using direct SQL query
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSql })
      if (createError) {
        console.log('⚠️ Could not create table via RPC, it may already exist')
      } else {
        console.log('✅ fact_stream table created successfully')
      }
    } catch (e) {
      console.log('⚠️ RPC not available, assuming table exists or will be created manually')
    }
    
    // Get a seller to test with
    console.log('\n2. Getting seller for testing...')
    const { data: sellers, error: sellersError } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id, marketplace_ids')
      .eq('status', 'active')
      .eq('onboarding_completed', true)
      .limit(1)
    
    if (sellersError) {
      throw new Error(`Failed to get sellers: ${sellersError.message}`)
    }
    
    if (!sellers || sellers.length === 0) {
      throw new Error('No active sellers found')
    }
    
    const seller = sellers[0]
    console.log(`✅ Found seller: ${seller.email} (${seller.id})`)
    
    // Create SP-API service
    console.log('\n3. Creating SP-API service...')
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }
    console.log('✅ SP-API service created')
    
    // Test SP-API connection
    console.log('\n4. Testing SP-API connection...')
    const validation = await spApi.validateCredentials()
    if (!validation.valid) {
      throw new Error(`SP-API credentials invalid: ${validation.error}`)
    }
    console.log('✅ SP-API credentials validated')
    
    // Try to fetch some data
    console.log('\n5. Fetching seller orders...')
    const orders = await spApi.getOrders()
    console.log(`✅ Fetched ${orders.length} orders`)
    
    if (orders.length > 0) {
      console.log('Sample order:', {
        orderId: orders[0].AmazonOrderId,
        status: orders[0].OrderStatus,
        total: orders[0].OrderTotal
      })
    }
    
    // Try to fetch inventory
    console.log('\n6. Fetching inventory summary...')
    const inventory = await spApi.getInventorySummary()
    console.log(`✅ Fetched ${inventory.length} inventory items`)
    
    if (inventory.length > 0) {
      console.log('Sample inventory:', {
        asin: inventory[0].asin,
        totalQuantity: inventory[0].totalQuantity
      })
    }
    
    // Test direct data insertion
    console.log('\n7. Testing direct data insertion...')
    
    // Insert a test product
    const testProduct = {
      seller_id: seller.id,
      asin: 'B00TEST123',
      marketplace_id: 'ATVPDKIKX0DER',
      title: 'Test Product for Sync',
      brand: 'Test Brand',
      current_price: 29.99,
      stock_level: 100,
      is_active: true
    }
    
    const { data: insertedProduct, error: productError } = await supabaseAdmin
      .from('products')
      .upsert(testProduct, { onConflict: 'seller_id,asin,marketplace_id' })
      .select()
    
    if (productError) {
      console.error('❌ Failed to insert test product:', productError)
    } else {
      console.log('✅ Test product inserted successfully')
    }
    
    // Test fact_stream insertion
    const testEvent = {
      seller_id: seller.id,
      asin: 'B00TEST123',
      event_type: 'test.manual_sync',
      event_category: 'test',
      data: { message: 'Manual sync test successful' },
      metadata: { test: true }
    }
    
    try {
      const { data: insertedEvent, error: eventError } = await supabaseAdmin
        .from('fact_stream')
        .insert(testEvent)
        .select()
      
      if (eventError) {
        console.error('❌ Failed to insert test event:', eventError.message)
        
        // If fact_stream doesn't exist, the issue is table creation
        if (eventError.code === '42P01') {
          console.log('\n❌ MAIN ISSUE IDENTIFIED: fact_stream table does not exist')
          console.log('   Solution: Create the table manually in Supabase dashboard')
          console.log('   SQL to run in Supabase SQL Editor:')
          console.log(createTableSql)
        }
      } else {
        console.log('✅ Test event inserted successfully')
      }
    } catch (factError) {
      console.error('❌ Fact stream insertion failed:', factError)
    }
    
    console.log('\n📋 SYNC TEST SUMMARY:')
    console.log(`- SP-API Connection: ✅ Working`)
    console.log(`- Orders fetch: ✅ ${orders.length} orders`)  
    console.log(`- Inventory fetch: ✅ ${inventory.length} items`)
    console.log(`- Product insertion: ${productError ? '❌' : '✅'}`)
    console.log(`- Event logging: ${!insertedEvent ? '❌ (table missing)' : '✅'}`)
    
    if (!insertedEvent) {
      console.log('\n🎯 SOLUTION: Create the fact_stream table manually in Supabase dashboard')
    }
    
  } catch (error) {
    console.error('❌ Manual sync test failed:', error)
  }
}

testSyncManually().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })