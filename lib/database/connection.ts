import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Initialize Supabase client with proper typing
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Service role client for backend operations
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_metrics')
      .select('id')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Connection pool management
class DatabasePool {
  private static instance: DatabasePool
  private connectionCount = 0
  private readonly maxConnections = 100

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
    }
    return DatabasePool.instance
  }

  async acquireConnection() {
    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Maximum database connections reached')
    }
    this.connectionCount++
    return supabaseAdmin
  }

  releaseConnection() {
    if (this.connectionCount > 0) {
      this.connectionCount--
    }
  }

  getConnectionCount(): number {
    return this.connectionCount
  }
}

export const dbPool = DatabasePool.getInstance()

// Query performance monitoring
export async function executeWithMetrics<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await queryFn()
    const duration = Date.now() - startTime
    
    // Log performance metrics (only if system_metrics table exists)
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'api_performance',
          metric_name: `query_${queryName}_duration`,
          metric_value: duration,
          metric_unit: 'milliseconds',
          dimensions: { query_name: queryName, status: 'success' }
        })
    } catch (metricsError) {
      // Ignore metrics errors during initial setup
      console.log('Metrics logging skipped (table may not exist yet)')
    }
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Log error metrics (only if system_metrics table exists)
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'api_performance',
          metric_name: `query_${queryName}_duration`,
          metric_value: duration,
          metric_unit: 'milliseconds',
          dimensions: { query_name: queryName, status: 'error' }
        })
    } catch (metricsError) {
      // Ignore metrics errors during initial setup
      console.log('Metrics logging skipped (table may not exist yet)')
    }
    
    throw error
  }
}