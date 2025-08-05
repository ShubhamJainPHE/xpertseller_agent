async function testDeployedSync() {
  try {
    const sellerId = '134629c6-98a6-4e46-a6bc-865bc29cda2c'
    const syncUrl = `https://xpertseller-agent-7let54v9y-shubham-jains-projects-b447be75.vercel.app/api/amazon/sync?sellerId=${sellerId}`
    
    console.log('🚀 Testing deployed sync endpoint...')
    console.log('📡 URL:', syncUrl)
    
    const startTime = Date.now()
    const response = await fetch(syncUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const duration = Date.now() - startTime
    console.log(`⏱️ Request took: ${duration}ms`)
    
    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error body:', errorText)
      return
    }
    
    const data = await response.json()
    
    console.log('✅ Sync response received!')
    console.log('📊 Response:', JSON.stringify(data, null, 2))
    
    // Analyze results
    if (data.credentialsValid) {
      console.log('\n🎉 SUCCESS: SP-API credentials are working!')
    }
    
    if (data.syncResults) {
      console.log('\n📋 Sync Summary:')
      
      if (data.syncResults.inventory) {
        const inv = data.syncResults.inventory
        if (inv.success) {
          console.log(`  📦 Inventory: ✅ ${inv.itemCount} items`)
        } else {
          console.log(`  📦 Inventory: ❌ ${inv.error}`)
          if (inv.permissionIssue) {
            console.log(`    💡 ${inv.suggestion}`)
          }
        }
      }
      
      if (data.syncResults.orders) {
        const ord = data.syncResults.orders
        if (ord.success) {
          console.log(`  📋 Orders: ✅ ${ord.itemCount} items`)
        } else {
          console.log(`  📋 Orders: ❌ ${ord.error}`)
          if (ord.permissionIssue) {
            console.log(`    💡 ${ord.suggestion}`)
          }
        }
      }
    }
    
    console.log('\n🎉 Amazon SP-API integration is working!')
    console.log('💡 Next steps: Seller needs to add inventory or wait for orders to appear in sync results.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDeployedSync()