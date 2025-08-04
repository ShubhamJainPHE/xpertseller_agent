import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { withMethods, validateRequest, sendResponse, getAuthenticatedUser, getCachedData, setCachedData } from '../../../lib/api/utils'
import { supabaseAdmin } from '../../../lib/database/connection'

const OverviewSchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
  include_projections: z.boolean().default(true)
})

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req)
  const { timeframe, include_projections } = validateRequest(OverviewSchema, req.query)
  
  const cacheKey = `dashboard_overview_${user.seller.id}_${timeframe}_${include_projections}`
  const cached = getCachedData(cacheKey)
  
  if (cached) {
    return sendResponse(res, cached, 200, 'Dashboard overview retrieved from cache')
  }
  
  // Calculate date range
  const timeframes = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90
  }
  
  const daysBack = timeframes[timeframe as keyof typeof timeframes] || 7
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  const startDateStr = startDate.toISOString().split('T')[0]
  
  // Get recommendations summary
  const { data: recommendations, error: recsError } = await supabaseAdmin
    .from('recommendations')
    .select('*')
    .eq('seller_id', user.seller.id)
    .gte('created_at', startDate.toISOString())
  
  if (recsError) {
    throw new Error(`Failed to fetch recommendations: ${recsError.message}`)
  }
  
  // Get products performance
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select(`
      id, asin, title, current_price, velocity_30d, conversion_rate_30d,
      sales_data!inner(units_sold, revenue, date)
    `)
    .eq('seller_id', user.seller.id)
    .eq('is_active', true)
    .gte('sales_data.date', startDateStr)
  
  if (productsError) {
    throw new Error(`Failed to fetch products: ${productsError.message}`)
  }
  
  // Get recent events
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('fact_stream')
    .select('*')
    .eq('seller_id', user.seller.id)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: false })
    .limit(50)
  
  if (eventsError) {
    throw new Error(`Failed to fetch events: ${eventsError.message}`)
  }
  
  // Calculate metrics
  const totalRevenue = products?.reduce((sum, p) => 
    sum + ((p as any).sales_data?.reduce((s: number, sale: any) => s + (sale.revenue || 0), 0) || 0), 0
  ) || 0
  
  const totalUnits = products?.reduce((sum, p) => 
    sum + ((p as any).sales_data?.reduce((s: number, sale: any) => s + (sale.units_sold || 0), 0) || 0), 0
  ) || 0
  
  const avgConversionRate = products?.length ? 
    products.reduce((sum, p) => sum + (p.conversion_rate_30d || 0), 0) / products.length : 0
  
  // Categorize recommendations
  const recsByUrgency = {
    critical: recommendations?.filter(r => r.urgency_level === 'critical').length || 0,
    high: recommendations?.filter(r => r.urgency_level === 'high').length || 0,
    normal: recommendations?.filter(r => r.urgency_level === 'normal').length || 0,
    low: recommendations?.filter(r => r.urgency_level === 'low').length || 0
  }
  
  const recsByAgent = {
    loss_prevention: recommendations?.filter(r => r.agent_type === 'loss_prevention').length || 0,
    revenue_optimization: recommendations?.filter(r => r.agent_type === 'revenue_optimization').length || 0,
    strategic_intelligence: recommendations?.filter(r => r.agent_type === 'strategic_intelligence').length || 0,
    meta_agent: recommendations?.filter(r => r.agent_type === 'meta_agent').length || 0
  }
  
  // Calculate projected impact
  const projectedImpact = recommendations?.reduce((sum, r) => sum + (r.predicted_impact || 0), 0) || 0
  
  // Event analysis
  const eventsByCategory = events?.reduce((acc, event) => {
    acc[event.event_category] = (acc[event.event_category] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  
  const criticalEvents = events?.filter(e => e.importance_score >= 8).length || 0
  
  // Build response
  const overview = {
    summary: {
      timeframe,
      total_revenue: totalRevenue,
      total_units_sold: totalUnits,
      avg_conversion_rate: avgConversionRate,
      active_products: products?.length || 0,
      total_recommendations: recommendations?.length || 0,
      projected_impact: projectedImpact,
      critical_issues: recsByUrgency.critical,
      recent_events: events?.length || 0
    },
    recommendations: {
      by_urgency: recsByUrgency,
      by_agent: recsByAgent,
      pending: recommendations?.filter(r => r.status === 'pending').length || 0,
      accepted: recommendations?.filter(r => r.status === 'accepted').length || 0,
      executed: recommendations?.filter(r => r.status === 'executed').length || 0
    },
    performance_trends: {
      revenue_trend: calculateTrend(products?.map(p => (p as any).sales_data?.reduce((s: number, sale: any) => s + (sale.revenue || 0), 0) || 0) || []),
      units_trend: calculateTrend(products?.map(p => (p as any).sales_data?.reduce((s: number, sale: any) => s + (sale.units_sold || 0), 0) || 0) || []),
      conversion_trend: calculateTrend(products?.map(p => p.conversion_rate_30d || 0) || [])
    },
    alerts: {
      critical_events: criticalEvents,
      stockout_risks: events?.filter(e => e.event_type.includes('stockout')).length || 0,
      buybox_losses: events?.filter(e => e.event_type.includes('buy_box_lost')).length || 0,
      price_alerts: events?.filter(e => e.event_category === 'pricing' && e.importance_score >= 7).length || 0
    },
    events_breakdown: eventsByCategory,
    top_opportunities: recommendations
      ?.filter(r => r.status === 'pending')
      ?.sort((a, b) => (b.predicted_impact || 0) - (a.predicted_impact || 0))
      ?.slice(0, 5)
      ?.map(r => ({
        id: r.id,
        title: r.title,
        agent_type: r.agent_type,
        predicted_impact: r.predicted_impact,
        confidence_score: r.confidence_score,
        urgency_level: r.urgency_level
      })) || []
  }
  
  // Add projections if requested
  if (include_projections) {
    (overview as any).projections = await calculateProjections(user.seller.id, daysBack)
  }
  
  // Cache for 5 minutes
  setCachedData(cacheKey, overview, 5 * 60 * 1000)
  
  sendResponse(res, overview, 200, 'Dashboard overview retrieved successfully')
}

async function calculateProjections(sellerId: string, daysBack: number) {
  try {
    // Get historical performance for projections
    const { data: historical, error } = await supabaseAdmin
      .from('sales_data')
      .select(`
        date, units_sold, revenue,
        products!inner(seller_id)
      `)
      .eq('products.seller_id', sellerId)
      .gte('date', new Date(Date.now() - daysBack * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true })
    
    if (error || !historical || historical.length < 7) {
      return {
        revenue_projection_7d: 0,
        revenue_projection_30d: 0,
        confidence: 0
      }
    }
    
    // Simple trend-based projection
    const recentRevenue = historical.slice(-7).reduce((sum, d) => sum + (d.revenue || 0), 0)
    const previousRevenue = historical.slice(-14, -7).reduce((sum, d) => sum + (d.revenue || 0), 0)
    
    const growthRate = previousRevenue > 0 ? (recentRevenue - previousRevenue) / previousRevenue : 0
    const dailyAverage = recentRevenue / 7
    
    return {
      revenue_projection_7d: dailyAverage * 7 * (1 + growthRate),
      revenue_projection_30d: dailyAverage * 30 * (1 + growthRate),
      confidence: Math.min(0.95, 0.5 + Math.abs(growthRate))
    }
  } catch (error) {
    console.error('Failed to calculate projections:', error)
    return {
      revenue_projection_7d: 0,
      revenue_projection_30d: 0,
      confidence: 0
    }
  }
}

function calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable', percentage: number } {
  if (values.length < 2) {
    return { direction: 'stable', percentage: 0 }
  }
  
  const recent = values.slice(-Math.min(7, Math.floor(values.length / 2)))
  const previous = values.slice(0, Math.min(7, Math.floor(values.length / 2)))
  
  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
  const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length
  
  if (previousAvg === 0) {
    return { direction: 'stable', percentage: 0 }
  }
  
  const change = (recentAvg - previousAvg) / previousAvg
  const percentage = Math.round(change * 100)
  
  return {
    direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
    percentage: Math.abs(percentage)
  }
}

export default withMethods({
  GET: handleGet
})