# Email Setup for OTP Authentication

## CRITICAL: Email providers must be configured for production!

### Option 1: Resend (Recommended - Free 3000 emails/month)

1. Go to https://resend.com/signup
2. Sign up and verify your account
3. Get your API key from dashboard
4. Update .env.local:
```
RESEND_API_KEY=re_your_actual_api_key_here
```

### Option 2: Gmail (Free but requires app password)

1. Enable 2FA on your Gmail account
2. Generate an app password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Create password for "Mail"
3. Update .env.local:
```
GMAIL_USER=your-actual-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

## Current Status
- ❌ No email providers configured
- ❌ OTP codes only visible in server logs
- ⚠️ Authentication will fail for real users

## Quick Test Setup (Gmail)
Replace the placeholder values in .env.local:
```bash
# Change these lines:
GMAIL_USER=your-gmail@gmail.com          # ❌ Placeholder
GMAIL_APP_PASSWORD=your-16-char-app-password  # ❌ Placeholder

# To your real values:
GMAIL_USER=shubhjjj66@gmail.com          # ✅ Real email
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop   # ✅ Real app password
```

After setting up email, restart the server and test.