import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { withMethods, validateRequest, parsePagination, sendResponse, sendError, getAuthenticatedUser, executeQuery } from '../../../lib/api/utils'
import { supabaseAdmin } from '../../../lib/database/connection'

const GetRecommendationsSchema = z.object({
  status: z.enum(['pending', 'viewed', 'accepted', 'rejected', 'expired', 'executed']).optional(),
  agent_type: z.enum(['loss_prevention', 'revenue_optimization', 'strategic_intelligence', 'meta_agent']).optional(),
  urgency_level: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  asin: z.string().optional(),
  min_impact: z.number().optional(),
  min_confidence: z.number().min(0).max(1).optional(),
  include_expired: z.boolean().default(false)
})

const UpdateRecommendationSchema = z.object({
  status: z.enum(['viewed', 'accepted', 'rejected']),
  seller_feedback: z.string().optional()
})

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req)
  const pagination = parsePagination(req)
  const filters = validateRequest(GetRecommendationsSchema, req.query)
  
  // Build query
  let query = supabaseAdmin
    .from('recommendations')
    .select(`
      *,
      products(asin, title, current_price, marketplace_id),
      recommendation_outcomes(actual_impact, accuracy_score, seller_satisfaction),
      automated_actions(execution_status, executed_at)
    `)
    .eq('seller_id', user.seller.id)
  
  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.agent_type) {
    query = query.eq('agent_type', filters.agent_type)
  }
  
  if (filters.urgency_level) {
    query = query.eq('urgency_level', filters.urgency_level)
  }
  
  if (filters.asin) {
    query = query.eq('asin', filters.asin)
  }
  
  if (filters.min_impact) {
    query = query.gte('predicted_impact', filters.min_impact)
  }
  
  if (filters.min_confidence) {
    query = query.gte('confidence_score', filters.min_confidence)
  }
  
  if (!filters.include_expired) {
    query = query.gt('expires_at', new Date().toISOString())
  }
  
  // Get total count for pagination
  const { count: totalCount } = await supabaseAdmin
    .from('recommendations')
    .select('id', { count: 'exact' })
    .eq('seller_id', user.seller.id)
  
  // Get paginated results
  const { data: recommendations, error } = await query
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1)
  
  if (error) {
    throw new Error(`Failed to fetch recommendations: ${error.message}`)
  }
  
  // Calculate stats
  const stats = {
    total: totalCount || 0,
    pending: recommendations?.filter(r => r.status === 'pending').length || 0,
    critical: recommendations?.filter(r => r.urgency_level === 'critical').length || 0,
    high_impact: recommendations?.filter(r => (r.predicted_impact || 0) > 1000).length || 0,
    avg_confidence: recommendations?.length ? 
      recommendations.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / recommendations.length : 0
  }
  
  sendResponse(res, recommendations, 200, 'Recommendations retrieved successfully', {
    page: pagination.page,
    limit: pagination.limit,
    total: totalCount || 0,
    totalPages: Math.ceil((totalCount || 0) / pagination.limit)
  }, { stats })
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  // This would be used by agents to create recommendations
  // For now, return method not allowed for manual creation
  sendError(res, new Error('Manual recommendation creation not allowed'), 405)
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req)
  const { id } = req.query
  const updates = validateRequest(UpdateRecommendationSchema, req.body)
  
  if (!id || typeof id !== 'string') {
    throw new Error('Recommendation ID is required')
  }
  
  // Verify ownership and update
  const { data: recommendation, error } = await supabaseAdmin
    .from('recommendations')
    .update({
      status: updates.status,
      ...(updates.status === 'viewed' && { viewed_at: new Date().toISOString() }),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('seller_id', user.seller.id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update recommendation: ${error.message}`)
  }
  
  // If accepted, potentially trigger automated action
  if (updates.status === 'accepted') {
    // Check if this recommendation can be auto-executed
    const canAutoExecute = recommendation.confidence_score >= 0.9 && 
                          recommendation.risk_level === 'low'
    
    if (canAutoExecute) {
      // Create automated action (simplified)
      await supabaseAdmin
        .from('automated_actions')
        .insert({
          recommendation_id: recommendation.id,
          action_type: recommendation.recommendation_type,
          action_data: recommendation.action_required,
          execution_status: 'pending',
          scheduled_at: new Date().toISOString()
        })
    }
  }
  
  // Log feedback if provided
  if (updates.seller_feedback) {
    await supabaseAdmin
      .from('recommendation_outcomes')
      .upsert({
        recommendation_id: id,
        seller_feedback: updates.seller_feedback,
        implementation_method: 'manual'
      })
  }
  
  sendResponse(res, recommendation, 200, 'Recommendation updated successfully')
}

export default withMethods({
  GET: handleGet,
  POST: handlePost,
  PUT: handlePut
})