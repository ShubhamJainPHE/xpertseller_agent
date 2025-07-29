const { ComposioToolSet } = require('composio-core');

async function testComposio() {
  try {
    console.log('🧪 Testing Composio API connection...');
    
    const toolset = new ComposioToolSet({
      apiKey: process.env.COMPOSIO_API_KEY
    });
    
    console.log('✅ Composio client initialized');
    
    // Look for Gmail tools specifically
    console.log('📧 Looking for Gmail tools...');
    const schema = await toolset.getToolsSchema({
      appNames: ['gmail']
    });
    
    const gmailTools = schema.filter(tool => tool.name.toLowerCase().includes('gmail'));
    console.log(`✅ Found ${gmailTools.length} Gmail tools`);
    
    gmailTools.slice(0, 5).forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
    });
    
    // Test a simple Gmail action (like checking if we can send)
    console.log('📨 Testing Gmail send capability...');
    
    try {
      // This should fail with authentication error, not a method error
      const result = await toolset.executeAction({
        action: 'GMAIL_SEND_EMAIL',
        params: {
          to: 'test@test.com',
          subject: 'Test',
          html: 'Test message'
        }
      });
      console.log('✅ Gmail action executed (unexpected success):', result);
    } catch (gmailError) {
      if (gmailError.message.includes('authentication') || gmailError.message.includes('auth') || gmailError.message.includes('401')) {
        console.log('🔑 Gmail needs authentication (expected) - integration structure is correct');
      } else {
        console.log('❌ Gmail error:', gmailError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Composio test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.log('🔑 API key might be invalid or expired');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.log('🌐 Network connection issue');
    }
  }
}

// Load environment
require('dotenv').config({ path: '.env.local' });
testComposio();