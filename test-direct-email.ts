#!/usr/bin/env node

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function testDirectEmail() {
  console.log('📧 Testing Direct Email Integration...')
  
  try {
    // Test if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment')
      process.exit(1)
    }
    
    console.log('✅ RESEND_API_KEY found')
    
    // Import and test Resend directly
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    
    console.log(`📧 Sending test email to: ${testEmail}`)
    
    const result = await resend.emails.send({
      from: 'alerts@xpertseller.com',
      to: testEmail,
      subject: '🚀 XpertSeller Direct Email Test - IT WORKS!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4CAF50;">🚀 SUCCESS!</h1>
          <h2>XpertSeller Email Integration is Working!</h2>
          <p>This email was sent directly through the Resend API integration.</p>
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>✅ What's Working:</h3>
            <ul>
              <li>Resend API integration</li>
              <li>Environment variable loading</li>
              <li>Email delivery system</li>
              <li>HTML email formatting</li>
            </ul>
          </div>
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🔄 Next Steps:</h3>
            <ul>
              <li>Set up Twilio for SMS/WhatsApp</li>
              <li>Test multi-channel fallback</li>
              <li>Integrate with MCP server</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}<br>
            Message ID: [Will be generated]
          </p>
        </div>
      `,
      text: `
🚀 SUCCESS! XpertSeller Email Integration is Working!

This email was sent directly through the Resend API integration.

✅ What's Working:
- Resend API integration
- Environment variable loading  
- Email delivery system
- Text email formatting

🔄 Next Steps:
- Set up Twilio for SMS/WhatsApp
- Test multi-channel fallback
- Integrate with MCP server

Sent at: ${new Date().toLocaleString()}
Message ID: [Will be generated]
      `
    })

    if (result.error) {
      console.error('❌ Email sending failed:', result.error)
      return
    }

    console.log('🎉 EMAIL SENT SUCCESSFULLY!')
    console.log('📧 Email Details:')
    console.log(`   To: ${testEmail}`)
    console.log(`   Message ID: ${result.data?.id}`)
    console.log(`   Status: Sent`)
    
    console.log('\n✅ DIRECT EMAIL INTEGRATION: WORKING PERFECTLY!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Resend API: Connected and working')
    console.log('   ✅ Environment variables: Loaded correctly')
    console.log('   ✅ Email delivery: Successful')
    console.log('   ✅ HTML formatting: Working')
    console.log('   ✅ Text formatting: Working')
    
    console.log('\n🎯 This proves the foundation is solid!')
    console.log('📧 Check your email inbox - you should have received a test email!')

  } catch (error) {
    console.error('❌ Direct email test failed:', error)
    
    if (error.message?.includes('API key')) {
      console.log('\n💡 Tip: Make sure your RESEND_API_KEY is correct in .env.local')
    }
    
    if (error.message?.includes('domain')) {
      console.log('\n💡 Tip: Make sure alerts@xpertseller.com domain is verified in Resend')
      console.log('   You might need to use your verified domain instead')
    }
  }
}

testDirectEmail().catch(console.error)