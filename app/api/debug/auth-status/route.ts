import { NextRequest, NextResponse } from 'next/server'
import { SecureSessionManager } from '@/lib/auth/secure-session'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Auth Status Check')
    
    // Check all cookies
    const allCookies = request.cookies.getAll()
    console.log('📋 All cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    
    // Get auth token specifically
    const authToken = request.cookies.get('auth_token')?.value
    console.log('🔑 Auth token present:', !!authToken)
    console.log('🔑 Auth token preview:', authToken ? authToken.substring(0, 50) + '...' : 'null')
    
    if (!authToken) {
      return NextResponse.json({
        authenticated: false,
        error: 'No auth token cookie found',
        allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        environment: process.env.NODE_ENV,
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      })
    }
    
    // Validate the token
    const validation = await SecureSessionManager.validateSession(authToken)
    console.log('✅ Token validation result:', {
      valid: validation.valid,
      error: validation.error,
      hasSessionData: !!validation.sessionData
    })
    
    return NextResponse.json({
      authenticated: validation.valid,
      tokenPresent: true,
      validation: {
        valid: validation.valid,
        error: validation.error,
        sessionData: validation.sessionData ? {
          email: validation.sessionData.email,
          sellerId: validation.sessionData.sellerId.substring(0, 8) + '...',
          hasSessionId: !!validation.sessionData.sessionId
        } : null
      },
      environment: process.env.NODE_ENV,
      cookieCount: allCookies.length,
      host: request.headers.get('host')
    })
    
  } catch (error) {
    console.error('❌ Debug auth status error:', error)
    return NextResponse.json({
      authenticated: false,
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}