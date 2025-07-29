import { supabase, supabaseAdmin } from '../database/connection'
import { Database } from '../database/types'

type Seller = Database['public']['Tables']['sellers']['Row']
type NewSeller = Database['public']['Tables']['sellers']['Insert']
type UpdateSeller = Database['public']['Tables']['sellers']['Update']

export class SellerAuth {
  
  /**
   * Create a new seller account
   */
  static async createSeller(sellerData: {
    email: string
    amazonSellerId: string
    marketplaceIds: string[]
    spApiCredentials: {
      clientId: string
      clientSecret: string
      refreshToken: string
    }
    businessContext?: any
    monthlyProfitTarget?: number
  }): Promise<{ seller: Seller | null; error: string | null }> {
    try {
      // Check if seller already exists
      const { data: existingSeller } = await supabaseAdmin
        .from('sellers')
        .select('id')
        .eq('email', sellerData.email)
        .single()

      if (existingSeller) {
        return { seller: null, error: 'Seller with this email already exists' }
      }

      // Create new seller with only existing columns
      const newSeller: NewSeller = {
        email: sellerData.email,
        amazon_seller_id: sellerData.amazonSellerId,
        marketplace_ids: sellerData.marketplaceIds,
        sp_api_credentials: sellerData.spApiCredentials,
        business_context: sellerData.businessContext || {},
        monthly_profit_target: sellerData.monthlyProfitTarget,
        status: 'trial',
        onboarding_completed: false
      }

      const { data, error } = await supabaseAdmin
        .from('sellers')
        .insert(newSeller)
        .select()
        .single()

      if (error) {
        return { seller: null, error: error.message }
      }

      return { seller: data, error: null }
    } catch (error) {
      return { seller: null, error: 'Failed to create seller account' }
    }
  }

  /**
   * Get seller by ID
   */
  static async getSellerById(sellerId: string): Promise<Seller | null> {
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single()

    if (error || !data) {
      return null
    }

    return data
  }

  /**
   * Get seller by email
   */
  static async getSellerByEmail(email: string): Promise<Seller | null> {
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return null
    }

    return data
  }

  /**
   * Update seller information
   */
  static async updateSeller(sellerId: string, updates: UpdateSeller): Promise<{ seller: Seller | null; error: string | null }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('sellers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sellerId)
        .select()
        .single()

      if (error) {
        return { seller: null, error: error.message }
      }

      return { seller: data, error: null }
    } catch (error) {
      return { seller: null, error: 'Failed to update seller' }
    }
  }

  /**
   * Complete onboarding process
   */
  static async completeOnboarding(sellerId: string, preferences: {
    riskTolerance: number
    autoExecuteThreshold: number
    notificationChannels: string[]
    workingHours: { start: string; end: string; timezone: string }
    maxDailySpend: number
    marginFloors: Record<string, number>
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabaseAdmin
        .from('sellers')
        .update({
          onboarding_completed: true,
          risk_tolerance: preferences.riskTolerance,
          preferences: {
            risk_tolerance: preferences.riskTolerance,
            auto_execute_threshold: preferences.autoExecuteThreshold,
            notification_channels: preferences.notificationChannels,
            working_hours: preferences.workingHours,
            max_daily_spend: preferences.maxDailySpend,
            margin_floors: preferences.marginFloors
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', sellerId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: 'Failed to complete onboarding' }
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(sellerId: string): Promise<void> {
    await supabaseAdmin
      .from('sellers')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)
  }

  /**
   * Check if seller has completed onboarding
   */
  static async isOnboardingComplete(sellerId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('sellers')
      .select('onboarding_completed')
      .eq('id', sellerId)
      .single()

    return data?.onboarding_completed || false
  }

  /**
   * Validate SP-API credentials
   */
  static async validateSpApiCredentials(credentials: {
    clientId: string
    clientSecret: string
    refreshToken: string
  }): Promise<{ valid: boolean; error?: string }> {
    // This would integrate with actual SP-API validation
    // For now, just check if credentials are provided
    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      return { valid: false, error: 'Missing required SP-API credentials' }
    }

    // TODO: Implement actual SP-API token validation
    return { valid: true }
  }

  /**
   * Get seller's business metrics
   */
  static async getSellerMetrics(sellerId: string): Promise<{
    totalProducts: number
    totalRevenue: number
    totalProfit: number
    averageMargin: number
  }> {
    // Get total products
    const { count: totalProducts } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('is_active', true)

    // Get product IDs for this seller first
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)

    const productIds = products?.map(p => p.id) || []

    // Get revenue and profit from sales data
    const { data: salesData } = await supabaseAdmin
      .from('sales_data')
      .select('revenue, profit')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .in('product_id', productIds)

    const totalRevenue = salesData?.reduce((sum, row) => sum + (row.revenue || 0), 0) || 0
    const totalProfit = salesData?.reduce((sum, row) => sum + (row.profit || 0), 0) || 0
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      totalProducts: totalProducts || 0,
      totalRevenue,
      totalProfit,
      averageMargin
    }
  }
}