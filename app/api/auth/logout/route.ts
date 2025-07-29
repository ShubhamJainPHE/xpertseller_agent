import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const sessionToken = headersList.get('cookie')?.split('session-token=')[1]?.split(';')[0]

    if (sessionToken) {
      // Mark session as inactive in database
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('session_token', sessionToken)

      console.log('🚪 User logged out successfully')
    }

    // Clear the session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    response.cookies.delete('session-token')
    
    return response

  } catch (error) {
    console.error('❌ Logout error:', error)
    
    // Still clear the cookie even if database update fails
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    response.cookies.delete('session-token')
    
    return response
  }
}

// Logout all sessions for current user
export async function DELETE(request: Request) {
  try {
    const headersList = await headers()
    const sellerId = headersList.get('x-seller-id')

    if (!sellerId) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      )
    }

    // Mark all sessions as inactive for this seller
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false,
        last_activity: new Date().toISOString()
      })
      .eq('seller_id', sellerId)
      .eq('is_active', true)

    if (error) {
      console.error('Error logging out all sessions:', error)
    }

    console.log(`🚪 All sessions logged out for seller: ${sellerId}`)

    // Clear the current session cookie
    const response = NextResponse.json({
      success: true,
      message: 'All sessions logged out successfully'
    })

    response.cookies.delete('session-token')
    
    return response

  } catch (error) {
    console.error('❌ Logout all sessions error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}