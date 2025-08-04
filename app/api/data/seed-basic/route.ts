import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Simplified seeding that only uses core tables we know exist
const sampleProducts = [
  {
    title: 'Wireless Bluetooth Headphones - Noise Cancelling Over Ear',
    brand: 'TechSound',
    category: 'Electronics',
    basePrice: 24.99,
    cogs: 8.50
  },
  {
    title: 'Phone Case Compatible with iPhone 15 Pro Max',
    brand: 'SafeGuard',
    category: 'Electronics', 
    basePrice: 12.99,
    cogs: 3.20
  },
  {
    title: 'USB-C Fast Charging Cable 6ft (2-Pack)',
    brand: 'PowerLink',
    category: 'Electronics',
    basePrice: 15.99,
    cogs: 4.80
  }
]

// Helper function to generate realistic ASIN
const generateAsin = () => `B0${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.floor(Math.random() * 1000)}`

export async function POST(request: Request) {
  try {
    const { sellerId } = await request.json()
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
    }

    console.log('Starting basic seeding for seller:', sellerId)

    // 1. Try to insert products using the basic structure
    const createdProducts = []
    
    for (const productTemplate of sampleProducts) {
      const asin = generateAsin()
      const currentPrice = productTemplate.basePrice * (0.9 + Math.random() * 0.2) // ±10% variation
      
      const product = {
        seller_id: sellerId,
        asin,
        marketplace_id: 'ATVPDKIKX0DER',
        title: productTemplate.title,
        brand: productTemplate.brand,
        category: productTemplate.category,
        current_price: currentPrice,
        cost_basis: productTemplate.cogs,
        stock_level: Math.floor(Math.random() * 200 + 50),
        is_active: true
      }
      
      console.log('Inserting product:', product.title)
      
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()
      
      if (error) {
        console.error('Product insert error:', error)
        throw new Error(`Failed to insert product: ${error.message}`)
      }
      
      createdProducts.push(data)
    }

    console.log(`Created ${createdProducts.length} products`)

    // 2. Try to create some sales data if the table exists
    let salesRecords = 0
    try {
      const salesData = []
      const dates = []
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toISOString().split('T')[0])
      }
      
      for (const product of createdProducts) {
        for (const date of dates) {
          const unitsSold = Math.floor(Math.random() * 10 + 1)
          const revenue = unitsSold * product.current_price
          const profit = unitsSold * (product.current_price - product.cost_basis) * 0.8 // Account for fees
          
          salesData.push({
            product_id: product.id,
            date,
            units_sold: unitsSold,
            revenue,
            profit
          })
        }
      }
      
      const { error: salesError } = await supabase
        .from('sales_data')
        .insert(salesData)
      
      if (salesError) {
        console.warn('Sales data insert failed:', salesError.message)
      } else {
        salesRecords = salesData.length
        console.log(`Created ${salesRecords} sales records`)
      }
    } catch (salesErr) {
      console.warn('Sales data creation skipped:', salesErr instanceof Error ? salesErr.message : 'Unknown error')
    }

    // 3. Try to create some recommendations if table exists
    let recommendationCount = 0
    try {
      const recommendations = [
        {
          seller_id: sellerId,
          asin: createdProducts[0].asin,
          agent_type: 'loss_prevention',
          recommendation_type: 'inventory_alert',
          title: 'Low Stock Alert',
          description: `Your ${createdProducts[0].title} is running low on inventory.`,
          predicted_impact: 500.00,
          confidence_score: 0.92,
          risk_level: 'high',
          priority: 9,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      const { error: recError } = await supabase
        .from('recommendations')
        .insert(recommendations)
      
      if (recError) {
        console.warn('Recommendations insert failed:', recError.message)
      } else {
        recommendationCount = recommendations.length
        console.log(`Created ${recommendationCount} recommendations`)
      }
    } catch (recErr) {
      console.warn('Recommendations creation skipped:', recErr instanceof Error ? recErr.message : 'Unknown error')
    }

    return NextResponse.json({
      success: true,
      message: 'Basic sample data created successfully',
      data: {
        products: createdProducts.length,
        salesRecords,
        recommendations: recommendationCount
      }
    })

  } catch (error) {
    console.error('Basic seeding error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create basic sample data', 
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}