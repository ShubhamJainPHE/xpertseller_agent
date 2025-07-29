import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    console.log('🧪 Testing database connection...')
    
    // Test basic connection
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['sellers', 'otp_codes', 'login_attempts', 'user_sessions'])
    
    console.log('📋 Available tables:', tables)
    
    // Test OTP table insert
    const testOTP = {
      email: 'test@example.com',
      otp_code: '123456',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
      verified: false
    }
    
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .insert(testOTP)
      .select()
      .single()
    
    console.log('💾 OTP insert result:', { otpData, otpError })
    
    // Clean up test data
    if (otpData) {
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', otpData.id)
    }
    
    return NextResponse.json({
      success: true,
      tables: tables?.map(t => t.table_name),
      otpTest: {
        success: !otpError,
        error: otpError?.message,
        data: otpData ? 'Successfully inserted and cleaned up' : null
      }
    })
    
  } catch (error) {
    console.error('❌ Database test error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}