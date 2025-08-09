'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthUser {
  id: string
  email: string
  sessionId: string
  amazon_seller_id?: string
}

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  checkAuthAndRedirect: () => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuthAndRedirect = async () => {
    try {
      setLoading(true)
      
      // Check session validity
      const sessionResponse = await fetch('/api/auth/verify-otp', {
        method: 'GET',
        credentials: 'include'
      })

      if (!sessionResponse.ok) {
        router.push('/auth')
        return
      }

      const sessionData = await sessionResponse.json()
      const sellerId = sessionData.seller?.id

      if (!sellerId) {
        router.push('/auth')
        return
      }

      // Get complete user data
      const userResponse = await fetch(`/api/sellers?sellerId=${sellerId}`, {
        credentials: 'include'
      })
      
      if (!userResponse.ok) {
        console.error('Failed to fetch user data')
        router.push('/auth')
        return
      }

      const userData = await userResponse.json()
      setUser({
        id: userData.id,
        email: userData.email,
        sessionId: sessionData.seller.sessionId,
        amazon_seller_id: userData.amazon_seller_id
      })
      
      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    }
  }

  const logout = async () => {
    try {
      // Call logout API if it exists
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout API failed:', error)
    } finally {
      setUser(null)
      router.push('/auth')
    }
  }

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    checkAuthAndRedirect,
    logout
  }
}

// Specialized hook for pages that require Amazon connection
export function useAuthWithAmazon(): UseAuthReturn & { 
  isAmazonConnected: boolean 
  redirectToAmazonIfNeeded: () => void 
} {
  const auth = useAuth()
  const router = useRouter()

  const isAmazonConnected = auth.user?.amazon_seller_id && 
                           !auth.user.amazon_seller_id.startsWith('PENDING')

  const redirectToAmazonIfNeeded = () => {
    if (auth.isAuthenticated && !isAmazonConnected) {
      router.push('/connect-amazon')
    }
  }

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      redirectToAmazonIfNeeded()
    }
  }, [auth.loading, auth.isAuthenticated, isAmazonConnected])

  return {
    ...auth,
    isAmazonConnected: !!isAmazonConnected,
    redirectToAmazonIfNeeded
  }
}