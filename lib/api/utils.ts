import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { supabaseAdmin } from '../database/connection'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: Record<string, any>
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Request validation helper
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ')
      throw new APIError(`Validation failed: ${messages}`, 400, 'VALIDATION_ERROR')
    }
    throw new APIError('Invalid request data', 400, 'INVALID_DATA')
  }
}

// Pagination helper
export function parsePagination(req: NextApiRequest): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

// Response formatter
export function sendResponse<T>(
  res: NextApiResponse,
  data: T,
  statusCode: number = 200,
  message?: string,
  pagination?: any,
  meta?: Record<string, any>
): void {
  const response: APIResponse<T> = {
    success: statusCode >= 200 && statusCode < 300,
    data,
    message,
    pagination,
    meta
  }
  
  res.status(statusCode).json(response)
}

// Error handler
export function sendError(
  res: NextApiResponse,
  error: Error | APIError,
  statusCode?: number
): void {
  let code = statusCode || 500
  let message = 'Internal server error'
  let errorCode: string | undefined
  
  if (error instanceof APIError) {
    code = error.statusCode
    message = error.message
    errorCode = error.code
  } else if (error.message) {
    message = error.message
  }
  
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    statusCode: code
  })
  
  const response: APIResponse = {
    success: false,
    error: message,
    ...(errorCode && { code: errorCode })
  }
  
  res.status(code).json(response)
}

// Auth helper
export async function getAuthenticatedUser(req: NextApiRequest) {
  const userId = req.headers['x-user-id'] as string
  const userEmail = req.headers['x-user-email'] as string
  
  if (!userId) {
    throw new APIError('Authentication required', 401, 'AUTH_REQUIRED')
  }
  
  // Get seller record
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !seller) {
    throw new APIError('Seller not found', 404, 'SELLER_NOT_FOUND')
  }
  
  return {
    id: userId,
    email: userEmail,
    seller
  }
}

// Method handler wrapper
export function withMethods(handlers: Record<string, (req: NextApiRequest, res: NextApiResponse) => Promise<void>>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const method = req.method?.toUpperCase() || 'GET'
    const handler = handlers[method]
    
    if (!handler) {
      return sendError(res, new APIError(`Method ${method} not allowed`, 405, 'METHOD_NOT_ALLOWED'))
    }
    
    try {
      await handler(req, res)
    } catch (error) {
      sendError(res, error as Error)
    }
  }
}

// Database query helper
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessage: string = 'Database query failed'
): Promise<T> {
  const { data, error } = await queryFn()
  
  if (error) {
    console.error('Database error:', error)
    throw new APIError(errorMessage, 500, 'DATABASE_ERROR')
  }
  
  if (!data) {
    throw new APIError('Data not found', 404, 'NOT_FOUND')
  }
  
  return data
}

// Real-time event helper
export async function publishRealtimeEvent(
  channel: string,
  event: string,
  payload: any,
  sellerId?: string
): Promise<void> {
  try {
    const eventData = {
      type: event,
      payload,
      timestamp: new Date().toISOString(),
      ...(sellerId && { seller_id: sellerId })
    }
    
    await supabaseAdmin
      .channel(channel)
      .send({
        type: 'broadcast',
        event,
        payload: eventData
      })
  } catch (error) {
    console.error('Failed to publish realtime event:', error)
  }
}

// Cache helper
const cache = new Map<string, { data: any; expires: number }>()

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  cache.delete(key)
  return null
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = 300000): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs
  })
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/<[^>]*>/g, '') // Remove HTML tags
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  return input
}

// Performance logging
export function withPerformanceLogging(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()
    const method = req.method
    const url = req.url
    
    try {
      await handler(req, res)
    } finally {
      const duration = Date.now() - startTime
      
      // Log to database
      supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'api_performance',
          metric_name: 'endpoint_response_time',
          metric_value: duration,
          metric_unit: 'milliseconds',
          dimensions: {
            method,
            endpoint: url,
            status_code: res.statusCode
          }
        })
        .then(() => {}, (error: any) => console.error(error))
      
      console.log(`API ${method} ${url} - ${duration}ms - ${res.statusCode}`)
    }
  }
}