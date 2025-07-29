import Redis from 'ioredis'
import { supabaseAdmin } from '../database/connection'

export interface XpertSellerEvent {
  id: string
  type: string
  category: 'inventory' | 'pricing' | 'competition' | 'reviews' | 'performance' | 'advertising'
  sellerId: string
  asin?: string
  marketplaceId?: string
  timestamp: Date
  data: Record<string, any>
  metadata: {
    source: string
    confidence: number
    importance: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    version: string
  }
  correlationId?: string
  traceId?: string
}

export interface EventHandler {
  name: string
  pattern: string | RegExp
  handler: (event: XpertSellerEvent) => Promise<void>
  priority: number
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
    exponential: boolean
  }
}

export interface EventProcessingResult {
  eventId: string
  handlerName: string
  success: boolean
  processingTimeMs: number
  error?: string
  retryCount: number
}

class EventBus {
  private redis: Redis
  private subscribers = new Map<string, EventHandler[]>()
  private processingQueues = new Map<string, string>() // handler -> stream name
  private isProcessing = false
  private consumerGroup = 'xpertseller-agents'
  private consumerId = `agent-${process.env.NODE_ENV}-${Date.now()}`

  constructor() {
    this.redis = new Redis({
      host: process.env.UPSTASH_REDIS_HOST,
      port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
      password: process.env.UPSTASH_REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    })

    this.setupErrorHandling()
  }

