# SIMPLE AUTH SOLUTION - Replace Complex System

## Problem
Current auth system with custom JWT + cookies + middleware is causing redirect loops.

## Solution: Use Supabase Auth (Already installed, 5-minute fix)

### 1. Update Login Page (app/auth/login/page.tsx)
```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const router = useRouter()

  const sendOTP = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (!error) setStep('otp')
  }

  const verifyOTP = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    if (!error) router.push('/home')
  }

  return step === 'email' ? (
    <div>
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" 
      />
      <button onClick={sendOTP}>Send OTP</button>
    </div>
  ) : (
    <div>
      <input 
        value={otp} 
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP" 
      />
      <button onClick={verifyOTP}>Verify</button>
    </div>
  )
}
```

### 2. Update Middleware (middleware.ts)
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  if (req.nextUrl.pathname.startsWith('/home') || 
      req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }

  // Redirect authenticated users from login
  if (req.nextUrl.pathname === '/auth/login' && user) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}
```

### 3. Add Auth Provider (app/layout.tsx)
```typescript
'use client'
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  )
}
```

### 4. Use Auth in Components
```typescript
import { useUser } from '@supabase/auth-helpers-react'

export default function HomePage() {
  const user = useUser()
  
  if (!user) return <div>Loading...</div>
  
  return <div>Welcome {user.email}!</div>
}
```

## Why This Works
- Supabase handles all JWT/cookie complexity
- Built-in OTP system
- Automatic session management
- No custom middleware needed
- Industry proven solution

## Installation (if needed)
```bash
npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

## Time to implement: 5 minutes
## Complexity: Minimal
## Reliability: High (industry standard)