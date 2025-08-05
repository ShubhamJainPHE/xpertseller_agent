#!/usr/bin/env npx tsx

import { dataSyncMonitor } from '../lib/monitoring/data-sync-monitor'

async function startMonitoringSystem() {
  console.log('🚀 Initializing XpertSeller Monitoring System...')
  console.log('')

  try {
    // Perform initial health check
    console.log('1️⃣ Performing initial system health check...')
    const initialHealth = await dataSyncMonitor.performHealthCheck()
    console.log('')

    // Start continuous monitoring
    console.log('2️⃣ Starting continuous monitoring (5-minute intervals)...')
    await dataSyncMonitor.startMonitoring(5)
    console.log('')

    // Trigger initial sync for all sellers
    console.log('3️⃣ Triggering initial sync for all sellers...')
    await dataSyncMonitor.triggerAutoSync()
    console.log('')

    console.log('✅ XpertSeller Monitoring System is now ACTIVE!')
    console.log('')
    console.log('📊 System Status:')
    console.log(`   Total Sellers: ${initialHealth.totalSellers}`)
    console.log(`   Active Sellers: ${initialHealth.activeSellers}`)
    console.log(`   Inventory Items: ${initialHealth.totalInventoryItems}`)
    console.log(`   Orders: ${initialHealth.totalOrders}`)
    console.log(`   Products: ${initialHealth.totalProducts}`)
    console.log(`   Health Status: ${initialHealth.systemHealth.toUpperCase()}`)
    console.log('')
    console.log('🔗 Monitoring Dashboard: http://localhost:3000/monitoring')
    console.log('🔗 Live App: https://xpertseller-agent-9f6azky91-shubham-jains-projects-b447be75.vercel.app/monitoring')
    console.log('')
    console.log('📋 What happens next:')
    console.log('   • System will sync SP-API data every 5 minutes')
    console.log('   • Health checks will run continuously')
    console.log('   • Dashboard will show real-time status')
    console.log('   • Email notifications for critical issues')
    console.log('')
    console.log('⚡ Monitoring is running in the background...')

    // Keep the process alive for demonstration
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down monitoring system...')
      await dataSyncMonitor.stopMonitoring()
      console.log('✅ Monitoring system stopped')
      process.exit(0)
    })

    // Show periodic updates
    setInterval(async () => {
      try {
        const dashboard = await dataSyncMonitor.getMonitoringDashboard()
        console.log(`🔄 [${new Date().toLocaleTimeString()}] System check: ${dashboard.systemHealth.systemHealth.toUpperCase()} | Active: ${dashboard.systemHealth.activeSellers} sellers | Inventory: ${dashboard.systemHealth.totalInventoryItems} | Orders: ${dashboard.systemHealth.totalOrders}`)
      } catch (error) {
        console.log(`❌ [${new Date().toLocaleTimeString()}] Health check failed:`, error)
      }
    }, 60000) // Show status every minute

  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  startMonitoringSystem()
}