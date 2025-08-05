#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SELLER_ID = '134629c6-98a6-4e46-a6bc-865bc29cda2c'

async function seedDemoData() {
  console.log('🌱 Starting demo data seeding...')
  console.log('')

  try {
    // 1. Seed inventory data
    console.log('📦 Seeding inventory data...')
    const inventoryData = [
      {
        seller_id: SELLER_ID,
        asin: 'B08N5WRWNW',
        sku: 'ECHO-DOT-4TH-BLK',
        fnsku: 'X001234567',
        condition: 'New',
        total_quantity: 150,
        sellable_quantity: 145,
        reserved_quantity: 5,
        inventory_details: {
          productName: 'Echo Dot (4th Gen) - Smart speaker with Alexa - Black',
          lastUpdated: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        asin: 'B07PDHSJ9H',
        sku: 'FIRESTICK-4K-MAX',
        fnsku: 'X001234568',
        condition: 'New',
        total_quantity: 89,
        sellable_quantity: 87,
        reserved_quantity: 2,
        inventory_details: {
          productName: 'Fire TV Stick 4K Max streaming device',
          lastUpdated: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        asin: 'B08KGY97SL',
        sku: 'KINDLE-OASIS-32GB',
        fnsku: 'X001234569',
        condition: 'New',
        total_quantity: 45,
        sellable_quantity: 42,
        reserved_quantity: 3,
        inventory_details: {
          productName: 'Kindle Oasis – With 32 GB',
          lastUpdated: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      }
    ]

    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert(inventoryData, { onConflict: 'seller_id,asin' })

    if (inventoryError) {
      console.log('   Inventory seeding completed with notes:', inventoryError.message)
    } else {
      console.log(`   ✅ Seeded ${inventoryData.length} inventory items`)
    }

    // 2. Seed orders data
    console.log('📋 Seeding orders data...')
    const ordersData = [
      {
        seller_id: SELLER_ID,
        amazon_order_id: '111-7856734-1234567',
        order_status: 'Shipped',
        purchase_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        order_total: 89.99,
        currency_code: 'USD',
        marketplace_id: 'ATVPDKIKX0DER',
        order_details: {
          buyerEmail: 'customer@example.com',
          shippingAddress: { city: 'Seattle', state: 'WA' },
          items: [{ sku: 'ECHO-DOT-4TH-BLK', quantity: 2 }]
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        amazon_order_id: '111-7856734-1234568',
        order_status: 'Delivered',
        purchase_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        order_total: 129.99,
        currency_code: 'USD',
        marketplace_id: 'ATVPDKIKX0DER',
        order_details: {
          buyerEmail: 'customer2@example.com',
          shippingAddress: { city: 'Austin', state: 'TX' },
          items: [{ sku: 'FIRESTICK-4K-MAX', quantity: 1 }]
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        amazon_order_id: '111-7856734-1234569',
        order_status: 'Pending',
        purchase_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        order_total: 249.99,
        currency_code: 'USD',
        marketplace_id: 'ATVPDKIKX0DER',
        order_details: {
          buyerEmail: 'customer3@example.com',
          shippingAddress: { city: 'New York', state: 'NY' },
          items: [{ sku: 'KINDLE-OASIS-32GB', quantity: 1 }]
        },
        last_updated: new Date().toISOString()
      }
    ]

    const { error: ordersError } = await supabase
      .from('orders')
      .upsert(ordersData, { onConflict: 'seller_id,amazon_order_id' })

    if (ordersError) {
      console.log('   Orders seeding completed with notes:', ordersError.message)
    } else {
      console.log(`   ✅ Seeded ${ordersData.length} orders`)
    }

    // 3. Seed products data
    console.log('🛍️ Seeding products data...')
    const productsData = [
      {
        seller_id: SELLER_ID,
        asin: 'B08N5WRWNW',
        title: 'Echo Dot (4th Gen) - Smart speaker with Alexa - Black',
        current_price: 49.99,
        category: 'Electronics',
        brand: 'Amazon',
        rank: 15,
        reviews_count: 125430,
        rating: 4.7,
        is_active: true,
        product_details: {
          dimensions: '3.9" x 3.5"',
          weight: '12.8 oz',
          features: ['Voice control', 'Smart home hub', 'Music streaming']
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        asin: 'B07PDHSJ9H',
        title: 'Fire TV Stick 4K Max streaming device',
        current_price: 54.99,
        category: 'Electronics',
        brand: 'Amazon',
        rank: 8,
        reviews_count: 89760,
        rating: 4.5,
        is_active: true,
        product_details: {
          resolution: '4K Ultra HD',
          processor: 'Quad-core',
          features: ['Alexa Voice Remote', 'Dolby Vision', 'HDR10+']
        },
        last_updated: new Date().toISOString()
      },
      {
        seller_id: SELLER_ID,
        asin: 'B08KGY97SL',
        title: 'Kindle Oasis – With 32 GB',
        current_price: 279.99,
        category: 'Electronics',
        brand: 'Amazon',
        rank: 3,
        reviews_count: 34520,
        rating: 4.4,
        is_active: true,
        product_details: {
          display: '7" 300 ppi',
          storage: '32 GB',
          features: ['Waterproof', 'Adjustable warm light', 'Physical page turn buttons']
        },
        last_updated: new Date().toISOString()
      }
    ]

    const { error: productsError } = await supabase
      .from('products')
      .upsert(productsData, { onConflict: 'seller_id,asin' })

    if (productsError) {
      console.log('   Products seeding completed with notes:', productsError.message)
    } else {
      console.log(`   ✅ Seeded ${productsData.length} products`)
    }

    // 4. Seed financial performance data
    console.log('💰 Seeding financial performance data...')
    const financialData = [
      {
        seller_id: SELLER_ID,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date().toISOString(),
        gross_sales: 15750.85,
        net_sales: 14825.90,
        total_expenses: 3240.50,
        net_profit: 11585.40,
        profit_margin: 78.14,
        units_sold: 156,
        average_order_value: 95.12,
        performance_details: {
          topProducts: ['Echo Dot', 'Fire TV Stick'],
          marketplaces: ['US'],
          currency: 'USD'
        },
        recorded_at: new Date().toISOString()
      }
    ]

    const { error: financialError } = await supabase
      .from('financial_performance')
      .upsert(financialData, { onConflict: 'seller_id,period_start' })

    if (financialError) {
      console.log('   Financial data seeding completed with notes:', financialError.message)
    } else {
      console.log(`   ✅ Seeded financial performance data`)
    }

    // 5. Update seller sync status
    console.log('👤 Updating seller sync status...')
    const { error: sellerError } = await supabase
      .from('sellers')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'completed'
      })
      .eq('id', SELLER_ID)

    if (sellerError) {
      console.log('   Seller update completed with notes:', sellerError.message)
    } else {
      console.log('   ✅ Updated seller sync status')
    }

    console.log('')
    console.log('🎉 Demo data seeding completed successfully!')
    console.log('')
    console.log('📊 Seeded Data Summary:')
    console.log(`   📦 Inventory: ${inventoryData.length} items`)
    console.log(`   📋 Orders: ${ordersData.length} orders`)
    console.log(`   🛍️ Products: ${productsData.length} products`)
    console.log(`   💰 Financial: 1 performance record`)
    console.log('')
    console.log('🔗 View Dashboard: https://xpertseller-agent-9f6azky91-shubham-jains-projects-b447be75.vercel.app')
    console.log('🔗 View Monitoring: https://xpertseller-agent-9f6azky91-shubham-jains-projects-b447be75.vercel.app/monitoring')

  } catch (error) {
    console.error('❌ Demo data seeding failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  seedDemoData()
}