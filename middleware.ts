import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-jwt-key')

// Protected routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/home',
  '/api/dashboard'
]

// Public routes that don't require authentication
const publicPaths = [
  '/',
  '/auth',
  '/api/auth',
  '/api/sellers', // Allow user registration
  '/admin'
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

  // Check if route requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Allow public paths
  if (isPublicPath && !isProtectedPath) {
    return NextResponse.next()
  }

  // For protected paths, verify session
  if (isProtectedPath) {
    const sessionToken = request.cookies.get('session-token')?.value

    if (!sessionToken) {
      console.log(`🔒 No session token for ${pathname}, redirecting to login`)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    try {
      // Verify JWT token
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET)
      
      if (!payload.sellerId || !payload.email) {
        throw new Error('Invalid token payload')
      }

      // Add seller info to request headers for API routes
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-seller-id', payload.sellerId as string)
      requestHeaders.set('x-seller-email', payload.email as string)

      console.log(`✅ Valid session for ${payload.email} accessing ${pathname}`)

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      })

    } catch (error) {
      console.log(`❌ Invalid session token for ${pathname}:`, error)
      
      // Clear invalid session cookie
      const response = NextResponse.redirect(new URL('/auth/login', request.url))
      response.cookies.delete('session-token')
      
      return response
    }
  }

  // Default: allow the request
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/home/:path*'
  ],
}