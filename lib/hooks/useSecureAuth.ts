'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SellerInfo {
  id: string
  email: string
  sessionId: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  seller: SellerInfo | null
  error: string | null
}

export function useSecureAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    seller: null,
    error: null
  })
  
  const router = useRouter()

  // Validate session with server
  const validateSession = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/auth/verify-otp', {
        method: 'GET',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          seller: data.seller,
          error: null
        })
        return true
      } else {
        // Session invalid or expired
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          seller: null,
          error: 'Session expired'
        })
        return false
      }
    } catch (error) {
      console.error('Session validation error:', error)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        seller: null,
        error: 'Authentication check failed'
      })
      return false
    }
  }, [])

  // Secure logout function
  const logout = useCallback(async (logoutAllSessions = false) => {
    try {
      const endpoint = logoutAllSessions ? '/api/auth/logout' : '/api/auth/logout'
      const method = logoutAllSessions ? 'DELETE' : 'POST'

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Clear auth state regardless of API response (for security)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        seller: null,
        error: null
      })

      // Force full page reload to clear any cached state
      window.location.href = '/auth/login'

    } catch (error) {
      console.error('Logout error:', error)
      
      // Still clear state and redirect for security
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        seller: null,
        error: null
      })
      
      window.location.href = '/auth/login'
    }
  }, [])

  // Require authentication (redirect if not authenticated)
  const requireAuth = useCallback(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.push('/auth/login')
      return false
    }
    return authState.isAuthenticated
  }, [authState.isAuthenticated, authState.isLoading, router])

  // Check authentication on mount and set up session monitoring
  useEffect(() => {
    validateSession()

    // Set up periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(validateSession, 5 * 60 * 1000)

    // Check session when page becomes visible (handles browser back/forward)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check session on focus (handles browser navigation)
    const handleFocus = () => {
      validateSession()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(sessionCheckInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [validateSession])

  return {
    ...authState,
    validateSession,
    logout,
    requireAuth,
    // Helper methods
    isReady: !authState.isLoading,
    hasValidSession: authState.isAuthenticated && !authState.error
  }
}

// HOC for protecting pages
export function withSecureAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, requireAuth } = useSecureAuth()

    useEffect(() => {
      if (!isLoading) {
        requireAuth()
      }
    }, [isAuthenticated, isLoading, requireAuth])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating session...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}