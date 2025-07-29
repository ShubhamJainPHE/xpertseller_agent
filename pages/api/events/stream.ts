import { NextApiRequest, NextApiResponse } from 'next'
import { withMethods, getAuthenticatedUser, sendError } from '../../../lib/api/utils'
import { supabaseAdmin } from '../../../lib/database/connection'

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getAuthenticatedUser(req)
    
    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      message: 'Connected to XpertSeller event stream',
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    // Set up Supabase real-time subscription
    const channel = supabaseAdmin
      .channel(`seller_${user.seller.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recommendations',
          filter: `seller_id=eq.${user.seller.id}`
        },
        (payload) => {
          res.write(`data: ${JSON.stringify({
            type: 'new_recommendation',
            data: payload.new,
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fact_stream',
          filter: `seller_id=eq.${user.seller.id}`
        },
        (payload) => {
          // Only send high-importance events to reduce noise
          if (payload.new.importance_score >= 7) {
            res.write(`data: ${JSON.stringify({
              type: 'critical_event',
              data: payload.new,
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'automated_actions',
          filter: `recommendation_id=in.(${user.seller.id})`
        },
        (payload) => {
          res.write(`data: ${JSON.stringify({
            type: 'action_update',
            data: payload.new,
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      )
    
    await channel.subscribe()
    
    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`)
    }, 30000) // Every 30 seconds
    
    // Clean up on client disconnect
    req.on('close', () => {
      console.log(`Event stream closed for seller ${user.seller.id}`)
      clearInterval(heartbeatInterval)
      channel.unsubscribe()
    })
    
    req.on('error', (error) => {
      console.error('Event stream error:', error)
      clearInterval(heartbeatInterval)
      channel.unsubscribe()
    })
    
  } catch (error) {
    console.error('Failed to establish event stream:', error)
    sendError(res, error as Error)
  }
}

export default withMethods({
  GET: handleGet
})

// Disable Next.js timeout for SSE
export const config = {
  api: {
    responseLimit: false,
  },
}