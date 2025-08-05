import { jwtVerify } from 'jose'

// Use the same secret as SecureSessionManager
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-that-should-be-set-in-production-env-vars'
)

interface CustomJWTPayload {
  sellerId: string
  email: string
  sessionId: string
  loginTime: number
  ipAddress?: string
  userAgent?: string
  type: 'access' | 'refresh'
  iat: number
  exp: number
}

export class MiddlewareAuth {
  /**
   * Simple JWT validation for middleware (Edge Runtime compatible)
   * Only validates token structure and expiry, no database checks
   */
  static async validateToken(token: string): Promise<{
    valid: boolean
    payload?: CustomJWTPayload
    error?: string
  }> {
    try {
      console.log(`🔑 Middleware: Starting JWT validation, token length: ${token.length}`)
      
      // Verify JWT token using jose (Edge Runtime compatible)
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const decoded = payload as unknown as CustomJWTPayload
      
      console.log(`🔍 Middleware: JWT decoded successfully, type: ${decoded.type}, sellerId: ${decoded.sellerId}`)

      // Check token type
      if (decoded.type !== 'access') {
        console.log(`❌ Middleware: Invalid token type: ${decoded.type}`)
        return { valid: false, error: 'Invalid token type' }
      }

      // Additional expiry check (jose handles this automatically, but let's be explicit)
      if (decoded.exp && Date.now() > decoded.exp * 1000) {
        console.log(`❌ Middleware: Token expired: ${new Date(decoded.exp * 1000)}`)
        return { valid: false, error: 'Token expired' }
      }

      // Basic validation passed
      console.log(`✅ Middleware: JWT validation successful for ${decoded.email}`)
      return { valid: true, payload: decoded }

    } catch (error) {
      console.error(`❌ Middleware: JWT validation exception:`, error)
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return { valid: false, error: 'Token expired' }
        }
        if (error.message.includes('invalid')) {
          return { valid: false, error: 'Invalid token' }
        }
      }
      return { valid: false, error: `Token validation failed: ${error}` }
    }
  }
}