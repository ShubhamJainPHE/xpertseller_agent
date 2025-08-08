import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    // Fetch all sellers from database
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching sellers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sellers', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: sellers?.length || 0,
      sellers: sellers || []
    })

  } catch (error) {
    console.error('❌ Admin list sellers API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}