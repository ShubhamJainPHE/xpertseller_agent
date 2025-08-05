import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Generate a secure state parameter for CSRF protection
    const state = generateRandomString(32)
    
    // Amazon SP-API OAuth parameters - Correct format for MD5101 fix
    const redirectUri = process.env.AMAZON_REDIRECT_URI || 'http://localhost:3000/api/auth/amazon/callback'
    const appId = process.env.AMAZON_APP_ID || 'amzn1.sp.solution.d7953206-bf82-4cbf-9142-c5a33f56aedd'
    
    // Try different OAuth URL formats to bypass MD5101 error
    const authUrl = `https://sellercentral.amazon.com/apps/authorize/consent?application_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&version=beta`
    
    // Log the generated URL for debugging
    console.log('🔗 Generated Amazon OAuth URL:', authUrl)
    console.log('📋 App ID:', appId)
    console.log('🔄 Redirect URI:', redirectUri)

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