// Application Configuration Constants

export const APP_CONFIG = {
  name: 'XpertSeller',
  tagline: 'AI-Powered Amazon Seller Intelligence',
  supportEmail: 'support@xpertseller.com'
} as const

// Amazon Configuration
export const AMAZON_CONFIG = {
  defaultMarketplace: 'A21TJRUUN4KGV', // India marketplace
  marketplaces: {
    INDIA: 'A21TJRUUN4KGV',
    US: 'ATVPDKIKX0DER',
    UK: 'A1F83G8C2ARO7P'
  }
} as const

// OTP Configuration
export const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 10,
  maxAttempts: 5,
  range: {
    min: 100000,
    max: 999999
  }
} as const

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  otp: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000 // 1 hour
  },
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
} as const

// Session Configuration
export const SESSION_CONFIG = {
  duration: 24 * 60 * 60 * 1000, // 24 hours
  refreshDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  cleanupInterval: 5 * 60 * 1000 // 5 minutes
} as const

// Default Seller Preferences
export const DEFAULT_SELLER_PREFERENCES = {
  risk_tolerance: 0.5,
  auto_execute_threshold: 0.8,
  notification_channels: ['email', 'dashboard'],
  working_hours: { start: '09:00', end: '18:00', timezone: 'UTC' },
  max_daily_spend: 1000,
  margin_floors: {}
} as const

// Email Configuration
export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'XpertSeller <onboarding@resend.dev>',
  templates: {
    otp: {
      subject: '🔐 Your XpertSeller Login Code'
    }
  }
} as const

// API Response Messages
export const API_MESSAGES = {
  success: {
    otpSent: 'OTP sent successfully. Code expires in 10 minutes.',
    otpVerified: 'Login successful! Redirecting securely...',
    logout: 'Logged out successfully'
  },
  errors: {
    invalidEmail: 'Please enter a valid email address',
    invalidOtp: 'OTP must be 6 digits',
    otpExpired: 'OTP has expired. Please request a new one',
    otpInvalid: 'Invalid OTP code',
    tooManyAttempts: 'Too many failed attempts. Please request a new OTP',
    rateLimited: 'Too many requests. Please wait before trying again',
    sessionExpired: 'Session expired. Please login again',
    amazonNotConnected: 'Amazon account not connected',
    networkError: 'Network error. Please try again'
  }
} as const