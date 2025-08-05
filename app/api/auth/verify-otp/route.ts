import { NextRequest, NextResponse } from 'next/server'
import { OTPService } from '@/lib/auth/otp-service'
import { SecureSessionManager } from '@/lib/auth/secure-session'
import { AuthMiddleware } from '@/lib/auth/auth-middleware'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  // Apply CSRF protection and rate limiting
  return await AuthMiddleware.csrfProtection(request, async (req) => {
    return await AuthMiddleware.rateLimit(req, async (rateLimitedReq) => {
      return await handleOTPVerification(rateLimitedReq as NextRequest)
    }, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes per IP
      message: 'Too many login attempts. Please try again later.'
    })
  })
}

async function handleOTPVerification(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json()
    const { email, otpCode } = requestBody

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

    console.log(`🔐 Secure OTP verification attempt for ${email}`)

    // Verify OTP
    const result = await OTPService.verifyOTP(email.toLowerCase().trim(), otpCode)

    if (!result.success) {
      console.log(`❌ OTP verification failed for ${email}: ${result.message}`)
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    const sellerId = result.sellerId
    console.log(`✅ OTP verified for ${email}, sellerId: ${sellerId}`)
    
    if (!sellerId) {
      console.log(`⚠️ No sellerId for ${email}, allowing basic login without session`)
      return NextResponse.json({
        success: true,
        message: 'Login successful! Account setup needed.',
        seller: {
          id: null,
          email: email.toLowerCase(),
          verified: true,
          needsSetup: true
        },
        redirect: '/auth/onboarding'
      })
    }

    // Create secure session using SecureSessionManager
    console.log(`🔄 Creating secure session for ${email}...`)
    const sessionData = await SecureSessionManager.createSession(
      sellerId,
      email.toLowerCase(),
      request
    )

    console.log(`✅ Secure session created for ${email}, sessionId: ${sessionData.sessionId}`)

    // Create secure response with browser history protection
    const response = NextResponse.json({
      success: true,
      message: 'Login successful! Redirecting securely...',
      seller: {
        id: sellerId,
        email: email.toLowerCase(),
        verified: true
      },
      redirect: '/home'
    })

    // Set secure HTTP-only cookies
    const cookies = SecureSessionManager.createSecureCookies(
      sessionData.accessToken,
      sessionData.refreshToken
    )

    console.log(`🍪 Setting cookies for ${email}:`)
    console.log(`   Access cookie: ${cookies.accessCookie}`)
    console.log(`   Refresh cookie: ${cookies.refreshCookie}`)

    // Set cookies individually (multiple Set-Cookie headers)
    response.headers.append('Set-Cookie', cookies.accessCookie)
    response.headers.append('Set-Cookie', cookies.refreshCookie)

    // Apply browser history protection
    return AuthMiddleware.preventHistoryAccess(response)

  } catch (error) {
    console.error('❌ Secure OTP verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}

// Validate current session - secured endpoint
export async function GET(request: NextRequest) {
  return await AuthMiddleware.requireAuth(request, async (authenticatedReq) => {
    try {
      const user = authenticatedReq.user!
      
      return NextResponse.json({
        success: true,
        authenticated: true,
        seller: {
          id: user.sellerId,
          email: user.email,
          sessionId: user.sessionId
        }
      })

    } catch (error) {
      console.error('❌ Session validation error:', error)
      return NextResponse.json(
        { error: 'Session validation failed' },
        { status: 500 }
      )
    }
  })
}