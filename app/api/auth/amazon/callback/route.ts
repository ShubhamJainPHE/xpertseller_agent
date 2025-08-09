import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/connection'
import { jwtVerify } from 'jose'

// Force Node.js runtime for crypto/jose support
export const runtime = 'nodejs'

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

      // Decode seller information from state parameter
      let sellerId: string
      let sellerEmail: string

      if (!state) {
        console.error('No state parameter found during OAuth callback')
        return NextResponse.redirect(
          new URL('/auth?error=missing_state', request.url)
        )
      }

      try {
        // Decode the state parameter to get seller info
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
        sellerId = stateData.sellerId

        if (!sellerId) {
          throw new Error('Invalid state data - missing sellerId')
        }

        // Check if state is not too old (30 minute expiry)
        const stateAge = Date.now() - stateData.timestamp
        if (stateAge > 30 * 60 * 1000) {
          throw new Error('State expired')
        }

        console.log('🔐 Successfully decoded seller ID from state:', sellerId)

      } catch (error) {
        console.error('Failed to decode state parameter:', error)
        return NextResponse.redirect(
          new URL('/auth?error=invalid_state', request.url)
        )
      }

      // Update existing seller with SP-API credentials
      const { data: seller, error: updateError } = await supabaseAdmin
        .from('sellers')
        .update({
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
        .eq('id', sellerId)
        .select()
        .single()

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
  
  console.log('🔑 Token exchange attempt:')
  console.log('CLIENT_ID exists:', !!process.env.AMAZON_CLIENT_ID)
  console.log('CLIENT_SECRET exists:', !!process.env.AMAZON_CLIENT_SECRET)
  console.log('REDIRECT_URI:', process.env.AMAZON_REDIRECT_URI || 'using fallback')
  console.log('CODE received:', code ? `${code.substring(0, 10)}...` : 'null')
  
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
        redirect_uri: process.env.AMAZON_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/amazon/callback`,
      }).toString()

  // Log debug info
  console.log('🔑 Token exchange debug:')
  console.log('  Timestamp:', new Date().toISOString())
  console.log('  Code received:', code ? `${code.substring(0, 10)}...` : 'null')
  console.log('  Code length:', code?.length || 0)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error(`Token request failed: ${response.status} ${response.statusText}`, responseText)
      
      // Try to parse error response
      try {
        const errorJson = JSON.parse(responseText)
        console.error('Parsed error:', errorJson)
      } catch {
        console.error('Raw error:', responseText)
      }
      
      throw new Error(`Token request failed: ${response.statusText}`)
    }

    const tokenData = JSON.parse(responseText)
    console.log('✅ Token exchange successful')
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
    }
  } catch (err: any) {
    console.error('❌ Token exchange failed:')
    console.error('Request URL:', url)
    console.error('Request body:', data)
    console.error('Error:', err.message)
    throw err
  }
}