import { createClient } from '@supabase/supabase-js'

async function debugSellerData() {
  try {
    const supabase = createClient(
      'https://uvfjofawxsmrdpaxxptg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5NjgzMywiZXhwIjoyMDY5MzcyODMzfQ.vZngCRA4_TyRSfzrfhhaXle532LRbtfxd5FFgQEOXYo'
    )
    
    const sellerId = '134629c6-98a6-4e46-a6bc-865bc29cda2c'
    
    console.log('🔍 Debugging seller data...')
    
    // Get full seller record
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single()
    
    if (error) {
      console.error('❌ Database error:', error)
      return
    }
    
    if (!seller) {
      console.error('❌ Seller not found')
      return
    }
    
    console.log('📋 Seller Record:')
    console.log('  ID:', seller.id)
    console.log('  Email:', seller.email)
    console.log('  Amazon Seller ID:', seller.amazon_seller_id)
    console.log('  SP-API Credentials present:', !!seller.sp_api_credentials)
    console.log('  Status:', seller.status)
    console.log('  Onboarding completed:', seller.onboarding_completed)
    
    if (seller.sp_api_credentials) {
      const creds = seller.sp_api_credentials
      console.log('🔑 SP-API Credentials structure:')
      console.log('  Client ID present:', !!creds.clientId)
      console.log('  Client Secret present:', !!creds.clientSecret)
      console.log('  Refresh Token present:', !!creds.refreshToken)
      console.log('  Access Token present:', !!creds.accessToken)
      console.log('  Token Expiry:', creds.tokenExpiry)
    }
    
    // Test the exact query used by createSPApiService
    console.log('🧪 Testing SP-API service query...')
    const { data: testSeller, error: testError } = await supabase
      .from('sellers')
      .select('sp_api_credentials, amazon_seller_id')
      .eq('id', sellerId)
      .single()
    
    if (testError) {
      console.error('❌ Test query error:', testError)
    } else {
      console.log('✅ Test query successful')
      console.log('  Has SP-API credentials:', !!testSeller?.sp_api_credentials)
      console.log('  Has Amazon Seller ID:', !!testSeller?.amazon_seller_id)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugSellerData()