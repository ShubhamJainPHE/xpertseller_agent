import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Force Node.js runtime for crypto/jose support
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get sellerId from request body (passed from frontend)
    const body = await request.json().catch(() => ({}))
    const sellerId = body.sellerId

    if (!sellerId) {
      return NextResponse.json(
        { success: false, error: 'Seller ID required' },
        { status: 400 }
      )
    }

    // Generate simple state parameter for CSRF protection
    const stateData = {
      sellerId: sellerId,
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
    console.log('🔗 Amazon OAuth initiated for seller ID:', sellerId)
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