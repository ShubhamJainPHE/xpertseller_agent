import { NextRequest, NextResponse } from 'next/server'
import { AuthMiddleware } from '@/lib/auth/auth-middleware'

// Protected routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/home',
  '/settings',
  '/profile',
  '/api/dashboard',
  '/api/sellers',
  '/api/products',
  '/api/analytics'
]

// Public routes that don't require authentication
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register', 
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/health',
  '/api/debug',
  '/api/admin',
  '/api/amazon/oauth'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, images, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  console.log(`🔒 Middleware checking: ${pathname}`)

  // Check if route requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Use AuthMiddleware for page access validation
  const accessValidation = await AuthMiddleware.validatePageAccess(request)

  if (isProtectedPath) {
    // Protected route - require authentication
    if (!accessValidation.authenticated) {
      console.log(`🔒 Unauthenticated access to ${pathname}, redirecting to login`)
      const response = NextResponse.redirect(new URL('/auth/login', request.url))
      return AuthMiddleware.preventHistoryAccess(response)
    }

    // User is authenticated, allow access with security headers
    console.log(`✅ Authenticated access to ${pathname}`)
    const response = NextResponse.next()
    return AuthMiddleware.preventHistoryAccess(response)

  } else if (isPublicPath) {
    // Public route - check if authenticated user should be redirected
    if (accessValidation.shouldRedirect && accessValidation.redirectTo) {
      console.log(`🔄 Redirecting authenticated user from ${pathname} to ${accessValidation.redirectTo}`)
      return NextResponse.redirect(new URL(accessValidation.redirectTo, request.url))
    }

    // Allow public access
    return NextResponse.next()

  } else {
    // Unknown route - treat as protected by default for security
    if (!accessValidation.authenticated) {
      console.log(`🔒 Unknown route ${pathname} treated as protected, redirecting to login`)
      const response = NextResponse.redirect(new URL('/auth/login', request.url))
      return AuthMiddleware.preventHistoryAccess(response)
    }

    // Authenticated access to unknown route
    const response = NextResponse.next()
    return AuthMiddleware.preventHistoryAccess(response)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}