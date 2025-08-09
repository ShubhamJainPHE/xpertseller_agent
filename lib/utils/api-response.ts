import { NextResponse } from 'next/server'

// Unified API response types
export interface ApiSuccessResponse<T = any> {
  success: true
  message: string
  data?: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// Helper functions for consistent API responses
export class ApiResponseHelper {
  
  /**
   * Create a successful API response
   */
  static success<T>(message: string, data?: T, status: number = 200): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      message,
      ...(data && { data })
    }
    
    return NextResponse.json(response, { status })
  }

  /**
   * Create an error API response
   */
  static error(
    error: string, 
    status: number = 400, 
    code?: string, 
    details?: any
  ): NextResponse {
    const response: ApiErrorResponse = {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details })
    }
    
    return NextResponse.json(response, { status })
  }

  /**
   * Create a validation error response
   */
  static validationError(error: string, details?: any): NextResponse {
    return this.error(error, 400, 'VALIDATION_ERROR', details)
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(error: string = 'Unauthorized'): NextResponse {
    const response = this.error(error, 401, 'UNAUTHORIZED')
    
    // Clear auth cookies on unauthorized
    response.cookies.delete('auth_token')
    response.cookies.delete('refresh_token')
    
    return response
  }

  /**
   * Create a forbidden response
   */
  static forbidden(error: string = 'Forbidden'): NextResponse {
    return this.error(error, 403, 'FORBIDDEN')
  }

  /**
   * Create a not found response
   */
  static notFound(error: string = 'Resource not found'): NextResponse {
    return this.error(error, 404, 'NOT_FOUND')
  }

  /**
   * Create a rate limit response
   */
  static rateLimited(
    error: string = 'Too many requests', 
    retryAfter?: number
  ): NextResponse {
    const response = this.error(error, 429, 'RATE_LIMITED', { retryAfter })
    
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString())
    }
    
    return response
  }

  /**
   * Create an internal server error response
   */
  static serverError(
    error: string = 'Internal server error', 
    details?: any
  ): NextResponse {
    return this.error(error, 500, 'SERVER_ERROR', details)
  }

  /**
   * Handle unknown errors with logging
   */
  static handleUnknownError(
    error: unknown, 
    context: string = 'API'
  ): NextResponse {
    console.error(`❌ ${context} Error:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return this.serverError('Something went wrong. Please try again later.', {
      originalError: errorMessage
    })
  }
}