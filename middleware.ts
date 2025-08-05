import { NextResponse, type NextRequest } from 'next/server'
import { MiddlewareAuth } from '@/lib/auth/middleware-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check for authentication using our custom JWT system
  const authToken = request.cookies.get('auth_token')?.value
  let isAuthenticated = false
  let sessionData = null

  console.log(`🔍 Middleware checking auth for ${pathname}, token present: ${!!authToken}`)

  if (authToken) {
    try {
      console.log(`🔑 Validating JWT token for ${pathname}`)
      const validation = await MiddlewareAuth.validateToken(authToken)
      isAuthenticated = validation.valid
      sessionData = validation.payload
      console.log(`✅ Token validation result: ${validation.valid}, payload: ${!!sessionData}`)
      if (!validation.valid && validation.error) {
        console.log(`❌ Validation error: ${validation.error}`)
      }
    } catch (error) {
      console.error('❌ Middleware auth validation error:', error)
      isAuthenticated = false
    }
  } else {
    console.log(`⚠️ No auth token found for ${pathname}`)
  }

  // Protected routes
  const protectedPaths = ['/dashboard', '/home', '/settings', '/profile']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !isAuthenticated) {
    console.log(`🔒 Redirecting unauthenticated user from ${pathname} to /auth/login`)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect authenticated users from login page
  if (pathname === '/auth/login' && isAuthenticated) {
    console.log(`🔄 Redirecting authenticated user from login to /home`)
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Add user data to request headers for server components
  const response = NextResponse.next()
  if (isAuthenticated && sessionData) {
    response.headers.set('x-user-id', sessionData.sellerId)
    response.headers.set('x-user-email', sessionData.email)
    response.headers.set('x-session-id', sessionData.sessionId)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}