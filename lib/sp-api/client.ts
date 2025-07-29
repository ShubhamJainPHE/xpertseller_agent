import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { createHash, createHmac } from 'crypto'
import { URLSearchParams } from 'url'
import { supabaseAdmin } from '../database/connection'

export interface SPAPICredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  tokenExpiry?: Date
  sellerId: string
  marketplaceId: string
}

export interface SPAPIResponse<T = any> {
  payload?: T
  errors?: SPAPIError[]
  warnings?: SPAPIWarning[]
}

export interface SPAPIError {
  code: string
  message: string
  details?: string
}

export interface SPAPIWarning {
  code: string
  message: string
  details?: string
}

export interface RateLimitInfo {
  rate: number
  burst: number
  timeWindow: string
}

class SPAPIRateLimiter {
  private buckets = new Map<string, {
    tokens: number
    lastRefill: number
    rate: number
    burst: number
  }>()

  constructor() {
    // Initialize common rate limits based on SP-API documentation
    this.initializeRateLimits()
  }

  private initializeRateLimits(): void {
    const rateLimits: Record<string, RateLimitInfo> = {
      'orders': { rate: 0.0167, burst: 20, timeWindow: '1minute' },
      'catalog': { rate: 2, burst: 20, timeWindow: '1second' },
      'inventory': { rate: 2, burst: 30, timeWindow: '1second' },
      'pricing': { rate: 0.5, burst: 10, timeWindow: '1second' },
      'reports': { rate: 0.0222, burst: 15, timeWindow: '1minute' },
      'notifications': { rate: 1, burst: 5, timeWindow: '1second' },
      'default': { rate: 0.5, burst: 10, timeWindow: '1second' }
    }

    Object.entries(rateLimits).forEach(([operation, limits]) => {
      this.buckets.set(operation, {
        tokens: limits.burst,
        lastRefill: Date.now(),
        rate: limits.rate,
        burst: limits.burst
      })
    })
  }

  async checkRateLimit(operation: string): Promise<boolean> {
    const bucket = this.buckets.get(operation) || this.buckets.get('default')!
    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000 // seconds

    // Refill tokens based on rate
    const tokensToAdd = Math.floor(timePassed * bucket.rate)
    bucket.tokens = Math.min(bucket.burst, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      return true
    }

    return false
  }

  async waitForToken(operation: string): Promise<void> {
    while (!(await this.checkRateLimit(operation))) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  getRemainingTokens(operation: string): number {
    const bucket = this.buckets.get(operation) || this.buckets.get('default')!
    return bucket.tokens
  }
}

class SPAPICircuitBreaker {
  private failures = 0
  private lastFailTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private readonly failureThreshold = 5
  private readonly recoveryTimeout = 60000 // 1 minute
  private readonly testRequestTimeout = 10000 // 10 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.recoveryTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is OPEN - SP-API temporarily unavailable')
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

  private onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): string {
    return this.state
  }

  getFailureCount(): number {
    return this.failures
  }
}

export class SPAPIClient {
  private axiosInstance: AxiosInstance
  private credentials: SPAPICredentials
  private rateLimiter: SPAPIRateLimiter
  private circuitBreaker: SPAPICircuitBreaker
  private baseURL: string
  private region: string

  constructor(credentials: SPAPICredentials, region: string = 'na') {
    this.credentials = credentials
    this.region = region
    this.baseURL = this.getBaseURL(region)
    this.rateLimiter = new SPAPIRateLimiter()
    this.circuitBreaker = new SPAPICircuitBreaker()

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XpertSeller/1.0 (Language=JavaScript; Platform=Node.js)'
      }
    })

    this.setupInterceptors()
  }

  private getBaseURL(region: string): string {
    const endpoints = {
      'na': 'https://sellingpartnerapi-na.amazon.com',
      'eu': 'https://sellingpartnerapi-eu.amazon.com',
      'fe': 'https://sellingpartnerapi-fe.amazon.com'
    }
    return endpoints[region as keyof typeof endpoints] || endpoints.na
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Ensure we have a valid access token
        await this.ensureValidToken()
        
        // Apply rate limiting
        const operation = this.getOperationFromPath(config.url || '')
        await this.rateLimiter.waitForToken(operation)

        // Add authentication headers
        config.headers.Authorization = `Bearer ${this.credentials.accessToken}`
        
        // Add AWS signature if required
        if (this.requiresAWSSignature(config.url || '')) {
          await this.addAWSSignature(config)
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling and metrics
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful request metrics
        this.logMetrics(response.config.url || '', response.status, Date.now())
        return response
      },
      async (error) => {
        // Handle token refresh on 401
        if (error.response?.status === 401) {
          await this.refreshAccessToken()
          return this.axiosInstance.request(error.config)
        }

        // Handle rate limiting on 429
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60')
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          return this.axiosInstance.request(error.config)
        }

        // Log error metrics
        this.logMetrics(
          error.config?.url || '', 
          error.response?.status || 0, 
          Date.now(),
          error.message
        )

        return Promise.reject(error)
      }
    )
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.credentials.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken()
    }
  }

  private isTokenExpired(): boolean {
    if (!this.credentials.tokenExpiry) return true
    return new Date() >= this.credentials.tokenExpiry
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      this.credentials.accessToken = response.data.access_token
      this.credentials.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000))

      // Update stored credentials
      await this.updateStoredCredentials()
    } catch (error) {
      console.error('Failed to refresh SP-API token:', error)
      throw new Error('SP-API authentication failed')
    }
  }

  private async updateStoredCredentials(): Promise<void> {
    try {
      await supabaseAdmin
        .from('sellers')
        .update({
          sp_api_credentials: {
            ...this.credentials,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', this.credentials.sellerId)
    } catch (error) {
      console.error('Failed to update stored credentials:', error)
    }
  }

  private getOperationFromPath(path: string): string {
    if (path.includes('/orders/')) return 'orders'
    if (path.includes('/catalog/')) return 'catalog'
    if (path.includes('/inventory/')) return 'inventory'
    if (path.includes('/pricing/')) return 'pricing'
    if (path.includes('/reports/')) return 'reports'
    if (path.includes('/notifications/')) return 'notifications'
    return 'default'
  }

  private requiresAWSSignature(path: string): boolean {
    // Most SP-API endpoints require AWS Signature v4
    return !path.includes('/auth/')
  }

  private async addAWSSignature(config: AxiosRequestConfig): Promise<void> {
    // AWS Signature Version 4 implementation
    const service = 'execute-api'
    const region = this.region === 'na' ? 'us-east-1' : 
                  this.region === 'eu' ? 'eu-west-1' : 'us-west-2'
    
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    const dateStamp = amzDate.substr(0, 8)

    // Add required AWS headers
    config.headers = {
      ...config.headers,
      'X-Amz-Date': amzDate,
      'X-Amz-Access-Token': this.credentials.accessToken
    }

    // Create canonical request
    const method = config.method?.toUpperCase() || 'GET'
    const uri = new URL(config.url!, this.baseURL).pathname
    const queryString = this.createCanonicalQueryString(config.params || {})
    const headerString = this.createCanonicalHeaders(config.headers)
    const signedHeaders = this.getSignedHeaders(config.headers)
    const payloadHash = this.createPayloadHash(config.data)

    const canonicalRequest = [
      method,
      uri,
      queryString,
      headerString,
      signedHeaders,
      payloadHash
    ].join('\n')

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n')

    // Calculate signature (simplified - in production use proper AWS SDK)
    const signature = this.calculateSignature(stringToSign, dateStamp, region, service)

    // Add authorization header
    config.headers.Authorization = 
      `${algorithm} Credential=${this.credentials.clientId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`
  }

  private createCanonicalQueryString(params: any): string {
    const searchParams = new URLSearchParams()
    Object.keys(params).sort().forEach(key => {
      searchParams.append(key, params[key])
    })
    return searchParams.toString()
  }

  private createCanonicalHeaders(headers: any): string {
    const sortedHeaders = Object.keys(headers)
      .filter(key => key.toLowerCase().startsWith('x-amz-') || key.toLowerCase() === 'host')
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
      .join('')
    
    return sortedHeaders
  }

  private getSignedHeaders(headers: any): string {
    return Object.keys(headers)
      .filter(key => key.toLowerCase().startsWith('x-amz-') || key.toLowerCase() === 'host')
      .map(key => key.toLowerCase())
      .sort()
      .join(';')
  }

  private createPayloadHash(data: any): string {
    const payload = data ? JSON.stringify(data) : ''
    return createHash('sha256').update(payload).digest('hex')
  }

  private calculateSignature(stringToSign: string, dateStamp: string, region: string, service: string): string {
    // Simplified signature calculation - use proper AWS SDK in production
    const kDate = createHmac('sha256', `AWS4${this.credentials.clientSecret}`).update(dateStamp).digest()
    const kRegion = createHmac('sha256', kDate).update(region).digest()
    const kService = createHmac('sha256', kRegion).update(service).digest()
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
    
    return createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  }

  private async logMetrics(url: string, status: number, timestamp: number, error?: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'api_performance',
          metric_name: 'sp_api_request',
          metric_value: Date.now() - timestamp,
          metric_unit: 'milliseconds',
          dimensions: {
            endpoint: url,
            status_code: status,
            success: status >= 200 && status < 300,
            error: error || null
          }
        })
    } catch (e) {
      console.error('Failed to log SP-API metrics:', e)
    }
  }

  // Public methods for making SP-API requests
  async get<T>(path: string, params?: any): Promise<SPAPIResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.axiosInstance.get(path, { params })
      return response.data
    })
  }

  async post<T>(path: string, data?: any): Promise<SPAPIResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.axiosInstance.post(path, data)
      return response.data
    })
  }

  async put<T>(path: string, data?: any): Promise<SPAPIResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.axiosInstance.put(path, data)
      return response.data
    })
  }

  async delete<T>(path: string): Promise<SPAPIResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.axiosInstance.delete(path)
      return response.data
    })
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/notifications/v1/destinations')
      return true
    } catch (error) {
      return false
    }
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(): string {
    return this.circuitBreaker.getState()
  }

  // Get rate limit status
  getRateLimitStatus(): Record<string, number> {
    const operations = ['orders', 'catalog', 'inventory', 'pricing', 'reports', 'notifications']
    const status: Record<string, number> = {}
    
    operations.forEach(op => {
      status[op] = this.rateLimiter.getRemainingTokens(op)
    })
    
    return status
  }
}