import { NextRequest, NextResponse } from 'next/server'
import { MockDatabase } from '@/lib/database/mock'
import { SellerAuth } from '@/lib/auth/seller'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      email,
      amazonSellerId,
      marketplaceIds,
      spApiCredentials,
      businessContext,
      preferences,
      monthlyProfitTarget
    } = body

    // Validate required fields
    if (!email || !amazonSellerId || !spApiCredentials?.clientId || !spApiCredentials?.clientSecret || !spApiCredentials?.refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if we're using mock database
    const useMockDatabase = process.env.USE_MOCK_DATABASE === 'true'
    
    if (useMockDatabase) {
      console.log('\n🎭 USING MOCK DATABASE FOR TESTING')
      
      // Validate SP-API credentials (mock)
      const { valid, error: credentialError } = await MockDatabase.validateSpApiCredentials(spApiCredentials)
      if (!valid) {
        return NextResponse.json(
          { error: credentialError || 'Invalid SP-API credentials' },
          { status: 400 }
        )
      }

      // Create seller account (mock)
      const { seller, error: createError } = await MockDatabase.createSeller({
        email,
        amazonSellerId,
        marketplaceIds: marketplaceIds || ['ATVPDKIKX0DER'],
        spApiCredentials,
        businessContext,
        monthlyProfitTarget
      })

      if (createError || !seller) {
        return NextResponse.json(
          { error: createError || 'Failed to create seller account' },
          { status: 400 }
        )
      }

      // Complete onboarding with preferences (mock)
      const { success, error: onboardingError } = await MockDatabase.completeOnboarding(seller.id, {
        riskTolerance: preferences.riskTolerance || 0.5,
        autoExecuteThreshold: preferences.autoExecuteThreshold || 0.8,
        notificationChannels: preferences.notificationChannels || ['email', 'dashboard'],
        workingHours: preferences.workingHours || { start: '09:00', end: '18:00', timezone: 'UTC' },
        maxDailySpend: preferences.maxDailySpend || 1000,
        marginFloors: preferences.marginFloors || {}
      })

      if (!success) {
        return NextResponse.json(
          { error: onboardingError || 'Failed to complete onboarding' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        seller: {
          id: seller.id,
          email: seller.email,
          amazon_seller_id: seller.amazon_seller_id,
          onboarding_completed: true
        },
        message: 'Mock onboarding completed! Check server logs to see your data.'
      })
      
    } else {
      // Real database logic (existing code)
      const { valid, error: credentialError } = await SellerAuth.validateSpApiCredentials(spApiCredentials)
      if (!valid) {
        return NextResponse.json(
          { error: credentialError || 'Invalid SP-API credentials' },
          { status: 400 }
        )
      }

      const { seller, error: createError } = await SellerAuth.createSeller({
        email,
        amazonSellerId,
        marketplaceIds: marketplaceIds || ['ATVPDKIKX0DER'],
        spApiCredentials,
        businessContext,
        monthlyProfitTarget
      })

      if (createError || !seller) {
        return NextResponse.json(
          { error: createError || 'Failed to create seller account' },
          { status: 400 }
        )
      }

      const { success, error: onboardingError } = await SellerAuth.completeOnboarding(seller.id, {
        riskTolerance: preferences.riskTolerance || 0.5,
        autoExecuteThreshold: preferences.autoExecuteThreshold || 0.8,
        notificationChannels: preferences.notificationChannels || ['email', 'dashboard'],
        workingHours: preferences.workingHours || { start: '09:00', end: '18:00', timezone: 'UTC' },
        maxDailySpend: preferences.maxDailySpend || 1000,
        marginFloors: preferences.marginFloors || {}
      })

      if (!success) {
        return NextResponse.json(
          { error: onboardingError || 'Failed to complete onboarding' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        seller: {
          id: seller.id,
          email: seller.email,
          amazon_seller_id: seller.amazon_seller_id,
          onboarding_completed: true
        }
      })
    }

  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}