import { supabaseAdmin } from '../database/connection'

export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private name = 'unknown'
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`)
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
    
    console.error(`Circuit breaker ${this.name}: ${this.failures}/${this.threshold} failures`)
  }
  
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure
    }
  }
}

export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      backoff?: boolean
      shouldRetry?: (error: any) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = true,
      shouldRetry = () => true
    } = options
    
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error
        }
        
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        console.warn(`Retry ${attempt + 1}/${maxRetries} for operation, waiting ${waitTime}ms`)
      }
    }
    
    throw lastError
  }
}

export class ErrorLogger {
  static async logError(error: {
    message: string
    stack?: string
    context?: Record<string, any>
    sellerId?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }) {
    try {
      // Log to fact_stream for monitoring
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: error.sellerId || 'system',
          event_type: 'error.logged',
          event_category: 'system',
          data: {
            message: error.message,
            stack: error.stack?.substring(0, 1000), // Limit stack trace
            context: error.context,
            severity: error.severity || 'medium',
            timestamp: new Date().toISOString()
          },
          importance_score: this.getSeverityScore(error.severity),
          requires_action: error.severity === 'critical',
          processing_status: 'completed',
          processed_by: ['error_logger']
        })
      
      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.error('System Error:', error)
      }
      
    } catch (logError) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', logError)
      console.error('Original error:', error)
    }
  }
  
  private static getSeverityScore(severity?: string): number {
    const scores = {
      low: 3,
      medium: 5,
      high: 7,
      critical: 9
    }
    return scores[severity as keyof typeof scores] || 5
  }
}

export const circuitBreakers = {
  openai: new CircuitBreaker(5, 60000, 'openai'),
  composio: new CircuitBreaker(3, 30000, 'composio'),
  database: new CircuitBreaker(10, 120000, 'database'),
  notifications: new CircuitBreaker(5, 60000, 'notifications')
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string
    sellerId?: string
    circuitBreaker?: CircuitBreaker
    retryOptions?: Parameters<typeof RetryManager.withRetry>[1]
  }
): Promise<T | null> {
  try {
    const { operationName, sellerId, circuitBreaker, retryOptions } = context
    
    const executeOperation = async () => {
      if (circuitBreaker) {
        return await circuitBreaker.execute(operation)
      } else {
        return await operation()
      }
    }
    
    if (retryOptions) {
      return await RetryManager.withRetry(executeOperation, retryOptions)
    } else {
      return await executeOperation()
    }
    
  } catch (error) {
    await ErrorLogger.logError({
      message: `${context.operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        operationName: context.operationName,
        sellerId: context.sellerId
      },
      sellerId: context.sellerId,
      severity: 'high'
    })
    
    // Return null instead of throwing for graceful degradation
    return null
  }
}