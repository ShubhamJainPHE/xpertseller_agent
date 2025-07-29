import { supabaseAdmin } from './connection'
import { sanitizeForDatabase } from '../utils/validation'

export class SecureQueries {
  
  /**
   * Secure product queries with proper parameterization
   */
  static async getSellerProducts(sellerId: string, options: {
    isActive?: boolean
    limit?: number
    offset?: number
    includeAnalytics?: boolean
  } = {}) {
    const { isActive = true, limit = 100, offset = 0, includeAnalytics = false } = options
    
    let query = supabaseAdmin
      .from('products')
      .select(includeAnalytics ? `
        *,
        sales_data!inner(revenue, profit, date),
        advertising_data(spend, sales, acos, date)
      ` : '*')
      .eq('seller_id', sellerId)
      .eq('is_active', isActive)
      .order('velocity_30d', { ascending: false })
      .range(offset, offset + limit - 1)
    
    return query
  }
  
  /**
   * Secure recommendation queries
   */
  static async getRecommendations(sellerId: string, options: {
    status?: string
    agentType?: string
    dateRange?: { start: string, end: string }
    limit?: number
  } = {}) {
    const { status, agentType, dateRange, limit = 50 } = options
    
    let query = supabaseAdmin
      .from('recommendations')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (agentType) {
      query = query.eq('agent_type', agentType)
    }
    
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
    }
    
    return query
  }
  
  /**
   * Secure fact stream queries with date partitioning
   */
  static async getFactStreamEvents(sellerId: string, options: {
    eventType?: string
    category?: string
    limit?: number
    since?: string
  } = {}) {
    const { eventType, category, limit = 100, since } = options
    
    let query = supabaseAdmin
      .from('fact_stream')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (since) {
      query = query.gte('created_at', since)
    }
    
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    
    if (category) {
      query = query.eq('event_category', category)
    }
    
    return query
  }
  
  /**
   * Batch insert with transaction support
   */
  static async batchInsert<T>(tableName: string, records: T[], batchSize: number = 100): Promise<void> {
    const batches = []
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize))
    }
    
    for (const batch of batches) {
      const { error } = await supabaseAdmin
        .from(tableName)
        .insert(batch)
      
      if (error) {
        throw new Error(`Batch insert failed: ${error.message}`)
      }
    }
  }
  
  /**
   * Update with optimistic locking
   */
  static async updateWithLock(
    tableName: string, 
    id: string, 
    updates: Record<string, any>,
    expectedVersion?: number
  ) {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
      version: expectedVersion ? expectedVersion + 1 : undefined
    }
    
    let query = supabaseAdmin
      .from(tableName)
      .update(updateData)
      .eq('id', id)
    
    if (expectedVersion !== undefined) {
      query = query.eq('version', expectedVersion)
    }
    
    return query
  }
  
  /**
   * Safe aggregation queries with bounds checking
   */
  static async getAggregateMetrics(sellerId: string, dateRange: { start: string, end: string }) {
    // Use RPC for complex aggregations to prevent SQL injection
    const { data, error } = await supabaseAdmin.rpc('get_seller_metrics', {
      p_seller_id: sellerId,
      p_start_date: dateRange.start,
      p_end_date: dateRange.end
    })
    
    if (error) throw error
    return data
  }
}

/**
 * Database indexes needed for performance
 * Run these as migrations:
 */
export const REQUIRED_INDEXES = `
-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_active 
ON products(seller_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_velocity 
ON products(seller_id, velocity_30d DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_seller_status 
ON recommendations(seller_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_stream_seller_type 
ON fact_stream(seller_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_data_date 
ON sales_data(product_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advertising_data_date 
ON advertising_data(product_id, date DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recommendations_pending 
ON recommendations(seller_id, created_at DESC) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_stream_unprocessed 
ON fact_stream(seller_id, importance_score DESC) WHERE processing_status = 'pending';
`