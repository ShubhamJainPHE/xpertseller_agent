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

    console.log('Starting minimal seeding for seller:', sellerId)

    // First, let's check what columns exist in the products table
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    console.log('Existing products check:', { existingProducts, checkError })

    // If checkError exists, it might be because table is empty, not because it doesn't exist
    // Let's try to insert directly and see what happens

    // Try to insert a very minimal product record
    const testProduct = {
      seller_id: sellerId,
      asin: 'B08TEST123',
      title: 'Test Product',
      marketplace_id: 'ATVPDKIKX0DER'
    }

    console.log('Attempting to insert minimal product:', testProduct)

    const { data: insertResult, error: insertError } = await supabase
      .from('products')
      .insert(testProduct)
      .select()
      .single()

    if (insertError) {
      console.error('Minimal product insert failed:', insertError)
      
      // Let's try with even fewer fields
      const ultraMinimalProduct = {
        seller_id: sellerId,
        asin: 'B08ULTRA123',
        title: 'Ultra Minimal Test Product'
      }

      console.log('Trying ultra minimal product:', ultraMinimalProduct)

      const { data: ultraResult, error: ultraError } = await supabase
        .from('products')
        .insert(ultraMinimalProduct)
        .select()
        .single()

      if (ultraError) {
        console.error('Ultra minimal insert also failed:', ultraError)
        return NextResponse.json({
          error: 'Cannot insert products',
          details: ultraError.message,
          originalError: insertError.message,
          suggestion: 'Database schema might be missing required columns or constraints'
        }, { status: 500 })
      }

      console.log('Ultra minimal product inserted successfully:', ultraResult)
      return NextResponse.json({
        success: true,
        message: 'Minimal test product created',
        data: {
          products: 1,
          product: ultraResult
        }
      })
    }

    console.log('Minimal product inserted successfully:', insertResult)

    // If the minimal insert worked, try to add a few more
    const additionalProducts = [
      {
        seller_id: sellerId,
        asin: 'B08TEST456',
        title: 'Wireless Headphones',
        marketplace_id: 'ATVPDKIKX0DER'
      },
      {
        seller_id: sellerId,
        asin: 'B08TEST789',
        title: 'Phone Case',
        marketplace_id: 'ATVPDKIKX0DER'
      }
    ]

    const { data: additionalResults, error: additionalError } = await supabase
      .from('products')
      .insert(additionalProducts)
      .select()

    let totalProducts = 1 // The first test product
    if (additionalError) {
      console.warn('Additional products failed:', additionalError.message)
    } else {
      totalProducts += additionalResults?.length || 0
      console.log(`Successfully created ${totalProducts} total products`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${totalProducts} test products`,
      data: {
        products: totalProducts,
        firstProduct: insertResult,
        additionalProducts: additionalResults || []
      }
    })

  } catch (error) {
    console.error('Minimal seeding error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create minimal test data', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}