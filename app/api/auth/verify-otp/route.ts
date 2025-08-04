import { NextResponse } from 'next/server'
import { SimpleOTPService } from '@/lib/auth/simple-otp'
import { headers } from 'next/headers'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// JWT secret for session tokens
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key')

async function createSessionToken(sellerId: string, email: string): Promise<string> {
  const token = await new SignJWT({ 
    sellerId, 
    email,
    type: 'session' 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // 8 hour session
    .sign(JWT_SECRET)

  return token
}

async function createUserSession(sellerId: string, sessionToken: string, ip: string, userAgent: string) {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours

  try {
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        seller_id: sellerId,
        session_token: sessionToken,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt
      })

    if (error) {
      console.error('Error creating user session:', error)
      // Don't fail the login if session creation fails
      return false
    }
    return true
  } catch (error) {
    console.error('Session table might not exist:', error)
    // Don't fail the login if session table doesn't exist
    return false
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               '127.0.0.1'
    const userAgent = headersList.get('user-agent') || 'Unknown'

    const { email, otpCode } = await request.json()

    // Input validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!otpCode || typeof otpCode !== 'string') {
      return NextResponse.json(
        { error: 'OTP code is required' },
        { status: 400 }
      )
    }

    // Validate OTP code format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { error: 'OTP code must be 6 digits' },
        { status: 400 }
      )
    }

    console.log(`🔐 OTP verification attempt for ${email} (IP: ${ip})`)

    // Verify OTP
    const result = await SimpleOTPService.verifyOTP(email.toLowerCase().trim(), otpCode)

    if (!result.success) {
      // Log failed attempt
      const logData = {
        email: email.toLowerCase(),
        ip_address: ip,
        user_agent: userAgent,
        success: false,
        failure_reason: result.message
      }

      await supabase.from('login_attempts').insert(logData)

      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // The OTP service has already created the seller if needed
    const sellerId = result.sellerId
    
    if (!sellerId) {
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 400 }
      )
    }
    
    // Check if this was a newly created account
    const { data: sellerData } = await supabase
      .from('sellers')
      .select('business_context')
      .eq('id', sellerId)
      .single()
    
    const isNewUser = sellerData?.business_context?.isAutoCreated === true

    // Log successful attempt
    const logData = {
      email: email.toLowerCase(),
      ip_address: ip,
      user_agent: userAgent,
      success: true,
      failure_reason: null
    }

    await supabase.from('login_attempts').insert(logData)

    // Create session token
    const sessionToken = await createSessionToken(sellerId, email.toLowerCase())

    // Store session in database (optional, won't fail login if it fails)
    const sessionCreated = await createUserSession(sellerId, sessionToken, ip, userAgent)
    if (!sessionCreated) {
      console.log('⚠️ Session storage failed, but login will continue')
    }

    // Update seller login info (skip fields that don't exist yet)
    await supabase
      .from('sellers')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)

    console.log(`✅ Successful login for ${email} ${isNewUser ? '(new user)' : '(existing user)'}`)

    // Set HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      message: isNewUser ? 'Welcome to XpertSeller! Your account has been created.' : 'Welcome back!',
      seller: {
        id: sellerId,
        email: email.toLowerCase(),
        verified: true,
        isNewUser
      },
      redirect: isNewUser ? '/home?welcome=true' : '/home'
    })

    // Set secure session cookie
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('❌ Verify OTP API Error:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

// Get current session info
export async function GET(request: Request) {
  try {
    const headersList = await headers()
    const sessionToken = headersList.get('cookie')?.split('session-token=')[1]?.split(';')[0]

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }

    // Validate session
    const { data: sessionData, error } = await supabase
      .from('user_sessions')
      .select(`
        seller_id,
        expires_at,
        is_active,
        sellers (
          id,
          email,
          business_context,
          onboarding_completed
        )
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single()

    if (error || !sessionData) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date() > new Date(sessionData.expires_at)) {
      // Mark session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken)

      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      seller: sessionData.sellers,
      expiresAt: sessionData.expires_at
    })

  } catch (error) {
    console.error('❌ Session validation error:', error)
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    )
  }
}