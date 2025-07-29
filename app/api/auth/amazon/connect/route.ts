import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Generate a secure state parameter for CSRF protection
    const state = generateRandomString(32)
    
    // Store state in a secure way (in production, use database or secure session)
    // For demo, we'll include it in the response to be stored client-side
    
    // Amazon LWA OAuth parameters
    const oauthParams = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.AMAZON_CLIENT_ID || 'YOUR_AMAZON_CLIENT_ID',
      redirect_uri: process.env.AMAZON_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/amazon/callback`,
      state: state,
      scope: 'sellingpartnerapi::notifications sellingpartnerapi::migration',
      version: 'beta'
    })

    // Amazon Seller Central OAuth URL
    const authUrl = `https://sellercentral.amazon.com/apps/authorize/consent?${oauthParams.toString()}`

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