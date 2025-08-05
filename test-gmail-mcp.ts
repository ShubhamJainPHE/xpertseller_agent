import { ComposioToolSet } from 'composio-core';

async function testGmailMCP() {
  try {
    console.log('🧪 Testing Gmail MCP Integration...');
    
    const composio = new ComposioToolSet({
      apiKey: 'ak_m7G25pTBup6hdv2Mjn_v'
    });
    
    console.log('✅ Composio toolset initialized');
    
    // Check connected accounts
    const accounts = await composio.client.connectedAccounts.list();
    console.log('📊 Connected accounts:', accounts.length);
    
    if (accounts.length === 0) {
      console.log('❌ NO GMAIL ACCOUNTS CONNECTED');
      console.log('👉 Need to connect Gmail at: https://app.composio.dev/connections');
      return;
    }
    
    // Find Gmail account
    const gmailAccount = accounts.find(acc => 
      acc.integration && acc.integration.name && acc.integration.name.toLowerCase().includes('gmail')
    );
    
    if (!gmailAccount) {
      console.log('❌ NO GMAIL ACCOUNT FOUND');
      console.log('📧 Available integrations:', accounts.map(acc => acc.integration ? acc.integration.name : 'unknown'));
      return;
    }
    
    console.log('✅ Gmail account found:', gmailAccount.id);
    
    // Test sending email
    console.log('📧 Testing email send...');
    const result = await composio.executeAction({
      action: 'gmail_send_email',
      params: {
        recipient_email: 'shubhjjj66@gmail.com',
        subject: 'TEST: Gmail MCP Working',
        body: 'This is a test email from Gmail MCP integration.',
        is_html: false
      }
    });
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📋 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Gmail MCP Test FAILED:', error.message);
  }
}

testGmailMCP();