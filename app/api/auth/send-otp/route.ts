import { NextResponse } from 'next/server'
import { OTPService } from '@/lib/auth/otp-service'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { RATE_LIMIT_CONFIG, AMAZON_CONFIG, DEFAULT_SELLER_PREFERENCES, API_MESSAGES } from '@/lib/config/constants'
import { ApiResponseHelper } from '@/lib/utils/api-response'

// Force Node.js runtime for crypto support
export const runtime = 'nodejs'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email}`
}

function checkRateLimit(key: string, maxRequests: number = RATE_LIMIT_CONFIG.otp.maxRequests, windowMs: number = RATE_LIMIT_CONFIG.otp.windowMs): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               '127.0.0.1'

    const { email } = await request.json()

    // Input validation
    if (!email || typeof email !== 'string') {
      return ApiResponseHelper.validationError('Email is required and must be a string')
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiResponseHelper.validationError(API_MESSAGES.errors.invalidEmail)
    }

    // Rate limiting by IP + Email
    const rateLimitKey = getRateLimitKey(ip, email.toLowerCase())
    if (!checkRateLimit(rateLimitKey)) {
      return ApiResponseHelper.rateLimited('Too many OTP requests. Please wait 1 hour before trying again.', 3600)
    }

    console.log(`📧 OTP request from ${email} (IP: ${ip})`)

    // Check if seller exists, create basic one if not
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    let seller = await supabase
      .from('sellers')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    // If no seller, create basic one
    if (!seller.data) {
      console.log(`👤 Creating basic seller record for ${email}`);
      seller = await supabase
        .from('sellers')
        .insert({
          email: email.toLowerCase(),
          amazon_seller_id: `PENDING_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          status: 'active',
          marketplace_ids: [AMAZON_CONFIG.defaultMarketplace],
          sp_api_credentials: { needsAuth: true },
          business_context: {},
          preferences: DEFAULT_SELLER_PREFERENCES,
          risk_tolerance: 0.5,
          onboarding_completed: false,
          subscription_tier: 'starter'
        })
        .select()
        .single();
      
      if (seller.error) {
        console.error('Failed to create seller:', seller.error);
        return ApiResponseHelper.serverError('Failed to create account. Please try again.');
      }
      
      console.log(`✅ Created seller account for ${email}: ${seller.data.id}`);
    }

    // Send OTP
    const result = await OTPService.sendOTP(email.toLowerCase().trim())

    // Log the attempt (for security monitoring)
    const logData = {
      email: email.toLowerCase(),
      ip_address: ip,
      user_agent: headersList.get('user-agent') || '',
      success: result.success,
      failure_reason: result.success ? null : result.message
    }

    // In production, you'd log this to your login_attempts table
    console.log('📊 OTP Send Attempt:', logData)

    if (result.success) {
      return ApiResponseHelper.success(result.message, { email: email.toLowerCase() })
    } else {
      return ApiResponseHelper.validationError(result.message)
    }

  } catch (error) {
    return ApiResponseHelper.handleUnknownError(error, 'Send OTP')
  }
}

// Health check endpoint
export async function GET() {
  return ApiResponseHelper.success('OTP Send API is healthy', {
    service: 'OTP Send API',
    timestamp: new Date().toISOString(),
    rateLimits: {
      maxRequestsPerHour: RATE_LIMIT_CONFIG.otp.maxRequests,
      windowMs: RATE_LIMIT_CONFIG.otp.windowMs
    }
  })
}