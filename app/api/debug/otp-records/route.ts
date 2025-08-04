import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Get recent OTP records for this email
    const { data: otpRecords, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching OTP records:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Don't expose actual OTP codes in production
    const sanitizedRecords = otpRecords?.map(record => ({
      id: record.id,
      email: record.email,
      otp_code: '***' + record.otp_code.slice(-2), // Show last 2 digits only
      expires_at: record.expires_at,
      attempts: record.attempts,
      verified: record.verified,
      created_at: record.created_at,
      is_expired: new Date() > new Date(record.expires_at)
    }))

    return NextResponse.json({
      success: true,
      records: sanitizedRecords,
      count: otpRecords?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug OTP records error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}