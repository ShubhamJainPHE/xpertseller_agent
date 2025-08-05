import { NextRequest, NextResponse } from 'next/server'
import { SecureSessionManager } from './secure-session'

interface AuthenticatedRequest extends NextRequest {
  user?: {
    sellerId: string
    email: string
    sessionId: string
  }
}

export class AuthMiddleware {
  
  /**
   * Require authentication for protected routes
   */
  static requireAuth = async (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // Extract token from cookie or Authorization header
      const token = this.extractToken(request)
      
      if (!token) {
        return this.unauthorizedResponse('No authentication token provided')
      }

      // Validate session
      const validation = await SecureSessionManager.validateSession(token)
      
      if (!validation.valid || !validation.sessionData) {
        return this.unauthorizedResponse(validation.error || 'Invalid session')
      }

      // Add user data to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        sellerId: validation.sessionData.sellerId,
        email: validation.sessionData.email,
        sessionId: validation.sessionData.sessionId
      }

      // Call the protected handler
      return await handler(authenticatedRequest)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return this.unauthorizedResponse('Authentication failed')
    }
  }

  /**
   * Optional authentication (doesn't block if not authenticated)
   */
  static optionalAuth = async (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      const token = this.extractToken(request)
      
      if (token) {
        const validation = await SecureSessionManager.validateSession(token)
        
        if (validation.valid && validation.sessionData) {
          const authenticatedRequest = request as AuthenticatedRequest
          authenticatedRequest.user = {
            sellerId: validation.sessionData.sellerId,
            email: validation.sessionData.email,
            sessionId: validation.sessionData.sessionId
          }
        }
      }

      return await handler(request as AuthenticatedRequest)

    } catch (error) {
      console.error('Optional auth middleware error:', error)
      return await handler(request as AuthenticatedRequest)
    }
  }

  /**
   * CSRF protection middleware
   */
  static csrfProtection = async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    // Only apply CSRF protection to state-changing requests
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return await handler(request)
    }

    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')

    // Check origin header
    if (origin) {
      const originUrl = new URL(origin)
      if (originUrl.host !== host) {
        return NextResponse.json(
          { error: 'CSRF validation failed: Invalid origin' },
          { status: 403 }
        )
      }
    }

    // Check referer as fallback
    if (!origin && referer) {
      const refererUrl = new URL(referer)
      if (refererUrl.host !== host) {
        return NextResponse.json(
          { error: 'CSRF validation failed: Invalid referer' },
          { status: 403 }
        )
      }
    }

    // If neither origin nor referer, reject the request
    if (!origin && !referer) {
      return NextResponse.json(
        { error: 'CSRF validation failed: Missing origin/referer' },
        { status: 403 }
      )
    }

    return await handler(request)
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit = async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    options?: {
      windowMs?: number
      max?: number
      message?: string
    }
  ): Promise<NextResponse> => {
    const { windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = options || {}
    
    const ip = this.getClientIP(request)
    const key = `rate_limit:${ip}:${request.nextUrl.pathname}`
    
    // Simple in-memory rate limiting (in production, use Redis)
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, { count: 0, resetTime: Date.now() + windowMs })
    }

    const record = this.rateLimitStore.get(key)!
    
    if (Date.now() > record.resetTime) {
      record.count = 0
      record.resetTime = Date.now() + windowMs
    }

    if (record.count >= max) {
      return NextResponse.json(
        { 
          error: message,
          retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': record.resetTime.toString()
          }
        }
      )
    }

    record.count++
    
    const response = await handler(request)
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', max.toString())
    response.headers.set('X-RateLimit-Remaining', (max - record.count).toString())
    response.headers.set('X-RateLimit-Reset', record.resetTime.toString())
    
    return response
  }

  /**
   * Browser history protection
   */
  static preventHistoryAccess = (response: NextResponse): NextResponse => {
    // Prevent caching of authenticated pages
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  }

  /**
   * Session validation for pages (client-side)
   */
  static validatePageAccess = async (request: NextRequest): Promise<{
    authenticated: boolean
    shouldRedirect: boolean
    redirectTo?: string
  }> => {
    const token = this.extractToken(request)
    const pathname = request.nextUrl.pathname

    // Public routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/register', '/', '/api/auth/send-otp', '/api/auth/verify-otp']
    
    if (publicRoutes.includes(pathname)) {
      // If user is already authenticated and tries to access login, redirect to dashboard
      if (token) {
        const validation = await SecureSessionManager.validateSession(token)
        if (validation.valid) {
          return {
            authenticated: true,
            shouldRedirect: true,
            redirectTo: '/home'
          }
        }
      }
      return { authenticated: false, shouldRedirect: false }
    }

    // Protected routes require authentication
    if (!token) {
      return {
        authenticated: false,
        shouldRedirect: true,
        redirectTo: '/auth/login'
      }
    }

    const validation = await SecureSessionManager.validateSession(token)
    
    if (!validation.valid) {
      return {
        authenticated: false,
        shouldRedirect: true,
        redirectTo: '/auth/login'
      }
    }

    return { authenticated: true, shouldRedirect: false }
  }

  /**
   * Helper methods
   */
  private static extractToken(request: NextRequest): string | null {
    // Try cookie first (more secure)
    const cookieToken = request.cookies.get('auth_token')?.value
    if (cookieToken) return cookieToken

    // Try Authorization header as fallback
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    return null
  }

  private static unauthorizedResponse(message: string): NextResponse {
    const response = NextResponse.json(
      { error: message, authenticated: false },
      { status: 401 }
    )
    
    // Clear any existing auth cookies
    response.cookies.delete('auth_token')
    response.cookies.delete('refresh_token')
    
    return response
  }

  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfIP = request.headers.get('cf-connecting-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    if (cfIP) {
      return cfIP
    }

    return 'unknown'
  }

  // Simple in-memory rate limit store (use Redis in production)
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  /**
   * Cleanup rate limit store periodically
   */
  static cleanupRateLimit(): void {
    const now = Date.now()
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }
}

// Cleanup rate limit store every 5 minutes
setInterval(() => {
  AuthMiddleware.cleanupRateLimit()
}, 5 * 60 * 1000)

export default AuthMiddleware