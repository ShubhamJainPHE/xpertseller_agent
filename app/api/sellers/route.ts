import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      businessName,
      geography,
      phoneNumber,
      email
    } = body

    console.log('📝 Creating seller with data:', { name, businessName, geography, phoneNumber, email })

    // Validate required fields
    if (!name || !businessName || !geography || !phoneNumber || !email) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Check if seller already exists
    const { data: existingSeller, error: checkError } = await supabase
      .from('sellers')
      .select('id')
      .eq('email', email)
      .single()

    if (existingSeller) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create seller in database
    const newSeller = {
      email,
      amazon_seller_id: `temp_${Date.now()}`, // Temporary until Amazon connection
      marketplace_ids: [geography.includes('United States') ? 'ATVPDKIKX0DER' : 'A1PA6795UKMFR9'],
      sp_api_credentials: {
        clientId: '',
        clientSecret: '',
        refreshToken: ''
      },
      business_context: {
        name,
        businessName,
        geography,
        phoneNumber,
        formData: { name, businessName, geography, phoneNumber, email }
      },
      status: 'trial',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📊 Inserting seller:', newSeller)

    const { data: seller, error } = await supabase
      .from('sellers')
      .insert(newSeller)
      .select()
      .single()

    if (error) {
      console.error('❌ Seller creation error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create seller account' },
        { status: 500 }
      )
    }

    console.log('✅ Seller created successfully:', seller.id)

    // Return success with seller ID
    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        email: seller.email,
        name,
        businessName,
        geography,
        phoneNumber
      }
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      )
    }

    // Fetch seller data
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single()

    if (error) {
      console.error('❌ Error fetching seller:', error)
      return NextResponse.json(
        { error: 'Failed to fetch seller data' },
        { status: 500 }
      )
    }

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(seller)

  } catch (error) {
    console.error('❌ GET sellers API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}