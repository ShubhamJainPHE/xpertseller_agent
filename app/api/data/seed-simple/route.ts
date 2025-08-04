import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const { sellerId } = await request.json()
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
    }

    console.log('🚀 Starting simple seeding for seller:', sellerId)

    // Sample products with minimal required fields
    const products = [
      {
        seller_id: sellerId,
        asin: 'B08HEADPHONES',
        marketplace_id: 'ATVPDKIKX0DER',
        title: 'Wireless Bluetooth Headphones - Noise Cancelling',
        brand: 'TechSound',
        category: 'Electronics', 
        current_price: 24.99,
        cost_basis: 8.50,
        stock_level: 150,
        is_active: true
      },
      {
        seller_id: sellerId,
        asin: 'B08PHONECASE',
        marketplace_id: 'ATVPDKIKX0DER', 
        title: 'Phone Case Compatible with iPhone 15 Pro Max',
        brand: 'SafeGuard',
        category: 'Electronics',
        current_price: 12.99,
        cost_basis: 3.20,
        stock_level: 75,
        is_active: true
      },
      {
        seller_id: sellerId,
        asin: 'B08USBCABLE',
        marketplace_id: 'ATVPDKIKX0DER',
        title: 'USB-C Fast Charging Cable 6ft (2-Pack)', 
        brand: 'PowerLink',
        category: 'Electronics',
        current_price: 15.99,
        cost_basis: 4.80,
        stock_level: 200,
        is_active: true
      }
    ]

    console.log('📦 Inserting products...')
    
    // Insert products one by one to see which one fails
    const createdProducts = []
    const productErrors = []

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`Inserting product ${i + 1}: ${product.title}`)
      
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()

      if (error) {
        console.error(`Product ${i + 1} failed:`, error)
        productErrors.push({
          product: product.title,
          error: error.message,
          code: error.code
        })
      } else {
        console.log(`✅ Product ${i + 1} created successfully`)
        createdProducts.push(data)
      }
    }

    console.log(`📊 Created ${createdProducts.length} products`)

    // Create some sales data for the successful products
    let salesRecords = 0
    if (createdProducts.length > 0) {
      console.log('📈 Creating sales data...')
      
      const salesData = []
      const dates = []
      
      // Generate last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
      }

      for (const product of createdProducts) {
        for (const date of dates) {
          const unitsSold = Math.floor(Math.random() * 8 + 1) // 1-8 units per day
          const revenue = unitsSold * product.current_price
          const profit = unitsSold * (product.current_price - product.cost_basis) * 0.8 // 80% after fees
          
          salesData.push({
            product_id: product.id,
            date,
            units_sold: unitsSold,
            revenue: Math.round(revenue * 100) / 100,
            profit: Math.round(profit * 100) / 100
          })
        }
      }

      const { data: salesResult, error: salesError } = await supabase
        .from('sales_data')
        .insert(salesData)
      
      if (salesError) {
        console.warn('Sales data insert failed:', salesError.message)
      } else {
        salesRecords = salesData.length
        console.log(`✅ Created ${salesRecords} sales records`)
      }
    }

    // Create financial performance data
    let financialRecords = 0
    if (createdProducts.length > 0) {
      console.log('💰 Creating financial performance data...')
      
      const financialData = []
      const dates = []
      
      // Generate last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
      }

      for (const product of createdProducts) {
        for (const date of dates) {
          const unitsSold = Math.floor(Math.random() * 8 + 1) // 1-8 units per day
          const netSales = unitsSold * product.current_price
          const netProfit = unitsSold * (product.current_price - product.cost_basis) * 0.8 // 80% after fees
          
          financialData.push({
            seller_id: sellerId,
            asin: product.asin,
            date,
            net_sales: Math.round(netSales * 100) / 100,
            net_profit: Math.round(netProfit * 100) / 100,
            units_sold: unitsSold
          })
        }
      }

      const { data: financialResult, error: financialError } = await supabase
        .from('financial_performance')
        .insert(financialData)
      
      if (financialError) {
        console.warn('Financial data insert failed:', financialError.message)
      } else {
        financialRecords = financialData.length
        console.log(`✅ Created ${financialRecords} financial records`)
      }
    }

    const response = {
      success: true,
      message: `Successfully created sample data for ${createdProducts.length} products`,
      data: {
        products: createdProducts.length,
        salesRecords,
        financialRecords,
        errors: productErrors.length > 0 ? productErrors : undefined
      }
    }

    console.log('🎉 Seeding completed:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Simple seeding error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create sample data', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}