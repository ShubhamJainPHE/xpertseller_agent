'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

export default function SecureLoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [canResend, setCanResend] = useState(true)
  const [showOtpCode, setShowOtpCode] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'otp' && timeLeft === 0) {
      setError('OTP has expired. Please request a new one.')
    }
  }, [timeLeft, step])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setStep('otp')
        setTimeLeft(600) // 10 minutes
        setCanResend(false)
        
        // Enable resend after 60 seconds
        setTimeout(() => setCanResend(true), 60000)
      } else {
        setError(data.error || 'Failed to send OTP')
        if (data.rateLimited) {
          setCanResend(false)
        }
      }
    } catch (error) {
      setError('Network error. Please check your internet connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newOtpCode = [...otpCode]
    newOtpCode[index] = value.slice(-1) // Only take the last character
    setOtpCode(newOtpCode)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (newOtpCode.every(digit => digit !== '') && value !== '') {
      handleOtpSubmit(newOtpCode.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newOtpCode = pastedData.split('')
      setOtpCode(newOtpCode)
      handleOtpSubmit(pastedData)
    }
  }

  const handleOtpSubmit = async (code?: string) => {
    const codeToSubmit = code || otpCode.join('')
    
    if (codeToSubmit.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otpCode: codeToSubmit })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Login successful! Redirecting securely...')
        
        // No localStorage storage - using secure HTTP-only cookies
        console.log('🔐 Secure authentication successful')

        // Redirect to dashboard immediately (no delay needed for localStorage)
        window.location.href = data.redirect || '/home'
      } else {
        setError(data.error || 'Invalid OTP code')
        // Clear the OTP inputs on error
        setOtpCode(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = () => {
    if (canResend) {
      setOtpCode(['', '', '', '', '', ''])
      setError('')
      setStep('email')
      setTimeLeft(0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to XpertSeller</h1>
          <p className="text-blue-200">
            {step === 'email' 
              ? 'Enter your email to continue'
              : 'Enter the 6-digit code sent to your email'
            }
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              {step === 'email' ? (
                <>
                  <Mail className="w-5 h-5" />
                  Email Verification
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Enter Security Code
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Email Step */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-blue-200 block mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-blue-400"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      Send Security Code
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <div className="space-y-6">
                {/* Email confirmation */}
                <div className="text-center">
                  <p className="text-blue-200 text-sm mb-2">Code sent to:</p>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {email}
                  </Badge>
                </div>

                {/* OTP Input */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-blue-200">
                      Security Code
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOtpCode(!showOtpCode)}
                        className="text-blue-300 hover:text-white h-6 p-0"
                      >
                        {showOtpCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      {timeLeft > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-300">
                          <Clock className="w-3 h-3" />
                          {formatTime(timeLeft)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center">
                    {otpCode.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          otpRefs.current[index] = el
                        }}
                        type={showOtpCode ? "text" : "password"}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-12 text-center text-xl font-bold bg-white/20 border-white/30 text-white focus:border-blue-400"
                        maxLength={1}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                {/* Auto-submit info */}
                <div className="text-center text-xs text-blue-300">
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Code will auto-submit when complete
                </div>

                {/* Manual submit button */}
                <Button
                  onClick={() => handleOtpSubmit()}
                  disabled={isLoading || otpCode.some(digit => !digit)}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify & Login
                    </>
                  )}
                </Button>

                {/* Resend option */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-blue-200">Didn't receive the code?</p>
                  <Button
                    variant="ghost"
                    onClick={handleResendOtp}
                    disabled={!canResend}
                    className="text-blue-300 hover:text-white text-sm"
                  >
                    {canResend ? 'Send New Code' : 'Please wait...'}
                  </Button>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{success}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-blue-300">
          <p>🔒 Your data is encrypted and secure</p>
          <p>We'll never share your information or send spam</p>
        </div>


        {/* Auto Account Creation Notice */}
        <div className="mt-4 text-center">
          <p className="text-blue-200 text-xs">
            🚀 New users? Your account will be created automatically after verification
          </p>
        </div>
      </div>
    </div>
  )
}