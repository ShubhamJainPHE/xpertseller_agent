import { NextRequest, NextResponse } from 'next/server'
import { SecureSessionManager } from '@/lib/auth/secure-session'
import { AuthMiddleware } from '@/lib/auth/auth-middleware'

export async function POST(request: NextRequest) {
  return await AuthMiddleware.requireAuth(request, async (authenticatedReq) => {
    try {
      const user = authenticatedReq.user!
      
      console.log(`🔐 Secure logout initiated for user: ${user.email}`)

      // Invalidate the current session
      await SecureSessionManager.invalidateSession(user.sessionId)

      // Create response with session cleared
      const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully'
      })

      // Clear authentication cookies
      response.cookies.delete('auth_token')
      response.cookies.delete('refresh_token')

      // Apply browser history protection to prevent cached access
      const secureResponse = AuthMiddleware.preventHistoryAccess(response)

      console.log(`✅ Secure logout completed for user: ${user.email}`)
      
      return secureResponse

    } catch (error) {
      console.error('❌ Secure logout error:', error)
      
      // Even if logout fails, clear cookies for security
      const response = NextResponse.json(
        { error: 'Logout failed, but session cleared' },
        { status: 500 }
      )
      
      response.cookies.delete('auth_token')
      response.cookies.delete('refresh_token')
      
      return AuthMiddleware.preventHistoryAccess(response)
    }
  })
}

// Logout all sessions for current user
export async function DELETE(request: NextRequest) {
  return await AuthMiddleware.requireAuth(request, async (authenticatedReq) => {
    try {
      const user = authenticatedReq.user!
      
      console.log(`🔐 Logout all sessions initiated for user: ${user.email}`)

      // Invalidate all sessions for this user
      await SecureSessionManager.invalidateAllSessions(user.sellerId)

      const response = NextResponse.json({
        success: true,
        message: 'All sessions terminated successfully'
      })

      // Clear authentication cookies
      response.cookies.delete('auth_token')
      response.cookies.delete('refresh_token')

      console.log(`✅ All sessions terminated for user: ${user.email}`)
      
      return AuthMiddleware.preventHistoryAccess(response)

    } catch (error) {
      console.error('❌ Logout all sessions error:', error)
      
      const response = NextResponse.json(
        { error: 'Failed to terminate all sessions' },
        { status: 500 }
      )
      
      response.cookies.delete('auth_token')
      response.cookies.delete('refresh_token')
      
      return AuthMiddleware.preventHistoryAccess(response)
    }
  })
}