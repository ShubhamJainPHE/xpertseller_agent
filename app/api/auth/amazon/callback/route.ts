import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check if there was an error from Amazon
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error'
      console.error('Amazon OAuth error:', error, errorDescription)
      
      return NextResponse.redirect(
        new URL('/home?connection=failed&error=' + encodeURIComponent(errorDescription), request.url)
      )
    }

    // Validate state parameter (CSRF protection)
    // In a real app, you'd validate this against a stored state value
    if (!state) {
      return NextResponse.redirect(
        new URL('/home?connection=failed&error=invalid_state', request.url)
      )
    }

    // Exchange authorization code for tokens
    if (code) {
      try {
        // In production, you would make a request to Amazon's token endpoint
        const tokenResponse = await exchangeCodeForTokens(code)
        
        if (tokenResponse.success) {
          // Store tokens securely (in production, use database with encryption)
          // For demo, we'll just mark as connected
          
          return NextResponse.redirect(
            new URL('/home?connection=success', request.url)
          )
        } else {
          return NextResponse.redirect(
            new URL('/home?connection=failed&error=token_exchange_failed', request.url)
          )
        }
      } catch (tokenError) {
        console.error('Token exchange error:', tokenError)
        return NextResponse.redirect(
          new URL('/home?connection=failed&error=token_exchange_error', request.url)
        )
      }
    }

    // If no code, redirect back to home
    return NextResponse.redirect(new URL('/home', request.url))

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/home?connection=failed&error=callback_error', request.url)
    )
  }
}

async function exchangeCodeForTokens(code: string) {
  // In production, implement the actual token exchange with Amazon LWA
  // This is a placeholder for the OAuth flow
  
  try {
    // Amazon LWA token endpoint
    const tokenEndpoint = 'https://api.amazon.com/auth/o2/token'
    
    const tokenData = {
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET,
      redirect_uri: process.env.AMAZON_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/amazon/callback`
    }

    // In a real implementation, you would make this request:
    /*
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData).toString()
    })

    const tokens = await response.json()
    
    if (response.ok) {
      // Store tokens securely
      // tokens.access_token, tokens.refresh_token, etc.
      return { success: true, tokens }
    } else {
      return { success: false, error: tokens.error_description }
    }
    */

    // For demo purposes, simulate success
    console.log('Demo: Would exchange code for tokens:', { code, tokenData })
    return { 
      success: true, 
      tokens: {
        access_token: 'demo_access_token',
        refresh_token: 'demo_refresh_token',
        expires_in: 3600
      }
    }
    
  } catch (error) {
    console.error('Token exchange failed:', error)
    return { success: false, error: 'Token exchange failed' }
  }
}