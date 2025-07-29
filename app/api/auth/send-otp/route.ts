import { NextResponse } from 'next/server'
import { SimpleOTPService } from '@/lib/auth/simple-otp'
import { headers } from 'next/headers'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email}`
}

function checkRateLimit(key: string, maxRequests: number = 3, windowMs: number = 60 * 60 * 1000): boolean {
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
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Rate limiting by IP + Email
    const rateLimitKey = getRateLimitKey(ip, email.toLowerCase())
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { 
          error: 'Too many OTP requests. Please wait 1 hour before trying again.',
          rateLimited: true
        },
        { status: 429 }
      )
    }

    console.log(`📧 OTP request from ${email} (IP: ${ip})`)

    // Send OTP
    const result = await SimpleOTPService.sendOTP(email.toLowerCase().trim())

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
      return NextResponse.json({
        success: true,
        message: result.message,
        email: email.toLowerCase()
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Send OTP API Error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'OTP Send API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rateLimits: {
      maxRequestsPerHour: 3,
      windowMs: 60 * 60 * 1000
    }
  })
}