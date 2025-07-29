// Mock database for testing without Supabase
// This simulates the database operations by logging to console

interface MockSeller {
  id: string
  email: string
  amazon_seller_id: string
  marketplace_ids: string[]
  sp_api_credentials: any
  business_context: any
  preferences: any
  risk_tolerance: number
  onboarding_completed: boolean
  subscription_tier: string
  monthly_profit_target: number | null
  created_at: string
  updated_at: string
  status: string
}

// In-memory storage (will reset on server restart)
const mockSellers: MockSeller[] = []
let mockIdCounter = 1

export class MockDatabase {
  
  static async createSeller(sellerData: {
    email: string
    amazonSellerId: string
    marketplaceIds: string[]
    spApiCredentials: any
    businessContext?: any
    monthlyProfitTarget?: number
  }): Promise<{ seller: MockSeller | null; error: string | null }> {
    
    console.log('\n🎯 MOCK DATABASE: Creating new seller')
    console.log('📧 Email:', sellerData.email)
    console.log('🏪 Amazon Seller ID:', sellerData.amazonSellerId)
    console.log('🌍 Marketplaces:', sellerData.marketplaceIds)
    console.log('💼 Business Context:', JSON.stringify(sellerData.businessContext, null, 2))
    console.log('💰 Monthly Profit Target:', sellerData.monthlyProfitTarget)
    console.log('🔑 SP-API Credentials:', {
      clientId: sellerData.spApiCredentials.clientId ? '✅ Provided' : '❌ Missing',
      clientSecret: sellerData.spApiCredentials.clientSecret ? '✅ Provided' : '❌ Missing',
      refreshToken: sellerData.spApiCredentials.refreshToken ? '✅ Provided' : '❌ Missing'
    })

    // Check if seller already exists
    const existingSeller = mockSellers.find(s => s.email === sellerData.email)
    if (existingSeller) {
      console.log('❌ Seller already exists with this email')
      return { seller: null, error: 'Seller with this email already exists' }
    }

    // Create new seller
    const newSeller: MockSeller = {
      id: `mock-seller-${mockIdCounter++}`,
      email: sellerData.email,
      amazon_seller_id: sellerData.amazonSellerId,
      marketplace_ids: sellerData.marketplaceIds,
      sp_api_credentials: sellerData.spApiCredentials,
      business_context: sellerData.businessContext || {},
      preferences: {},
      risk_tolerance: 0.5,
      onboarding_completed: false,
      subscription_tier: 'trial',
      monthly_profit_target: sellerData.monthlyProfitTarget || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'trial'
    }

    mockSellers.push(newSeller)
    console.log('✅ Seller created successfully with ID:', newSeller.id)
    
    return { seller: newSeller, error: null }
  }

  static async completeOnboarding(sellerId: string, preferences: {
    riskTolerance: number
    autoExecuteThreshold: number
    notificationChannels: string[]
    workingHours: { start: string; end: string; timezone: string }
    maxDailySpend: number
    marginFloors: Record<string, number>
  }): Promise<{ success: boolean; error: string | null }> {
    
    console.log('\n🎯 MOCK DATABASE: Completing onboarding')
    console.log('👤 Seller ID:', sellerId)
    console.log('⚖️ Risk Tolerance:', preferences.riskTolerance)
    console.log('🤖 Auto Execute Threshold:', preferences.autoExecuteThreshold)
    console.log('📢 Notification Channels:', preferences.notificationChannels)
    console.log('⏰ Working Hours:', preferences.workingHours)
    console.log('💸 Max Daily Spend:', preferences.maxDailySpend)
    console.log('📊 Margin Floors:', preferences.marginFloors)

    const seller = mockSellers.find(s => s.id === sellerId)
    if (!seller) {
      console.log('❌ Seller not found')
      return { success: false, error: 'Seller not found' }
    }

    // Update seller
    seller.onboarding_completed = true
    seller.risk_tolerance = preferences.riskTolerance
    seller.preferences = {
      risk_tolerance: preferences.riskTolerance,
      auto_execute_threshold: preferences.autoExecuteThreshold,
      notification_channels: preferences.notificationChannels,
      working_hours: preferences.workingHours,
      max_daily_spend: preferences.maxDailySpend,
      margin_floors: preferences.marginFloors
    }
    seller.updated_at = new Date().toISOString()

    console.log('✅ Onboarding completed successfully!')
    console.log('🎉 Seller is now ready to use XpertSeller!')
    
    return { success: true, error: null }
  }

  static async validateSpApiCredentials(credentials: {
    clientId: string
    clientSecret: string
    refreshToken: string
  }): Promise<{ valid: boolean; error?: string }> {
    
    console.log('\n🔐 MOCK DATABASE: Validating SP-API credentials')
    console.log('Client ID:', credentials.clientId ? '✅ Provided' : '❌ Missing')
    console.log('Client Secret:', credentials.clientSecret ? '✅ Provided' : '❌ Missing')
    console.log('Refresh Token:', credentials.refreshToken ? '✅ Provided' : '❌ Missing')

    if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.log('❌ Validation failed: Missing required credentials')
      return { valid: false, error: 'Missing required SP-API credentials' }
    }

    console.log('✅ Mock validation passed (real validation would happen with actual SP-API)')
    return { valid: true }
  }

  static listAllSellers(): MockSeller[] {
    console.log('\n📋 MOCK DATABASE: Current sellers in memory:')
    mockSellers.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.email} (${seller.id}) - ${seller.onboarding_completed ? 'Onboarded' : 'Pending'}`)
    })
    return mockSellers
  }
}