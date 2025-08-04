import { NextRequest, NextResponse } from 'next/server'
import { SellerAuth } from '@/lib/auth/seller'
import { jwtVerify } from 'jose'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('spapi_oauth_code')
    const sellingPartnerId = searchParams.get('selling_partner_id')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check if there was an error from Amazon
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error'
      console.error('Amazon OAuth error:', error, errorDescription)
      
      return NextResponse.redirect(
        new URL('/dashboard?connection=failed&error=' + encodeURIComponent(errorDescription), request.url)
      )
    }

    // Validate required parameters
    if (!code || !sellingPartnerId) {
      return NextResponse.redirect(
        new URL('/dashboard?connection=failed&error=missing_parameters', request.url)
      )
    }

    // Exchange authorization code for tokens
    try {
      const { refreshToken, accessToken } = await getApiToken(null, code)
      
      if (!refreshToken || !accessToken) {
        return NextResponse.redirect(
          new URL('/dashboard?connection=failed&error=token_exchange_failed', request.url)
        )
      }

      // Get current authenticated seller from session
      const sessionToken = request.cookies.get('session-token')?.value
      
      if (!sessionToken) {
        console.error('No session token found during OAuth callback')
        return NextResponse.redirect(
          new URL('/auth/login?error=session_required', request.url)
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
        console.error('Invalid session during OAuth callback:', error)
        return NextResponse.redirect(
          new URL('/auth/login?error=invalid_session', request.url)
        )
      }

      // Update existing seller with SP-API credentials
      const { seller, error: updateError } = await SellerAuth.updateSeller(sellerId, {
        amazon_seller_id: sellingPartnerId,
        sp_api_credentials: {
          clientId: process.env.AMAZON_CLIENT_ID || '',
          clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
          refreshToken: refreshToken,
          accessToken: accessToken,
          tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        },
        onboarding_completed: true,
        status: 'active',
        last_login_at: new Date().toISOString()
      })

      if (updateError || !seller) {
        console.error('Failed to update seller with SP-API credentials:', updateError)
        return NextResponse.redirect(
          new URL('/dashboard?connection=failed&error=database_error', request.url)
        )
      }

      // Trigger data sync
      try {
        const syncUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/amazon/sync?sellerId=${seller.id}`
        fetch(syncUrl).catch(err => console.log('Sync trigger failed:', err))
      } catch (syncError) {
        console.log('Failed to trigger sync:', syncError)
      }

      return NextResponse.redirect(
        new URL('/dashboard?connection=success', request.url)
      )

    } catch (tokenError) {
      console.error('Token exchange error:', tokenError)
      return NextResponse.redirect(
        new URL('/dashboard?connection=failed&error=token_exchange_error', request.url)
      )
    }

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?connection=failed&error=callback_error', request.url)
    )
  }
}

async function getApiToken(
  refreshToken: string | null = null,
  code: string | null = null
) {
  const url = 'https://api.amazon.com/auth/o2/token'
  
  const data = refreshToken
    ? new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.AMAZON_CLIENT_ID || '',
        client_secret: process.env.AMAZON_CLIENT_SECRET || '',
      }).toString()
    : new URLSearchParams({
        grant_type: 'authorization_code',
        code: code || '',
        client_id: process.env.AMAZON_CLIENT_ID || '',
        client_secret: process.env.AMAZON_CLIENT_SECRET || '',
        redirect_uri: process.env.AMAZON_REDIRECT_URI || '',
      }).toString()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`Token request failed: ${response.status} ${response.statusText}`, errorData)
      throw new Error(`Token request failed: ${response.statusText}`)
    }

    const tokenData = await response.json()
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Keep existing refresh token if not returned
    }
  } catch (err: any) {
    console.error(
      `Failed to get access token. Error: ${err.message}`
    )
    throw err
  }
}