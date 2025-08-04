import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...')

    // Test basic connection
    const { data: basicTest, error: basicError } = await supabaseAdmin
      .from('sellers')
      .select('count')
      .limit(1)

    console.log('Basic connection test:', { basicTest, basicError })

    // Test OTP table
    const { data: otpTest, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('count')
      .limit(1)

    console.log('OTP table test:', { otpTest, otpError })

    // Test environment variables
    const envCheck = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      jwtSecret: !!process.env.JWT_SECRET,
      resendApiKey: !!process.env.RESEND_API_KEY
    }

    console.log('Environment variables check:', envCheck)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checks: {
        basicConnection: !basicError,
        otpTable: !otpError,
        environment: envCheck
      },
      errors: {
        basic: basicError?.message,
        otp: otpError?.message
      }
    })

  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}