import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Helper function to generate realistic data
const generateMockData = {
  // Generate realistic ASIN
  asin: () => `B0${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.floor(Math.random() * 1000)}`,
  
  // Generate realistic dates
  dateRange: (days: number) => {
    const dates = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  },
  
  // Generate realistic price with some variance
  price: (base: number, variance: number = 0.2) => {
    const multiplier = 1 + (Math.random() - 0.5) * variance
    return Math.round(base * multiplier * 100) / 100
  },
  
  // Generate BSR with category-appropriate ranges
  bsr: (category: string) => {
    const ranges = {
      'Electronics': [1000, 50000],
      'Home & Kitchen': [500, 30000],
      'Health & Personal Care': [2000, 100000],
      'Sports & Outdoors': [1500, 75000]
    }
    const [min, max] = ranges[category as keyof typeof ranges] || [1000, 50000]
    return Math.floor(Math.random() * (max - min) + min)
  }
}

const sampleProducts = [
  {
    title: 'Wireless Bluetooth Headphones - Noise Cancelling Over Ear',
    brand: 'TechSound',
    category: 'Electronics',
    subcategory: 'Headphones & Earbuds',
    basePrice: 24.99,
    cogs: 8.50,
    monthlyVelocity: 126
  },
  {
    title: 'Phone Case Compatible with iPhone 15 Pro Max',
    brand: 'SafeGuard',
    category: 'Electronics', 
    subcategory: 'Phone Accessories',
    basePrice: 12.99,
    cogs: 3.20,
    monthlyVelocity: 89
  },
  {
    title: 'USB-C Fast Charging Cable 6ft (2-Pack)',
    brand: 'PowerLink',
    category: 'Electronics',
    subcategory: 'Cables & Chargers',
    basePrice: 15.99,
    cogs: 4.80,
    monthlyVelocity: 255
  },
  {
    title: 'Wireless Charging Pad 15W Qi-Certified',
    brand: 'ChargeTech',
    category: 'Electronics',
    subcategory: 'Wireless Chargers',
    basePrice: 19.99,
    cogs: 6.20,
    monthlyVelocity: 93
  },
  {
    title: 'Bluetooth Speaker Waterproof Portable',
    brand: 'SoundWave',
    category: 'Electronics',
    subcategory: 'Portable Speakers',
    basePrice: 39.99,
    cogs: 15.80,
    monthlyVelocity: 67
  }
]

