import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function POST(request: NextRequest) {
  try {
    // Get current authenticated seller from session
    const sessionToken = request.cookies.get('session-token')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    let sellerId: string
    let sellerEmail: string

    try {
      const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key')
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET)
      sellerId = payload.sellerId as string
      sellerEmail = payload.email as string

      if (!sellerId || !sellerEmail) {
        throw new Error('Invalid session payload')
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Generate state parameter with seller info encoded
    const stateData = {
      sellerId: sellerId,
      email: sellerEmail,
      timestamp: Date.now(),
      nonce: generateRandomString(16)
    }
    
    // Base64 encode the state data for secure transmission
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')
    
    // Amazon SP-API OAuth parameters
    const redirectUri = process.env.AMAZON_REDIRECT_URI || 'http://localhost:3000/api/auth/amazon/callback'
    const appId = process.env.AMAZON_APP_ID || 'amzn1.sp.solution.d7953206-bf82-4cbf-9142-c5a33f56aedd'
    
    const authUrl = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&version=beta`
    
    // Log the OAuth process
    console.log('🔗 Amazon OAuth initiated for seller:', sellerEmail)
    console.log('📋 App ID:', appId)
    console.log('🔄 Redirect URI:', redirectUri)
    console.log('🔐 State encoded with seller data')

    return NextResponse.json({
      success: true,
      authUrl: authUrl,
      state: state
    })

  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  
  return result
}