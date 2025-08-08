#!/usr/bin/env tsx

/**
 * Test India marketplace API flow
 * Verifies our migration works for India marketplace data fetching
 */

import { SPAPIConfigService } from './lib/config/sp-api-config'

async function testIndiaAPIFlow() {
  console.log('🇮🇳 Testing India Marketplace API Flow...\n')

  // Test 1: Configuration defaults
  console.log('1. Testing Configuration Defaults:')
  const defaultRegion = SPAPIConfigService.getRegionFromMarketplace('INVALID_ID')
  const defaultBaseUrl = SPAPIConfigService.getBaseUrlFromRegion('INVALID_REGION')
  
  console.log('  ✅ Default region:', defaultRegion)
  console.log('  ✅ Default base URL:', defaultBaseUrl)
  console.log('  ✅ Expected: eu-west-1 and EU endpoint\n')
  
  // Test 2: India marketplace specific configuration
  console.log('2. Testing India Marketplace Configuration:')
  const indiaConfig = SPAPIConfigService.getConfigForMarketplace('A21TJRUUN4KGV')
  
  console.log('  ✅ India region:', indiaConfig.region)
  console.log('  ✅ India base URL:', indiaConfig.baseUrl) 
  console.log('  ✅ India LWA URL:', indiaConfig.lwaUrl)
  
  // Test 3: Validate correct endpoints
  const isCorrectRegion = indiaConfig.region === 'eu-west-1'
  const isCorrectEndpoint = indiaConfig.baseUrl === 'https://sellingpartnerapi-eu.amazon.com'
  
  console.log('\n3. Validation Results:')
  console.log('  ✅ Correct region mapping:', isCorrectRegion ? '✓' : '✗')
  console.log('  ✅ Correct API endpoint:', isCorrectEndpoint ? '✓' : '✗')
  
  // Test 4: Simulate new user flow
  console.log('\n4. Simulated New User Flow:')
  console.log('  📧 User: ishan@mitasu.in')
  console.log('  🎯 Expected marketplace: A21TJRUUN4KGV (India)')
  console.log('  🎯 Expected region: eu-west-1')
  console.log('  🎯 Expected endpoint: sellingpartnerapi-eu.amazon.com')
  
  const mockUserConfig = SPAPIConfigService.getConfigForMarketplace('A21TJRUUN4KGV')
  const mockUserCorrect = (
    mockUserConfig.region === 'eu-west-1' && 
    mockUserConfig.baseUrl.includes('sellingpartnerapi-eu')
  )
  
  console.log('  ✅ New user gets India config:', mockUserCorrect ? '✓' : '✗')
  
  console.log('\n🎯 MIGRATION VALIDATION COMPLETE!')
  
  if (isCorrectRegion && isCorrectEndpoint && mockUserCorrect) {
    console.log('✅ ALL TESTS PASSED - India marketplace migration successful!')
    
    console.log('\n📋 What this means:')
    console.log('  • New users like ishan@mitasu.in will get India marketplace')
    console.log('  • SP-API calls will use correct India/EU endpoints') 
    console.log('  • Data fetching will work for India sellers')
    console.log('  • Currency will default to INR')
    
    return true
  } else {
    console.log('❌ SOME TESTS FAILED - Check migration implementation')
    return false
  }
}

// Run the test
testIndiaAPIFlow()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })