import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../database/connection'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const REFRESH_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

interface SessionData {
  sellerId: string
  email: string
  sessionId: string
  loginTime: number
  ipAddress?: string
  userAgent?: string
}

interface JWTPayload extends SessionData {
  iat: number
  exp: number
  type: 'access' | 'refresh'
}

export class SecureSessionManager {
  private static activeSessions = new Map<string, SessionData>()

  /**
   * Create secure session with JWT tokens
   */
  static async createSession(
    sellerId: string, 
    email: string, 
    request?: NextRequest
  ): Promise<{
    accessToken: string
    refreshToken: string
    sessionId: string
    expiresAt: number
  }> {
    const sessionId = crypto.randomUUID()
    const now = Date.now()
    const expiresAt = now + SESSION_DURATION

    const sessionData: SessionData = {
      sellerId,
      email,
      sessionId,
      loginTime: now,
      ipAddress: this.getClientIP(request),
      userAgent: request?.headers.get('user-agent') || undefined
    }

    // Store session in memory and database
    this.activeSessions.set(sessionId, sessionData)
    await this.storeSessionInDB(sessionData)

    // Create JWT tokens
    const accessToken = jwt.sign(
      { ...sessionData, type: 'access' },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const refreshToken = jwt.sign(
      { ...sessionData, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Update seller's last login
    await supabaseAdmin
      .from('sellers')
      .update({ 
        last_login_at: new Date(now).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresAt
    }
  }

  /**
   * Validate and verify session
   */
  static async validateSession(token: string): Promise<{
    valid: boolean
    sessionData?: SessionData
    error?: string
  }> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

      if (decoded.type !== 'access') {
        return { valid: false, error: 'Invalid token type' }
      }

      // Check if session exists in memory
      const sessionData = this.activeSessions.get(decoded.sessionId)
      if (!sessionData) {
        // Try to restore from database
        const dbSession = await this.getSessionFromDB(decoded.sessionId)
        if (!dbSession) {
          return { valid: false, error: 'Session not found' }
        }
        this.activeSessions.set(decoded.sessionId, dbSession)
        return { valid: true, sessionData: dbSession }
      }

      // Validate session hasn't expired
      if (Date.now() > decoded.exp * 1000) {
        await this.invalidateSession(decoded.sessionId)
        return { valid: false, error: 'Session expired' }
      }

      // Validate seller still exists and is active
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('id, status')
        .eq('id', sessionData.sellerId)
        .single()

      if (!seller || seller.status === 'suspended') {
        await this.invalidateSession(decoded.sessionId)
        return { valid: false, error: 'Account suspended or not found' }
      }

      return { valid: true, sessionData }

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' }
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' }
      }
      return { valid: false, error: 'Session validation failed' }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean
    accessToken?: string
    error?: string
  }> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as JWTPayload

      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Invalid refresh token' }
      }

      // Check if session is still valid
      const validation = await this.validateSession(refreshToken)
      if (!validation.valid || !validation.sessionData) {
        return { success: false, error: 'Session invalid' }
      }

      // Create new access token
      const newAccessToken = jwt.sign(
        { ...validation.sessionData, type: 'access' },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      return { success: true, accessToken: newAccessToken }

    } catch (error) {
      return { success: false, error: 'Refresh token invalid' }
    }
  }

  /**
   * Invalidate session (logout)
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    // Remove from memory
    this.activeSessions.delete(sessionId)

    // Remove from database
    await supabaseAdmin
      .from('active_sessions')
      .delete()
      .eq('session_id', sessionId)
  }

  /**
   * Invalidate all sessions for a seller
   */
  static async invalidateAllSessions(sellerId: string): Promise<void> {
    // Remove from memory
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (sessionData.sellerId === sellerId) {
        this.activeSessions.delete(sessionId)
      }
    }

    // Remove from database
    await supabaseAdmin
      .from('active_sessions')
      .delete()
      .eq('seller_id', sellerId)
  }

  /**
   * Store session in database for persistence
   */
  private static async storeSessionInDB(sessionData: SessionData): Promise<void> {
    try {
      await supabaseAdmin
        .from('active_sessions')
        .insert({
          session_id: sessionData.sessionId,
          seller_id: sessionData.sellerId,
          email: sessionData.email,
          login_time: new Date(sessionData.loginTime).toISOString(),
          ip_address: sessionData.ipAddress,
          user_agent: sessionData.userAgent,
          expires_at: new Date(sessionData.loginTime + SESSION_DURATION).toISOString(),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to store session in DB:', error)
    }
  }

  /**
   * Get session from database
   */
  private static async getSessionFromDB(sessionId: string): Promise<SessionData | null> {
    try {
      const { data } = await supabaseAdmin
        .from('active_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (!data) return null

      return {
        sellerId: data.seller_id,
        email: data.email,
        sessionId: data.session_id,
        loginTime: new Date(data.login_time).getTime(),
        ipAddress: data.ip_address,
        userAgent: data.user_agent
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined

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

  /**
   * Create secure HTTP-only cookies
   */
  static createSecureCookies(accessToken: string, refreshToken: string): {
    accessCookie: string
    refreshCookie: string
  } {
    const cookieOptions = 'HttpOnly; Secure; SameSite=Strict; Path=/'
    
    return {
      accessCookie: `auth_token=${accessToken}; Max-Age=${SESSION_DURATION / 1000}; ${cookieOptions}`,
      refreshCookie: `refresh_token=${refreshToken}; Max-Age=${REFRESH_DURATION / 1000}; ${cookieOptions}`
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now()

    // Clean memory
    for (const [sessionId, sessionData] of this.activeSessions.entries()) {
      if (now - sessionData.loginTime > SESSION_DURATION) {
        this.activeSessions.delete(sessionId)
      }
    }

    // Clean database
    await supabaseAdmin
      .from('active_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
  }

  /**
   * Get all active sessions for a seller
   */
  static async getActiveSessions(sellerId: string): Promise<SessionData[]> {
    const { data } = await supabaseAdmin
      .from('active_sessions')
      .select('*')
      .eq('seller_id', sellerId)
      .order('login_time', { ascending: false })

    return data?.map(session => ({
      sellerId: session.seller_id,
      email: session.email,
      sessionId: session.session_id,
      loginTime: new Date(session.login_time).getTime(),
      ipAddress: session.ip_address,
      userAgent: session.user_agent
    })) || []
  }

  /**
   * Session health check
   */
  static async sessionHealthCheck(): Promise<{
    totalActiveSessions: number
    memorySessionCount: number
    dbSessionCount: number
  }> {
    const memoryCount = this.activeSessions.size
    
    const { count: dbCount } = await supabaseAdmin
      .from('active_sessions')
      .select('*', { count: 'exact', head: true })

    return {
      totalActiveSessions: Math.max(memoryCount, dbCount || 0),
      memorySessionCount: memoryCount,
      dbSessionCount: dbCount || 0
    }
  }
}

export default SecureSessionManager