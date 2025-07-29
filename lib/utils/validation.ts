import { z } from 'zod'

// Input validation schemas
export const aiCopilotRequestSchema = z.object({
  sellerId: z.string().uuid('Invalid seller ID format'),
  action: z.enum([
    'predict_problems',
    'learn_from_outcomes', 
    'maximize_revenue',
    'orchestrate_workflow',
    'full_analysis',
    'get_personalized_recommendations',
    'send_daily_summary',
    'send_weekly_report'
  ]),
  parameters: z.object({
    trigger: z.string().optional(),
    context: z.record(z.any()).optional(),
    baseRecommendations: z.array(z.any()).optional()
  }).optional()
})

export const sellerIdSchema = z.string().uuid('Invalid seller ID format')

// Sanitization functions
export function sanitizeForDatabase(input: string): string {
  return input
    .replace(/['"\\;]/g, '') // Remove SQL injection chars
    .replace(/[<>]/g, '') // Remove XSS chars
    .trim()
    .substring(0, 1000) // Limit length
}

export function sanitizeForAI(input: string): string {
  return input
    .replace(/[{}[\]]/g, '') // Remove JSON injection
    .replace(/\n{3,}/g, '\n\n') // Limit line breaks
    .replace(/system|assistant|user:/gi, '') // Remove prompt injection
    .trim()
    .substring(0, 5000) // Limit AI input length
}

export function validateEnvironment(): void {
  const required = [
    'OPENAI_API_KEY',
    'COMPOSIO_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, number[]>()
  
  return (key: string): boolean => {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Clean old requests
    const keyRequests = requests.get(key) || []
    const validRequests = keyRequests.filter(time => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false // Rate limited
    }
    
    validRequests.push(now)
    requests.set(key, validRequests)
    return true // Allowed
  }
}