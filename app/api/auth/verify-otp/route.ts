import { NextRequest, NextResponse } from 'next/server'
import { OTPService } from '@/lib/auth/otp-service'
import { SecureSessionManager } from '@/lib/auth/secure-session'
import { AuthMiddleware } from '@/lib/auth/auth-middleware'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/utils/api-response'
import { API_MESSAGES } from '@/lib/config/constants'

// Force Node.js runtime for crypto support
export const runtime = 'nodejs'

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
      return ApiResponseHelper.validationError('Email is required')
    }

    if (!otpCode || typeof otpCode !== 'string') {
      return ApiResponseHelper.validationError('OTP code is required')
    }

    // Validate OTP code format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return ApiResponseHelper.validationError(API_MESSAGES.errors.invalidOtp)
    }

    console.log(`🔐 Secure OTP verification attempt for ${email}`)

    // Verify OTP
    const result = await OTPService.verifyOTP(email.toLowerCase().trim(), otpCode)

    if (!result.success) {
      console.log(`❌ OTP verification failed for ${email}: ${result.message}`)
      return ApiResponseHelper.validationError(result.message)
    }

    const sellerId = result.sellerId
    console.log(`✅ OTP verified for ${email}, sellerId: ${sellerId}`)
    
    if (!sellerId) {
      console.log(`⚠️ No sellerId for ${email}, this shouldn't happen with new flow`)
      return NextResponse.json(
        { error: 'Account setup failed. Please try again.' },
        { status: 500 }
      )
    }

    // Get seller details to check Amazon connection
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .select('amazon_seller_id, sp_api_credentials')
      .eq('id', sellerId)
      .single();

    if (sellerError) {
      console.error('Error fetching seller data:', sellerError);
      return NextResponse.json(
        { error: 'Failed to check account status. Please try again.' },
        { status: 500 }
      );
    }

    // Check Amazon connection status
    const isAmazonConnected = sellerData.amazon_seller_id && 
                              !sellerData.amazon_seller_id.startsWith('PENDING');

    console.log(`🔍 Amazon connection check for ${email}: ${isAmazonConnected ? 'Connected' : 'Not Connected'}`);

    // Create secure session using SecureSessionManager
    console.log(`🔄 Creating secure session for ${email}...`)
    const sessionData = await SecureSessionManager.createSession(
      sellerId,
      email.toLowerCase(),
      request
    )

    console.log(`✅ Secure session created for ${email}, sessionId: ${sessionData.sessionId}`)

    // Determine redirect based on Amazon connection
    const redirectTo = isAmazonConnected ? '/dashboard' : '/connect-amazon';

    // Create secure response with browser history protection
    const response = ApiResponseHelper.success(
      API_MESSAGES.success.otpVerified,
      {
        seller: {
          id: sellerId,
          email: email.toLowerCase(),
          verified: true
        },
        redirectTo: redirectTo
      }
    )

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
    return ApiResponseHelper.handleUnknownError(error, 'OTP Verification')
  }
}

// Validate current session - secured endpoint
export async function GET(request: NextRequest) {
  return await AuthMiddleware.requireAuth(request, async (authenticatedReq) => {
    try {
      const user = authenticatedReq.user!
      
      return ApiResponseHelper.success(
        'Session valid',
        {
          authenticated: true,
          seller: {
            id: user.sellerId,
            email: user.email,
            sessionId: user.sessionId
          }
        }
      )

    } catch (error) {
      return ApiResponseHelper.handleUnknownError(error, 'Session Validation')
    }
  })
}