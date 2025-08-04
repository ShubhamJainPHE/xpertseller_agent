#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Real service integrations
class RealCommunicationService {
  
  /**
   * Send email via Resend (REAL implementation)
   */
  async sendEmail(recipient: string, subject: string, text: string, html?: string) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not found in environment variables')
      }
      
      const result = await resend.emails.send({
        from: 'alerts@xpertseller.com',
        to: recipient,
        subject: subject,
        html: html || `<p>${text}</p>`,
        text: text
      })

      console.log(`📧 Email sent successfully to ${recipient}`)
      return {
        success: true,
        messageId: result.data?.id,
        provider: 'resend',
        recipient,
        result: result.data
      }
    } catch (error) {
      console.error(`📧 Email failed to ${recipient}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
        provider: 'resend',
        recipient
      }
    }
  }

  /**
   * Send SMS via Twilio (REAL implementation)  
   */
  async sendSMS(recipient: string, message: string) {
    try {
      const twilio = await import('twilio')
      
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not found in environment variables')
      }
      
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_SMS_NUMBER || '+1234567890',
        to: recipient
      })

      console.log(`📱 SMS sent successfully to ${recipient}`)
      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        recipient,
        result: {
          sid: result.sid,
          status: result.status
        }
      }
    } catch (error) {
      console.error(`📱 SMS failed to ${recipient}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error',
        provider: 'twilio',
        recipient
      }
    }
  }

  /**
   * Send WhatsApp via Twilio (REAL implementation)
   */
  async sendWhatsApp(recipient: string, message: string) {
    try {
      const twilio = await import('twilio')
      
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not found in environment variables')
      }
      
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      
      const result = await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
        to: `whatsapp:${recipient}`
      })

      console.log(`📲 WhatsApp sent successfully to ${recipient}`)
      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio-whatsapp',
        recipient,
        result: {
          sid: result.sid,
          status: result.status
        }
      }
    } catch (error) {
      console.error(`📲 WhatsApp failed to ${recipient}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
        provider: 'twilio-whatsapp',
        recipient
      }
    }
  }

  /**
   * Send Slack message (REAL implementation - basic webhook)
   */
  async sendSlack(webhookUrl: string, message: string) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          username: 'XpertSeller Bot',
          icon_emoji: ':robot_face:'
        })
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
      }

      console.log(`💬 Slack message sent successfully`)
      return {
        success: true,
        messageId: `slack_${Date.now()}`,
        provider: 'slack',
        result: { status: response.status }
      }
    } catch (error) {
      console.error(`💬 Slack failed:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Slack error',
        provider: 'slack'
      }
    }
  }

  /**
   * Multi-channel send with intelligent fallback
   */
  async sendWithFallback(
    channels: Array<{type: string, config?: any}>,
    recipient: string,
    message: { subject?: string, text: string, html?: string }
  ) {
    const results = []
    
    for (const channel of channels) {
      try {
        let result
        
        switch (channel.type) {
          case 'email':
            result = await this.sendEmail(
              recipient, 
              message.subject || 'XpertSeller Alert', 
              message.text, 
              message.html
            )
            break
            
          case 'sms':
            result = await this.sendSMS(recipient, message.text)
            break
            
          case 'whatsapp':
            result = await this.sendWhatsApp(recipient, message.text)
            break
            
          case 'slack':
            result = await this.sendSlack(
              channel.config?.webhookUrl || process.env.SLACK_WEBHOOK_URL || '',
              message.text
            )
            break
            
          default:
            result = {
              success: false,
              error: `Unsupported channel type: ${channel.type}`
            }
        }
        
        results.push({ channel: channel.type, ...result })
        
        // If this channel succeeded, stop trying others (unless configured for all channels)
        if (result.success && !channel.config?.sendToAll) {
          console.log(`✅ Message delivered successfully via ${channel.type}`)
          return {
            success: true,
            channelUsed: channel.type,
            results
          }
        }
        
      } catch (error) {
        results.push({
          channel: channel.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // If we get here, all channels failed
    const hasSuccess = results.some(r => r.success)
    return {
      success: hasSuccess,
      channelUsed: hasSuccess ? results.find(r => r.success)?.channel : null,
      results,
      allChannelResults: results
    }
  }
}

class RealCommunicationMCPServer {
  private server: Server
  private communicationService: RealCommunicationService

  constructor() {
    this.communicationService = new RealCommunicationService()
    this.server = new Server(
      {
        name: 'real-communication-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupToolHandlers()
    this.setupErrorHandling()
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Real Communication MCP Error]', error)
    }

    process.on('SIGINT', async () => {
      await this.server.close()
      process.exit(0)
    })
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_email',
            description: 'Send email via Resend (REAL implementation)',
            inputSchema: {
              type: 'object',
              properties: {
                recipient: { type: 'string', description: 'Email address' },
                subject: { type: 'string', description: 'Email subject' },
                text: { type: 'string', description: 'Plain text content' },
                html: { type: 'string', description: 'HTML content (optional)' }
              },
              required: ['recipient', 'subject', 'text']
            }
          },
          {
            name: 'send_sms',
            description: 'Send SMS via Twilio (REAL implementation)',
            inputSchema: {
              type: 'object',
              properties: {
                recipient: { type: 'string', description: 'Phone number' },
                message: { type: 'string', description: 'SMS message' }
              },
              required: ['recipient', 'message']
            }
          },
          {
            name: 'send_whatsapp',
            description: 'Send WhatsApp via Twilio (REAL implementation)',
            inputSchema: {
              type: 'object',
              properties: {
                recipient: { type: 'string', description: 'WhatsApp number' },
                message: { type: 'string', description: 'WhatsApp message' }
              },
              required: ['recipient', 'message']
            }
          },
          {
            name: 'send_multi_channel',
            description: 'Send message with automatic fallback across channels',
            inputSchema: {
              type: 'object',
              properties: {
                channels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['email', 'sms', 'whatsapp', 'slack'] },
                      config: { type: 'object' }
                    }
                  }
                },
                recipient: { type: 'string', description: 'Recipient identifier' },
                message: {
                  type: 'object',
                  properties: {
                    subject: { type: 'string' },
                    text: { type: 'string' },
                    html: { type: 'string' }
                  }
                }
              },
              required: ['channels', 'recipient', 'message']
            }
          },
          {
            name: 'test_connections',
            description: 'Test all service connections and credentials',
            inputSchema: {
              type: 'object',
              properties: {
                testEmail: { type: 'string', description: 'Test email address' },
                testPhone: { type: 'string', description: 'Test phone number' }
              }
            }
          }
        ]
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'send_email':
            return await this.handleSendEmail(args)
          case 'send_sms':
            return await this.handleSendSMS(args)
          case 'send_whatsapp':
            return await this.handleSendWhatsApp(args)
          case 'send_multi_channel':
            return await this.handleSendMultiChannel(args)
          case 'test_connections':
            return await this.handleTestConnections(args)
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Tool execution failed (${name}):`, errorMessage)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: errorMessage }, null, 2),
            },
          ],
        }
      }
    })
  }

  private async handleSendEmail(args: any) {
    const { recipient, subject, text, html } = args
    const result = await this.communicationService.sendEmail(recipient, subject, text, html)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handleSendSMS(args: any) {
    const { recipient, message } = args
    const result = await this.communicationService.sendSMS(recipient, message)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handleSendWhatsApp(args: any) {
    const { recipient, message } = args
    const result = await this.communicationService.sendWhatsApp(recipient, message)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handleSendMultiChannel(args: any) {
    const { channels, recipient, message } = args
    const result = await this.communicationService.sendWithFallback(channels, recipient, message)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private async handleTestConnections(args: any) {
    const { testEmail, testPhone } = args
    const testResults = []

    // Test Resend
    if (process.env.RESEND_API_KEY && testEmail) {
      const emailResult = await this.communicationService.sendEmail(
        testEmail,
        'XpertSeller Connection Test',
        'This is a test email to verify Resend integration is working.'
      )
      testResults.push({ service: 'Resend Email', ...emailResult })
    } else {
      testResults.push({ 
        service: 'Resend Email', 
        success: false, 
        error: 'Missing RESEND_API_KEY or testEmail' 
      })
    }

    // Test Twilio SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && testPhone) {
      const smsResult = await this.communicationService.sendSMS(
        testPhone,
        'XpertSeller test: SMS integration working!'
      )
      testResults.push({ service: 'Twilio SMS', ...smsResult })
    } else {
      testResults.push({ 
        service: 'Twilio SMS', 
        success: false, 
        error: 'Missing Twilio credentials or testPhone' 
      })
    }

    // Test Twilio WhatsApp  
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && testPhone) {
      const whatsappResult = await this.communicationService.sendWhatsApp(
        testPhone,
        'XpertSeller test: WhatsApp integration working!'
      )
      testResults.push({ service: 'Twilio WhatsApp', ...whatsappResult })
    } else {
      testResults.push({ 
        service: 'Twilio WhatsApp', 
        success: false, 
        error: 'Missing Twilio credentials or testPhone' 
      })
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: testResults.some(r => r.success),
            testResults,
            summary: {
              total: testResults.length,
              passed: testResults.filter(r => r.success).length,
              failed: testResults.filter(r => !r.success).length
            }
          }, null, 2),
        },
      ],
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('🚀 Real Communication MCP server running on stdio')
    console.error('📧 Resend integration: ENABLED')
    console.error('📱 Twilio SMS integration: ENABLED') 
    console.error('📲 Twilio WhatsApp integration: ENABLED')
    console.error('💬 Slack webhook integration: ENABLED')
  }
}

const server = new RealCommunicationMCPServer()
server.run().catch(console.error)