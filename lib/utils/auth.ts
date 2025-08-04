import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../database/connection'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends NextRequest {
  sellerId?: string
  sellerData?: any
}

export async function authenticateSeller(request: NextRequest): Promise<{ 
  success: boolean
  sellerId?: string
  error?: string 
}> {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('x-api-key')
    const authHeader = request.headers.get('authorization')
    
    if (apiKey) {
      // API key authentication (for server-to-server)
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('id, status')
        .eq('api_key', apiKey)
        .eq('status', 'active')
        .single()
      
      if (seller) {
        return { success: true, sellerId: seller.id }
      }
    }
    
    if (authHeader?.startsWith('Bearer ')) {
      // JWT token authentication
      const token = authHeader.substring(7)
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sellerId: string }
        
        // Verify seller is still active
        const { data: seller } = await supabaseAdmin
          .from('sellers')
          .select('id, status')
          .eq('id', decoded.sellerId)
          .eq('status', 'active')
          .single()
        
        if (seller) {
          return { success: true, sellerId: seller.id }
        }
      } catch (jwtError) {
        return { success: false, error: 'Invalid token' }
      }
    }
    
    // For development/testing - allow test sellers
    if (process.env.NODE_ENV === 'development') {
      const testSellerId = request.headers.get('x-test-seller-id')
      if (testSellerId?.startsWith('test-')) {
        return { success: true, sellerId: testSellerId }
      }
    }
    
    return { success: false, error: 'Authentication required' }
    
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

export function generateSellerToken(sellerId: string, expiresIn: string = '24h'): string {
  const secret = process.env.JWT_SECRET!
  return jwt.sign(
    { sellerId },
    secret,
    { expiresIn } as jwt.SignOptions
  )
}

export async function checkSellerPermission(sellerId: string, resource: string): Promise<boolean> {
  try {
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('subscription_tier, permissions')
      .eq('id', sellerId)
      .single()
    
    if (!seller) return false
    
    // Check subscription tier permissions
    const tierPermissions = {
      starter: ['basic_analytics', 'notifications'],
      professional: ['basic_analytics', 'notifications', 'ai_agents', 'workflows'],
      enterprise: ['basic_analytics', 'notifications', 'ai_agents', 'workflows', 'advanced_ai', 'custom_integrations']
    }
    
    return tierPermissions[seller.subscription_tier as keyof typeof tierPermissions]?.includes(resource) || false
    
  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}