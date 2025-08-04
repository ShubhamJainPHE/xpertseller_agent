import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Simple persistent OTP storage to survive hot reloads
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const OTP_CACHE_FILE = join(process.cwd(), '.otp-cache.json')

// Load existing OTP cache
let otpStore = new Map<string, { code: string; expires: number; attempts: number }>()

function loadOTPCache() {
  try {
    if (existsSync(OTP_CACHE_FILE)) {
      const data = JSON.parse(readFileSync(OTP_CACHE_FILE, 'utf8'))
      otpStore = new Map(Object.entries(data))
      // Clean expired entries
      const now = Date.now()
      for (const [email, entry] of otpStore.entries()) {
        if (now > (entry as any).expires) {
          otpStore.delete(email)
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load OTP cache:', error)
  }
}

function saveOTPCache() {
  try {
    const data = Object.fromEntries(otpStore.entries())
    writeFileSync(OTP_CACHE_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.warn('Failed to save OTP cache:', error)
  }
}

// Load cache on startup
loadOTPCache()

export class SimpleOTPService {
  
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📧 Sending OTP to', email)
      
      // Generate OTP
      const otpCode = this.generateOTP()
      const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
      
      // Store in memory and save to cache
      otpStore.set(email.toLowerCase(), {
        code: otpCode,
        expires,
        attempts: 0
      })
      saveOTPCache()

      // Try sending email with multiple providers (fallback system)
      const emailSent = await this.trySendEmail(email.toLowerCase(), otpCode)
      
      if (emailSent) {
        console.log('✅ OTP email sent successfully')
        return {
          success: true,
          message: 'OTP sent to your email address'
        }
      } else {
        // Email delivery failed - only log in console, never expose to client
        console.log(`🔑 OTP for ${email}: ${otpCode}`)
        console.log('📧 Email delivery failed - configure email provider for production')
        
        // Production mode: Email must work
        return {
          success: false,
          message: 'Unable to send OTP email. Please check your email address or contact support.'
        }
      }

    } catch (error) {
      console.error('❌ Send OTP error:', error)
      return { success: false, message: 'Failed to send OTP. Please try again.' }
    }
  }

  /**
   * Try sending email with multiple providers (fallback system)
   */
  private static async trySendEmail(email: string, otpCode: string): Promise<boolean> {
    const emailContent = {
      subject: '🔐 Your XpertSeller Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">🚀 XpertSeller</h1>
            <p style="color: #6b7280; font-size: 16px;">Your Amazon Seller Intelligence Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; margin-bottom: 15px; font-size: 24px;">Your Login Code</h2>
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <span style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
                ${otpCode}
              </span>
            </div>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
              ⏰ This code expires in 10 minutes
            </p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">🔒 Security Tips:</h3>
            <ul style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              <li>Never share this code with anyone</li>
              <li>XpertSeller will never ask for your code via phone or email</li>
              <li>If you didn't request this code, please ignore this email</li>
              <li>Use this code only on the XpertSeller login page</li>
            </ul>
          </div>

          <div style="text-align: center; color: #6b7280; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p>Need help? Contact us at support@xpertseller.com</p>
            <p>© 2025 XpertSeller. Secure Amazon seller intelligence.</p>
          </div>
        </div>
      `,
      text: `
Your XpertSeller login code: ${otpCode}

This code expires in 10 minutes. Enter it on the login page to access your dashboard.

Security: Never share this code. If you didn't request it, ignore this email.

Need help? Contact support@xpertseller.com
      `
    }

    // Method 1: Try Resend (if configured)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-key') {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'XpertSeller <noreply@xpertseller.com>',
            to: [email],
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })
        })

        if (resendResponse.ok) {
          console.log('✅ OTP sent via Resend')
          return true
        } else {
          const errorData = await resendResponse.json()
          console.warn('Resend failed:', errorData)
        }
      } catch (error) {
        console.warn('Resend failed, trying fallback:', error)
      }
    }

    // Method 2: Skip Supabase Auth (it doesn't actually send emails)
    console.log('⚠️ Supabase Auth generateLink does not send emails, skipping...')

    // Method 3: Nodemailer + Gmail (completely free backup)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && 
        process.env.GMAIL_USER !== 'your-gmail@gmail.com') {
      try {
        const nodemailer = require('nodemailer')
        
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        })

        await transporter.sendMail({
          from: `"XpertSeller Security" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })

        console.log('✅ OTP sent via Gmail')
        return true
      } catch (error) {
        console.error('Gmail fallback failed:', error)
      }
    }

    return false
  }

  static async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; message: string; sellerId?: string }> {
    try {
      // Reload cache to get latest data
      loadOTPCache()
      
      const emailKey = email.toLowerCase()
      console.log(`🔍 Looking for OTP for ${emailKey}`)
      console.log(`🗂️ Current OTP store:`, Array.from(otpStore.entries()))
      
      const stored = otpStore.get(emailKey)

      if (!stored) {
        console.log(`❌ No OTP found for ${emailKey}`)
        return { success: false, message: 'No OTP found. Please request a new one.' }
      }

      if (Date.now() > stored.expires) {
        otpStore.delete(emailKey)
        saveOTPCache()
        return { success: false, message: 'OTP has expired. Please request a new one.' }
      }

      if (stored.attempts >= 5) {
        otpStore.delete(emailKey)
        saveOTPCache()
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' }
      }

      if (stored.code !== otpCode) {
        stored.attempts++
        saveOTPCache()
        return { success: false, message: `Invalid OTP. ${5 - stored.attempts} attempts remaining.` }
      }

      // OTP is valid, remove from store
      otpStore.delete(emailKey)
      saveOTPCache()

      // Find or create seller account
      let { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id, email')
        .eq('email', emailKey)
        .single()

      if (sellerError && sellerError.code === 'PGRST116') {
        // Seller doesn't exist, create new one
        console.log(`🆕 Auto-creating seller account for ${email}`)
        
        const { data: newSeller, error: createError } = await supabase
          .from('sellers')
          .insert({
            email: emailKey,
            amazon_seller_id: `temp_${Date.now()}`,
            marketplace_ids: ['ATVPDKIKX0DER'],
            sp_api_credentials: {
              clientId: '',
              clientSecret: '',
              refreshToken: ''
            },
            business_context: {
              email: emailKey,
              name: email.split('@')[0],
              businessName: 'My Business',
              geography: 'United States',
              phoneNumber: '',
              isAutoCreated: true
            },
            status: 'trial',
            onboarding_completed: false
          })
          .select('id, email')
          .single()

        if (createError) {
          console.error('Error creating seller:', createError)
          return { success: false, message: 'Failed to create account. Please try again.' }
        }

        seller = newSeller
        console.log(`✅ Auto-created seller: ${seller.id}`)
      } else if (sellerError) {
        console.error('Error fetching seller:', sellerError)
        return { success: false, message: 'Account lookup failed. Please try again.' }
      }

      return {
        success: true,
        message: 'OTP verified successfully!',
        sellerId: seller?.id
      }

    } catch (error) {
      console.error('❌ Verify OTP error:', error)
      return { success: false, message: 'Verification failed. Please try again.' }
    }
  }
}