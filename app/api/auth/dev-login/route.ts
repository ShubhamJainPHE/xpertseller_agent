import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key')

async function createSessionToken(sellerId: string, email: string): Promise<string> {
  const token = await new SignJWT({ 
    sellerId, 
    email,
    type: 'session' 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)

  return token
}

export async function POST(request: Request) {
  try {
    const { email, otpCode } = await request.json()

    // Development mode only
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    console.log(`🚀 DEV LOGIN: ${email} with code ${otpCode}`)

    // Simple validation
    if (!email || !otpCode) {
      return NextResponse.json(
        { error: 'Email and OTP code are required' },
        { status: 400 }
      )
    }

    if (otpCode !== '123456') {
      return NextResponse.json(
        { error: 'Invalid OTP. Use 123456 in development mode.' },
        { status: 400 }
      )
    }

    // Create a mock seller ID
    const sellerId = `dev-${email.replace('@', '-').replace('.', '-')}`
    
    // Create session token
    const sessionToken = await createSessionToken(sellerId, email.toLowerCase())

    console.log(`✅ DEV LOGIN SUCCESS: ${email} -> ${sellerId}`)

    // Set HTTP-only cookie for session
    const response = NextResponse.json({
      success: true,
      message: 'Development login successful!',
      seller: {
        id: sellerId,
        email: email.toLowerCase(),
        verified: true,
        isNewUser: true
      },
      redirect: '/home?welcome=true'
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
    console.error('❌ Dev login error:', error)
    return NextResponse.json(
      { error: 'Development login failed' },
      { status: 500 }
    )
  }
}