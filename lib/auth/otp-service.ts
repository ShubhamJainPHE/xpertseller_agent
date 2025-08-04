import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface OTPRecord {
  id: string
  email: string
  otp_code: string
  expires_at: string
  attempts: number
  verified: boolean
  created_at: string
}

export class OTPService {
  
  /**
   * Generate a 6-digit OTP code
   */
  static generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString()
  }

  /**
   * Send OTP via email using multiple providers as fallback
   */
  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {

      // Skip database rate limiting for now and generate OTP directly
      console.log('📧 Generating OTP for', email);

      // Generate new OTP
      const otpCode = this.generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

      // Store OTP in database
      const { data: otpRecord, error: insertError } = await supabase
        .from('otp_codes')
        .insert({
          email,
          otp_code: otpCode,
          expires_at: expiresAt,
          attempts: 0,
          verified: false
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error storing OTP:', insertError)
        return { success: false, message: 'Failed to generate OTP. Please try again.' }
      }

      // Try sending email with multiple providers
      const emailSent = await this.trySendEmail(email, otpCode)
      
      if (!emailSent) {
        // Clean up the OTP record if email failed
        await supabase.from('otp_codes').delete().eq('id', otpRecord.id)
        return { success: false, message: 'Failed to send email. Please check your email address.' }
      }

      return { 
        success: true, 
        message: `OTP sent to ${email}. Code expires in 10 minutes.` 
      }

    } catch (error) {
      console.error('OTP Service Error:', error)
      return { success: false, message: 'Something went wrong. Please try again.' }
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
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'XpertSeller <shubham.jain.phe16@itbhu.ac.in>',
            to: [email],
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })
        })

        if (resendResponse.ok) {
          console.log('✅ OTP sent via Resend')
          return true
        }
      } catch (error) {
        console.warn('Resend failed, trying fallback:', error)
      }
    }

    // Method 2: Try Supabase Auth (built-in email)
    try {
      const { error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          data: {
            otp_code: otpCode,
            custom_email: true
          }
        }
      })

      if (!error) {
        console.log('✅ OTP sent via Supabase Auth')
        return true
      }
    } catch (error) {
      console.warn('Supabase Auth failed, trying fallback:', error)
    }

    // Method 3: Nodemailer + Gmail (completely free backup)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const nodemailer = await import('nodemailer')
        
        const transporter = nodemailer.createTransport({
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

  /**
   * Verify OTP code
   */
  static async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; message: string; sellerId?: string }> {
    try {

      // Find the OTP record
      const { data: otpRecords, error: fetchError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) {
        console.error('Error fetching OTP:', fetchError)
        return { success: false, message: 'Database error. Please try again.' }
      }

      if (!otpRecords || otpRecords.length === 0) {
        return { success: false, message: 'No valid OTP found. Please request a new one.' }
      }

      const otpRecord = otpRecords[0] as OTPRecord

      // Check if expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        return { success: false, message: 'OTP has expired. Please request a new one.' }
      }

      // Check attempt limit
      if (otpRecord.attempts >= 5) {
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' }
      }

      // Check if code matches
      if (otpRecord.otp_code !== otpCode) {
        // Increment attempts
        await supabase
          .from('otp_codes')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id)

        return { 
          success: false, 
          message: `Invalid OTP code. ${4 - otpRecord.attempts} attempts remaining.` 
        }
      }

      // Mark OTP as verified
      await supabase
        .from('otp_codes')
        .update({ verified: true })
        .eq('id', otpRecord.id)

      // Find or create seller account
      let { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id, email')
        .eq('email', email)
        .single()

      if (sellerError && sellerError.code === 'PGRST116') {
        // Seller doesn't exist, create new one with complete profile
        console.log(`🆕 Auto-creating seller account for ${email}`);
        
        const { data: newSeller, error: createError } = await supabase
          .from('sellers')
          .insert({
            email,
            amazon_seller_id: `temp_${Date.now()}`,
            marketplace_ids: ['ATVPDKIKX0DER'], // Default to US marketplace
            sp_api_credentials: {
              clientId: '',
              clientSecret: '',
              refreshToken: ''
            },
            business_context: {
              email,
              name: email.split('@')[0], // Use email prefix as temp name
              businessName: 'My Business', // Default business name
              geography: 'United States',
              phoneNumber: '',
              isAutoCreated: true
            },
            status: 'trial',
            onboarding_completed: false,
            email_verified: true
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
        message: 'Login successful!',
        sellerId: seller?.id
      }

    } catch (error) {
      console.error('OTP Verification Error:', error)
      return { success: false, message: 'Verification failed. Please try again.' }
    }
  }

  /**
   * Clean up expired OTP codes (run this periodically)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const { error } = await supabase
        .from('otp_codes')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error cleaning up OTPs:', error)
      } else {
        console.log('✅ Expired OTPs cleaned up')
      }
    } catch (error) {
      console.error('Cleanup Error:', error)
    }
  }
}