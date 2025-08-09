import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { OTP_CONFIG, EMAIL_CONFIG, API_MESSAGES } from '@/lib/config/constants'

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
    return crypto.randomInt(OTP_CONFIG.range.min, OTP_CONFIG.range.max).toString()
  }

  /**
   * Send OTP via email using Gmail MCP + Resend fallback system
   */
  static async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {

      // Skip database rate limiting for now and generate OTP directly
      console.log('📧 Generating OTP for', email);

      // Generate new OTP
      const otpCode = this.generateOTP()
      const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000).toISOString()

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

      // Try sending email with unified system
      const emailSent = await this.trySendEmail(email, otpCode)
      
      if (!emailSent) {
        // Clean up the OTP record if email failed
        await supabase.from('otp_codes').delete().eq('id', otpRecord.id)
        return { success: false, message: 'Failed to send email. Please check your email address.' }
      }

      return { 
        success: true, 
        message: API_MESSAGES.success.otpSent
      }

    } catch (error) {
      console.error('OTP Service Error:', error)
      return { success: false, message: 'Something went wrong. Please try again.' }
    }
  }

  /**
   * Send email using unified Gmail MCP + Resend fallback system
   */
  private static async trySendEmail(email: string, otpCode: string): Promise<boolean> {
    console.log('📧 Sending OTP via unified Gmail MCP + Resend fallback system...')
    
    const subject = EMAIL_CONFIG.templates.otp.subject
    const htmlContent = `
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
    `

    // Send email using Resend API
    if (process.env.RESEND_API_KEY) {
      try {
        console.log('📧 Sending email via Resend...')
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: EMAIL_CONFIG.from,
            to: [email],
            subject: subject,
            html: htmlContent
          })
        })

        if (resendResponse.ok) {
          console.log(`✅ OTP email sent via Resend to ${email}`)
          return true
        } else {
          const responseText = await resendResponse.text()
          console.error('❌ Resend API failed:', resendResponse.status, responseText)
        }
      } catch (error) {
        console.error('❌ Resend API failed:', error)
      }
    } else {
      console.warn('⚠️ No RESEND_API_KEY configured')
    }

    console.error('❌ Email sending failed for:', email)

    return false
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(email: string, otpCode: string): Promise<{ success: boolean; message: string; sellerId?: string | null }> {
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
        return { success: false, message: API_MESSAGES.errors.otpExpired }
      }

      // Check attempt limit
      if (otpRecord.attempts >= OTP_CONFIG.maxAttempts) {
        return { success: false, message: API_MESSAGES.errors.tooManyAttempts }
      }

      // Check if code matches
      if (otpRecord.otp_code !== otpCode) {
        // Increment attempts
        await supabase
          .from('otp_codes')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id)

        const remainingAttempts = OTP_CONFIG.maxAttempts - otpRecord.attempts - 1
        return { 
          success: false, 
          message: `${API_MESSAGES.errors.otpInvalid}. ${remainingAttempts} attempts remaining.`
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
        // Seller doesn't exist - this shouldn't happen with new flow since send-otp creates sellers
        console.error(`⚠️ Critical: Seller account not found for ${email} - this shouldn't happen!`);
        
        return {
          success: false,
          message: 'Account setup error. Please try logging in again.'
        }
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