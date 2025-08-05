import { NextRequest, NextResponse } from 'next/server'

// Store last error for debugging
let lastError: any = null
let lastRequest: any = null

export async function GET(request: NextRequest) {
  try {
    // Try to get real OAuth debug data from callback
    const { debugData } = await import('../../auth/amazon/callback/route')
    
    return NextResponse.json({
      realOAuthData: debugData,
      testData: {
        lastError,
        lastRequest
      },
      timestamp: new Date().toISOString(),
      source: debugData ? 'real_oauth_attempt' : 'test_data_only'
    })
  } catch (importError) {
    return NextResponse.json({
      realOAuthData: null,
      testData: {
        lastError,
        lastRequest
      },
      timestamp: new Date().toISOString(),
      source: 'test_data_only',
      importError: importError instanceof Error ? importError.message : 'Unknown import error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, redirect_uri } = body
    
    console.log('🧪 Debug: Testing token exchange with:', { code, redirect_uri })
    
    const url = 'https://api.amazon.com/auth/o2/token'
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code || 'test_code',
      client_id: process.env.AMAZON_CLIENT_ID || '',
      client_secret: process.env.AMAZON_CLIENT_SECRET || '',
      redirect_uri: redirect_uri || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/amazon/callback`,
    }).toString()

    lastRequest = {
      url,
      body: data,
      env_vars: {
        has_client_id: !!process.env.AMAZON_CLIENT_ID,
        has_client_secret: !!process.env.AMAZON_CLIENT_SECRET,
        has_redirect_uri: !!process.env.AMAZON_REDIRECT_URI,
        base_url: process.env.NEXT_PUBLIC_BASE_URL
      }
    }

    console.log('🔑 Making request to Amazon:', lastRequest)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data
    })

    const responseText = await response.text()
    console.log('📡 Amazon response:', responseText)

    if (!response.ok) {
      lastError = {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        timestamp: new Date().toISOString()
      }
      
      return NextResponse.json({
        success: false,
        error: lastError
      })
    }

    const tokenData = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      tokens: tokenData
    })

  } catch (error) {
    lastError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
    
    console.error('❌ Debug endpoint error:', lastError)
    
    return NextResponse.json({
      success: false,
      error: lastError
    })
  }
}