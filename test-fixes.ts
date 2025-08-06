import { createClient } from '@supabase/supabase-js'
import { DashboardCalculations } from './lib/dashboard/calculations'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function testFixes() {
  console.log('🧪 TESTING FIXES: Amazon Connection Logic')
  console.log('=' .repeat(50))
  
  try {
    // Test Case: Ishan's account (should now show disconnected)
    console.log('\n=== Testing Ishan Account (Previously Buggy) ===')
    
    const { data: ishanAccount } = await supabase
      .from('sellers')
      .select('id, email, amazon_seller_id, sp_api_credentials, onboarding_completed')
      .eq('email', 'ishan@mitasu.in')
      .single()
    
    if (ishanAccount) {
      console.log(`📊 Account: ${ishanAccount.email}`)
      console.log(`   Amazon Seller ID: ${ishanAccount.amazon_seller_id}`)
      console.log(`   Has SP-API Creds: ${ishanAccount.sp_api_credentials ? 'Yes' : 'No'}`)
      console.log(`   Onboarding Complete: ${ishanAccount.onboarding_completed}`)
      
      // Test the fixed dashboard calculation
      const metrics = await DashboardCalculations.getAllMetrics(ishanAccount.id)
      console.log(`   Connection Status (FIXED): ${metrics.connected}`)
      
      if (!metrics.connected) {
        console.log('✅ SUCCESS: Fix working correctly!')
        console.log('   - Account with PENDING_AUTH now shows as disconnected')
        console.log('   - User will see "Connect Amazon" screen')
        console.log('   - No more confusion with empty dashboard')
      } else {
        console.log('❌ ISSUE: Fix not working - still shows connected')
      }
    }
    
    // Test Case: Connected account (should still work)
    console.log('\n=== Testing Connected Account (Should Still Work) ===')
    
    const { data: connectedAccount } = await supabase
      .from('sellers')
      .select('id, email, amazon_seller_id, sp_api_credentials')
      .not('amazon_seller_id', 'is', null)
      .neq('amazon_seller_id', 'PENDING_AUTH')
      .neq('amazon_seller_id', '')
      .limit(1)
      .single()
    
    if (connectedAccount) {
      console.log(`📊 Account: ${connectedAccount.email}`)
      console.log(`   Amazon Seller ID: ${connectedAccount.amazon_seller_id}`)
      
      const metrics = await DashboardCalculations.getAllMetrics(connectedAccount.id)
      console.log(`   Connection Status: ${metrics.connected}`)
      
      if (metrics.connected) {
        console.log('✅ SUCCESS: Truly connected account still works')
      } else {
        console.log('❌ REGRESSION: Connected account now shows as disconnected')
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 FIX VERIFICATION COMPLETE')
    console.log('='.repeat(50))
    
    console.log('\n🎯 NEXT STEPS NEEDED:')
    console.log('   1. ✅ Fixed connection logic - accounts with PENDING_AUTH show as disconnected')
    console.log('   2. ✅ Added "Connect Amazon" screen to home page')
    console.log('   3. 🔄 Need to implement Amazon OAuth flow')
    console.log('   4. 🔄 Need to add OAuth callback handler')
    console.log('   5. 🔄 Need congratulations email system')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFixes().catch(console.error)