  private setupErrorHandling(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
      this.logSystemMetric('redis_connection_error', 1)
    })

    this.redis.on('connect', () => {
      console.log('Redis connected successfully')
      this.logSystemMetric('redis_connection_success', 1)
    })

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...')
      this.logSystemMetric('redis_reconnection_attempt', 1)
    })
  }

  // Publish event to Redis Stream
  async publish(event: XpertSellerEvent): Promise<string> {
    try {
      const streamKey = this.getStreamKey(event.category, event.sellerId)
      const eventData = this.serializeEvent(event)

      // Add to Redis Stream
      const eventId = await this.redis.xadd(
        streamKey,
        '*', // Auto-generate ID
        'event', JSON.stringify(eventData),
        'timestamp', Date.now().toString(),
        'type', event.type,
        'category', event.category,
        'sellerId', event.sellerId,
        'importance', event.metadata.importance.toString()
      )

      // Store in database for persistence and querying
      await this.persistEvent(event, eventId)

      // Log publishing metrics
      await this.logSystemMetric('event_published', 1, {
        event_type: event.type,
        category: event.category,
        importance: event.metadata.importance
      })

      console.log(`Published event ${eventId} to stream ${streamKey}`)
      return eventId

    } catch (error) {
      console.error('Failed to publish event:', error)
      await this.logSystemMetric('event_publish_error', 1, {
        event_type: event.type,
        error: (error as Error).message
      })
      throw error
    }
  }

  // Subscribe to events with pattern matching
  async subscribe(handler: EventHandler): Promise<void> {
    const pattern = typeof handler.pattern === 'string' ? handler.pattern : handler.pattern.source
    
    if (!this.subscribers.has(pattern)) {
      this.subscribers.set(pattern, [])
    }
    
    this.subscribers.get(pattern)!.push(handler)
    
    // Create consumer group if it doesn't exist
    const streamPattern = this.getStreamPattern(pattern)
    await this.ensureConsumerGroup(streamPattern)
    
    console.log(`Subscribed handler ${handler.name} to pattern ${pattern}`)
  }

  // Start processing events
  async startProcessing(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log(`Starting event processing with consumer ID: ${this.consumerId}`)

    // Process events from all subscribed streams
    const streamPatterns = Array.from(this.subscribers.keys())
    
    for (const pattern of streamPatterns) {
      this.processStreamEvents(pattern).catch(error => {
        console.error(`Error processing stream for pattern ${pattern}:`, error)
      })
    }
  }

  // Stop processing events
  async stopProcessing(): Promise<void> {
    this.isProcessing = false
    console.log('Stopping event processing')
  }

  // Get related events by correlation ID
  async getRelatedEvents(correlationId: string, limit: number = 50): Promise<XpertSellerEvent[]> {
    try {
      const { data: events, error } = await supabaseAdmin
        .from('fact_stream')
        .select('*')
        .eq('correlation_id', correlationId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error

      return events?.map(this.deserializeEventFromDB) || []
    } catch (error) {
      console.error('Failed to get related events:', error)
      return []
    }
  }

  // Get event stream for a seller
  async getSellerEventStream(
    sellerId: string, 
    category?: string, 
    limit: number = 100,
    afterTimestamp?: Date
  ): Promise<XpertSellerEvent[]> {
    try {
      let query = supabaseAdmin
        .from('fact_stream')
        .select('*')
        .eq('seller_id', sellerId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('event_category', category)
      }

      if (afterTimestamp) {
        query = query.gt('timestamp', afterTimestamp.toISOString())
      }

      const { data: events, error } = await query

      if (error) throw error

      return events?.map(this.deserializeEventFromDB) || []
    } catch (error) {
      console.error('Failed to get seller event stream:', error)
      return []
    }
  }

  // Process events from a specific stream pattern
  private async processStreamEvents(pattern: string): Promise<void> {
    const streamKey = this.getStreamPattern(pattern)
    const handlers = this.subscribers.get(pattern) || []

    while (this.isProcessing) {
      try {
        // Read from stream with consumer group
        const results = await this.redis.xreadgroup(
          'GROUP', this.consumerGroup, this.consumerId,
          'COUNT', 10,
          'BLOCK', 5000, // 5 second timeout
          'STREAMS', streamKey, '>'
        )

        if (results && results.length > 0) {
          for (const [stream, messages] of results) {
            for (const [messageId, fields] of messages) {
              await this.processMessage(stream, messageId, fields, handlers)
            }
          }
        }
      } catch (error) {
        if ((error as Error).message !== 'Connection is closed.') {
          console.error(`Error reading from stream ${streamKey}:`, error)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  }

  // Process individual message
  private async processMessage(
    stream: string,
    messageId: string,
    fields: string[],
    handlers: EventHandler[]
  ): Promise<void> {
    try {
      // Parse message fields
      const messageData: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        messageData[fields[i]] = fields[i + 1]
      }

      const event = JSON.parse(messageData.event) as XpertSellerEvent
      
      // Execute matching handlers in priority order
      const sortedHandlers = handlers.sort((a, b) => b.priority - a.priority)
      
      for (const handler of sortedHandlers) {
        if (this.matchesPattern(event.type, handler.pattern)) {
          await this.executeHandler(event, handler, messageId)
        }
      }

      // Acknowledge message processing
      await this.redis.xack(this.consumerGroup, stream, messageId)

    } catch (error) {
      console.error(`Failed to process message ${messageId}:`, error)
      
      // Handle failed message (could implement retry logic here)
      await this.handleFailedMessage(stream, messageId, error as Error)
    }
  }

  // Execute event handler with retry logic
  private async executeHandler(
    event: XpertSellerEvent,
    handler: EventHandler,
    messageId: string,
    retryCount: number = 0
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      await handler.handler(event)
      
      const processingTime = Date.now() - startTime
      
      // Log successful processing
      await this.logProcessingResult({
        eventId: event.id,
        handlerName: handler.name,
        success: true,
        processingTimeMs: processingTime,
        retryCount
      })

      // Update event processing status
      await this.updateEventProcessingStatus(event.id, handler.name, 'completed')

    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = (error as Error).message

      // Check if we should retry
      if (handler.retryPolicy && retryCount < handler.retryPolicy.maxRetries) {
        const delay = handler.retryPolicy.exponential 
          ? handler.retryPolicy.backoffMs * Math.pow(2, retryCount)
          : handler.retryPolicy.backoffMs

        console.log(`Retrying handler ${handler.name} for event ${event.id} in ${delay}ms`)
        
        setTimeout(async () => {
          await this.executeHandler(event, handler, messageId, retryCount + 1)
        }, delay)

        return
      }

      // Log failed processing
      await this.logProcessingResult({
        eventId: event.id,
        handlerName: handler.name,
        success: false,
        processingTimeMs: processingTime,
        error: errorMessage,
        retryCount
      })

      // Update event processing status
      await this.updateEventProcessingStatus(event.id, handler.name, 'failed', errorMessage)

      console.error(`Handler ${handler.name} failed for event ${event.id}:`, error)
    }
  }

  // Helper methods
  private getStreamKey(category: string, sellerId: string): string {
    return `events:${category}:${sellerId}`
  }

  private getStreamPattern(pattern: string): string {
    // Convert event pattern to stream pattern
    if (pattern.includes('inventory')) return 'events:inventory:*'
    if (pattern.includes('pricing')) return 'events:pricing:*'
    if (pattern.includes('competition')) return 'events:competition:*'
    if (pattern.includes('reviews')) return 'events:reviews:*'
    if (pattern.includes('performance')) return 'events:performance:*'
    if (pattern.includes('advertising')) return 'events:advertising:*'
    return 'events:*'
  }

  private async ensureConsumerGroup(streamKey: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', streamKey, this.consumerGroup, '0', 'MKSTREAM')
    } catch (error) {
      // Group might already exist, which is fine
      if (!(error as Error).message.includes('BUSYGROUP')) {
        console.error(`Failed to create consumer group for ${streamKey}:`, error)
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return eventType.includes(pattern) || pattern === '*'
    }
    return pattern.test(eventType)
  }

  private serializeEvent(event: XpertSellerEvent): any {
    return {
      ...event,
      timestamp: event.timestamp.toISOString(),
      serializedAt: new Date().toISOString()
    }
  }

  private deserializeEventFromDB(dbEvent: any): XpertSellerEvent {
    return {
      id: dbEvent.id.toString(),
      type: dbEvent.event_type,
      category: dbEvent.event_category,
      sellerId: dbEvent.seller_id,
      asin: dbEvent.asin,
      marketplaceId: dbEvent.marketplace_id,
      timestamp: new Date(dbEvent.timestamp),
      data: dbEvent.data || {},
      metadata: dbEvent.metadata || { source: 'unknown', confidence: 0.5, importance: 5, version: '1.0' },
      correlationId: dbEvent.correlation_id,
      traceId: dbEvent.correlation_id // Using correlation_id as trace_id for now
    }
  }

  private async persistEvent(event: XpertSellerEvent, redisEventId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: event.sellerId,
          asin: event.asin,
          marketplace_id: event.marketplaceId,
          event_type: event.type,
          event_category: event.category,
          timestamp: event.timestamp.toISOString(),
          data: event.data,
          metadata: {
            ...event.metadata,
            redis_event_id: redisEventId
          },
          correlation_id: event.correlationId,
          importance_score: event.metadata.importance,
          requires_action: event.metadata.importance >= 7
        })
    } catch (error) {
      console.error('Failed to persist event to database:', error)
    }
  }

  private async updateEventProcessingStatus(
    eventId: string,
    handlerName: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      const { data: existingEvent } = await supabaseAdmin
        .from('fact_stream')
        .select('processed_by, processing_status')
        .eq('id', eventId)
        .single()

      if (existingEvent) {
        const processedBy = existingEvent.processed_by || []
        if (!processedBy.includes(handlerName)) {
          processedBy.push(handlerName)
        }

        await supabaseAdmin
          .from('fact_stream')
          .update({
            processed_by: processedBy,
            processing_status: status,
            ...(error && { metadata: { ...existingEvent.metadata, last_error: error } })
          })
          .eq('id', eventId)
      }
    } catch (error) {
      console.error('Failed to update event processing status:', error)
    }
  }

  private async handleFailedMessage(stream: string, messageId: string, error: Error): Promise<void> {
    // Could implement dead letter queue or retry mechanisms here
    console.error(`Message ${messageId} from stream ${stream} failed processing:`, error)
    
    await this.logSystemMetric('event_processing_failure', 1, {
      stream,
      message_id: messageId,
      error: error.message
    })
  }

  private async logProcessingResult(result: EventProcessingResult): Promise<void> {
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'agent_performance',
          metric_name: 'event_processing_result',
          metric_value: result.processingTimeMs,
          metric_unit: 'milliseconds',
          dimensions: {
            event_id: result.eventId,
            handler_name: result.handlerName,
            success: result.success,
            retry_count: result.retryCount,
            error: result.error || null
          }
        })
    } catch (error) {
      console.error('Failed to log processing result:', error)
    }
  }

  private async logSystemMetric(
    metricName: string,
    value: number,
    dimensions?: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'system_health',
          metric_name: metricName,
          metric_value: value,
          dimensions: dimensions || {}
        })
    } catch (error) {
      console.error('Failed to log system metric:', error)
    }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    await this.stopProcessing()
    await this.redis.quit()
  }

  // Health check
  async healthCheck(): Promise<{
    redis: boolean
    database: boolean
    activeStreams: number
    subscribedHandlers: number
  }> {
    try {
      // Check Redis connection
      const redisHealth = await this.redis.ping() === 'PONG'
      
      // Check database connection
      const { error } = await supabaseAdmin
        .from('fact_stream')
        .select('id')
        .limit(1)
      const databaseHealth = !error

      // Count active streams and handlers
      const activeStreams = await this.redis.eval(
        `return #redis.call('keys', 'events:*')`,
        0
      ) as number

      const subscribedHandlers = Array.from(this.subscribers.values())
        .reduce((total, handlers) => total + handlers.length, 0)

      return {
        redis: redisHealth,
        database: databaseHealth,
        activeStreams,
        subscribedHandlers
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        redis: false,
        database: false,
        activeStreams: 0,
        subscribedHandlers: 0
      }
    }
  }
}

// Global singleton instance
export const eventBus = new EventBus()

// Event creation helpers
export const createEvent = (
  type: string,
  category: XpertSellerEvent['category'],
  sellerId: string,
  data: Record<string, any>,
  options: Partial<{
    asin: string
    marketplaceId: string
    importance: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    source: string
    confidence: number
    correlationId: string
  }> = {}
): XpertSellerEvent => ({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  category,
  sellerId,
  asin: options.asin,
  marketplaceId: options.marketplaceId,
  timestamp: new Date(),
  data,
  metadata: {
    source: options.source || 'system',
    confidence: options.confidence || 0.8,
    importance: options.importance || 5,
    version: '1.0'
  },
  correlationId: options.correlationId,
  traceId: options.correlationId
})