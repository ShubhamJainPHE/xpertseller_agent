import { agentManager } from '../lib/agents/agent-manager'

async function startSystem() {
  console.log('🚀 Starting XpertSeller AI System...')
  
  try {
    await agentManager.start()
    console.log('✅ System started successfully!')
    console.log('🌐 Dashboard: http://localhost:3000')
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...')
      await agentManager.stop()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start system:', error)
    process.exit(1)
  }
}

startSystem()