export async function POST(request: Request) {
  try {
    const { sellerId } = await request.json()
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 })
    }

    // 1. Create Products - Check if table exists first
    const createdProducts = []
    
    try {
      // Test if products table exists by doing a simple select
      const { error: testError } = await supabase
        .from('products')
        .select('id')
        .limit(1)
      
      if (testError && testError.message.includes('does not exist')) {
        throw new Error('Products table does not exist. Please run database migrations first.')
      }
      
      for (const productTemplate of sampleProducts) {
        const asin = generateMockData.asin()
        const currentPrice = generateMockData.price(productTemplate.basePrice, 0.1)
        const listPrice = currentPrice * 1.15 // List price typically higher
        
        const product = {
          seller_id: sellerId,
          asin,
          marketplace_id: 'ATVPDKIKX0DER', // US marketplace
          title: productTemplate.title,
          brand: productTemplate.brand,
          category: productTemplate.category,
          subcategory: productTemplate.subcategory,
          current_price: currentPrice,
          list_price: listPrice,
          cost_basis: productTemplate.cogs,
          margin_floor: productTemplate.cogs * 1.5, // 50% markup minimum
          target_margin: productTemplate.cogs * 2.5, // 150% markup target
          min_price: productTemplate.cogs * 1.3, // Never sell below 30% markup
          max_price: listPrice * 1.2,
          stock_level: Math.floor(Math.random() * 500 + 50),
          reserved_quantity: Math.floor(Math.random() * 20),
          velocity_30d: productTemplate.monthlyVelocity / 30,
          lead_time_days: Math.floor(Math.random() * 14 + 7),
          reorder_point: Math.floor(productTemplate.monthlyVelocity * 0.5),
          is_fba: true,
          is_active: true,
          buy_box_percentage_30d: Math.random() * 0.8 + 0.1, // 10-90%
          session_percentage_30d: Math.random() * 0.05 + 0.01, // 1-6%
          conversion_rate_30d: Math.random() * 0.15 + 0.05 // 5-20%
        }
        
        const { data, error } = await supabase
          .from('products')
          .insert(product)
          .select()
          .single()
        
        if (error) throw error
        createdProducts.push({ ...data, template: productTemplate })
      }
    } catch (error) {
      console.error('Products creation error:', error)
      throw new Error(`Failed to create products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 2. Create Historical Sales Data (30 days)
    const salesData = []
    const dates = generateMockData.dateRange(30)
    
    for (const product of createdProducts) {
      for (const date of dates) {
        const dayOfWeek = new Date(date).getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const baseVelocity = product.template.monthlyVelocity / 30
        
        // Weekends typically have different sales patterns
        const velocityMultiplier = isWeekend ? 0.7 : 1.2
        const dailySales = Math.max(0, Math.floor(baseVelocity * velocityMultiplier * (0.8 + Math.random() * 0.4)))
        
        const revenue = dailySales * product.current_price
        const cogs = dailySales * product.cost_basis
        const amazonFees = revenue * 0.15 // Approximate 15% fees
        const profit = revenue - cogs - amazonFees
        
        salesData.push({
          product_id: product.id,
          date,
          units_sold: dailySales,
          units_ordered: dailySales,
          revenue,
          profit,
          sessions: Math.floor(dailySales / (product.conversion_rate_30d || 0.1) * (0.8 + Math.random() * 0.4)),
          page_views: Math.floor(dailySales / (product.conversion_rate_30d || 0.1) * 1.5 * (0.8 + Math.random() * 0.4)),
          conversion_rate: product.conversion_rate_30d * (0.8 + Math.random() * 0.4),
          buy_box_percentage: product.buy_box_percentage_30d * (0.8 + Math.random() * 0.4),
          organic_rank: Math.floor(Math.random() * 50 + 5),
          total_advertising_cost: revenue * (0.15 + Math.random() * 0.1), // 15-25% ACoS
          advertising_sales: revenue * (0.3 + Math.random() * 0.2) // 30-50% of sales from ads
        })
      }
    }

    const { error: salesError } = await supabase
      .from('sales_data')
      .insert(salesData)
    
    if (salesError) throw salesError

    // 3. Create Financial Performance Data
    const financialData = []
    for (const product of createdProducts) {
      for (const date of dates) {
        const salesForDate = salesData.find(s => s.product_id === product.id && s.date === date)
        if (!salesForDate) continue
        
        const grossSales = salesForDate.revenue
        const returns = grossSales * 0.05 // 5% return rate
        const netSales = grossSales - returns
        const referralFees = netSales * 0.08 // 8% referral fee
        const fbaFees = salesForDate.units_sold * 2.5 // $2.5 per unit FBA fee
        const amazonFees = referralFees + fbaFees
        const advertisingCosts = salesForDate.total_advertising_cost
        const cogs = salesForDate.units_sold * product.cost_basis
        const netProfit = netSales - amazonFees - advertisingCosts - cogs
        const profitMargin = netSales > 0 ? netProfit / netSales : 0
        
        financialData.push({
          seller_id: sellerId,
          asin: product.asin,
          date,
          gross_sales: grossSales,
          returns,
          net_sales: netSales,
          amazon_fees: amazonFees,
          referral_fees: referralFees,
          fba_fees: fbaFees,
          advertising_costs: advertisingCosts,
          cost_of_goods_sold: cogs,
          net_profit: netProfit,
          profit_margin: profitMargin,
          units_sold: salesForDate.units_sold,
          profit_per_unit: salesForDate.units_sold > 0 ? netProfit / salesForDate.units_sold : 0
        })
      }
    }

    const { error: financialError } = await supabase
      .from('financial_performance')
      .insert(financialData)
    
    if (financialError) throw financialError

    // 4. Create Market Intelligence Data
    const marketData = []
    for (const product of createdProducts) {
      for (const date of dates.slice(0, 7)) { // Weekly data
        marketData.push({
          seller_id: sellerId,
          asin: product.asin,
          marketplace_id: product.marketplace_id,
          date,
          best_seller_rank: generateMockData.bsr(product.category),
          bsr_category: product.category,
          estimated_monthly_sales: product.template.monthlyVelocity * (0.8 + Math.random() * 0.4),
          estimated_monthly_revenue: product.template.monthlyVelocity * product.current_price * (0.8 + Math.random() * 0.4),
          review_rating: 3.5 + Math.random() * 1.5, // 3.5-5.0 rating
          review_count: Math.floor(Math.random() * 2000 + 100),
          price: product.current_price * (0.95 + Math.random() * 0.1), // Small price variance
          availability_status: 'in_stock',
          buy_box_winner: Math.random() > 0.3 ? 'you' : 'competitor',
          competitor_count: Math.floor(Math.random() * 20 + 5),
          market_share_estimate: Math.random() * 0.1 + 0.01 // 1-11% market share
        })
      }
    }

    const { error: marketError } = await supabase
      .from('market_intelligence')
      .insert(marketData)
    
    if (marketError) throw marketError

    // 5. Create FBA Inventory Data
    const inventoryData = []
    for (const product of createdProducts) {
      const totalQty = product.stock_level
      const reservedQty = product.reserved_quantity
      const sellableQty = totalQty - reservedQty
      
      inventoryData.push({
        seller_id: sellerId,
        asin: product.asin,
        sku: `SKU-${product.asin}`,
        fnsku: `X001${product.asin.slice(-6)}`,
        marketplace_id: product.marketplace_id,
        fulfillment_center_id: `US${Math.floor(Math.random() * 20 + 1)}`,
        total_quantity: totalQty,
        sellable_quantity: sellableQty,
        unsellable_quantity: Math.floor(Math.random() * 5),
        reserved_quantity: reservedQty,
        inbound_working_quantity: Math.floor(Math.random() * 100),
        per_unit_volume: Math.random() * 0.01 + 0.001, // cubic feet
        total_volume: totalQty * (Math.random() * 0.01 + 0.001),
        days_of_supply: Math.floor(totalQty / (product.velocity_30d || 1)),
        storage_fees: totalQty * 0.75, // $0.75 per unit per month
        long_term_storage_fees: Math.random() * 50
      })
    }

    const { error: inventoryError } = await supabase
      .from('fba_inventory')
      .insert(inventoryData)
    
    if (inventoryError) throw inventoryError

    // 6. Create Sample Recommendations
    const recommendations = [
      {
        seller_id: sellerId,
        asin: createdProducts[0].asin,
        marketplace_id: 'ATVPDKIKX0DER',
        agent_type: 'loss_prevention',
        recommendation_type: 'inventory_alert',
        title: 'Low Stock Alert - Immediate Restocking Required',
        description: `Your ${createdProducts[0].title} is running low on inventory. Based on current sales velocity, you have only 6 days of stock remaining.`,
        predicted_impact: 500.00,
        confidence_score: 0.92,
        risk_level: 'high',
        priority: 9,
        urgency_level: 'critical',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      {
        seller_id: sellerId,
        asin: createdProducts[1].asin,
        marketplace_id: 'ATVPDKIKX0DER',
        agent_type: 'revenue_optimization',
        recommendation_type: 'price_increase',
        title: 'Price Optimization Opportunity',
        description: `Consider increasing the price of ${createdProducts[1].title} by 15%. Market analysis shows you're underpriced vs competitors.`,
        predicted_impact: 245.00,
        confidence_score: 0.78,
        risk_level: 'medium',
        priority: 6,
        urgency_level: 'normal',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      }
    ]

    const { error: recommendationsError } = await supabase
      .from('recommendations')
      .insert(recommendations)
    
    if (recommendationsError) throw recommendationsError

    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        products: createdProducts.length,
        salesRecords: salesData.length,
        financialRecords: financialData.length,
        marketRecords: marketData.length,
        inventoryRecords: inventoryData.length,
        recommendations: recommendations.length
      }
    })

  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}