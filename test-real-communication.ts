#!/usr/bin/env node

import { config } from 'dotenv'
import { mcpClientManager } from './lib/mcp/mcp-client.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'

// Load environment variables
config({ path: '.env.local' })

async function testRealCommunication() {
  console.log('🚀 Testing REAL Communication Services...')
  
  let client: Client | null = null
  
  try {
    // Connect to the real communication MCP server
    console.log('📡 Connecting to Real Communication MCP server...')
    
    const serverPath = process.cwd() + '/lib/mcp/communication-server-real.ts'
    client = await mcpClientManager.connectServer({
      name: 'real-communication',
      command: process.cwd() + '/node_modules/.bin/tsx',
      args: [serverPath],
      env: {
        RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
        TWILIO_SMS_NUMBER: process.env.TWILIO_SMS_NUMBER || '',
        TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || '',
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || ''
      },
    })
    
    console.log('✅ Connected to Real Communication MCP server!')

    // Test 1: Check all service connections
    console.log('\n🔍 Test 1: Checking service connections...')
    
    const testConnectionsResponse = await client.request({
      method: 'tools/call',
      params: {
        name: 'test_connections',
        arguments: {
          testEmail: process.env.TEST_EMAIL || 'test@example.com',
          testPhone: process.env.TEST_PHONE || '+1234567890'
        }
      }
    })
    
    const connectionResults = JSON.parse((testConnectionsResponse as any).content[0].text)
    console.log('📊 Connection Test Results:')
    console.log(JSON.stringify(connectionResults, null, 2))

    // Test 2: Send real email (if Resend key is configured)
    if (process.env.RESEND_API_KEY && process.env.TEST_EMAIL) {
      console.log('\n📧 Test 2: Sending real email...')
      
      try {
        const emailResponse = await client.request({
          method: 'tools/call',
          params: {
            name: 'send_email',
            arguments: {
              recipient: process.env.TEST_EMAIL,
              subject: '🚀 XpertSeller Real Email Test',
              text: 'This is a REAL email sent through the MCP communication server!',
              html: '<h2>🚀 XpertSeller Real Email Test</h2><p>This is a <strong>REAL</strong> email sent through the MCP communication server!</p><p>Email integration is working perfectly! ✅</p>'
            }
          }
        })
        
        const emailResult = JSON.parse((emailResponse as any).content[0].text)
        console.log('📧 Email Result:', emailResult)
        
        if (emailResult.success) {
          console.log('✅ REAL EMAIL SENT SUCCESSFULLY!')
          console.log(`📧 Message ID: ${emailResult.messageId}`)
        } else {
          console.log('❌ Email failed:', emailResult.error)
        }
      } catch (error) {
        console.error('❌ Email test failed:', error)
      }
    } else {
      console.log('⚠️ Skipping email test - RESEND_API_KEY or TEST_EMAIL not configured')
    }

    // Test 3: Test multi-channel fallback
    console.log('\n📱 Test 3: Testing multi-channel fallback...')
    
    try {
      const multiChannelResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'send_multi_channel',
          arguments: {
            channels: [
              { type: 'email' },
              { type: 'sms' },
              { type: 'whatsapp' }
            ],
            recipient: process.env.TEST_EMAIL || 'test@example.com',
            message: {
              subject: '🔄 Multi-Channel Test',
              text: 'Testing automatic fallback: Email → SMS → WhatsApp',
              html: '<h2>🔄 Multi-Channel Test</h2><p>Testing automatic fallback system!</p>'
            }
          }
        }
      })
      
      const multiChannelResult = JSON.parse((multiChannelResponse as any).content[0].text)
      console.log('📱 Multi-Channel Result:', multiChannelResult)
      
      if (multiChannelResult.success) {
        console.log(`✅ Message delivered via: ${multiChannelResult.channelUsed}`)
      } else {
        console.log('❌ All channels failed')
      }
    } catch (error) {
      console.error('❌ Multi-channel test failed:', error)
    }

    // Environment check
    console.log('\n🔧 Environment Configuration Check:')
    console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing')
    console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing')
    console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing')
    console.log('   TEST_EMAIL:', process.env.TEST_EMAIL ? '✅ Configured' : '❌ Missing')
    console.log('   TEST_PHONE:', process.env.TEST_PHONE ? '✅ Configured' : '❌ Missing')

    console.log('\n🎉 Real Communication Service Test Complete!')

  } catch (error) {
    console.error('❌ Real communication test failed:', error)
  } finally {
    // Clean up
    if (client) {
      await mcpClientManager.disconnectAll()
      console.log('🧹 Cleaned up MCP connections')
    }
  }
}

testRealCommunication().catch(console.error)