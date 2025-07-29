import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Initialize Supabase client with proper typing
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'dummy-key',
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
  process.env.SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'dummy-service-key',
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
      .from('sellers')
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
    
    // Log performance metrics for queries over 100ms
    if (duration > 100) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`)
    }
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Query failed: ${queryName} took ${duration}ms`, error)
    throw error
  }
}