import crypto from 'crypto'
import { supabaseAdmin } from '../database/connection'

interface SPApiCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  sellerId: string
  marketplaceId: string
}

interface LWAToken {
  access_token: string
  expires_in: number
  token_type: string
}

export class SPApiService {
  private baseUrl = 'https://sellingpartnerapi-na.amazon.com'
  private lwaUrl = 'https://api.amazon.com/auth/o2/token'
  
  constructor(private credentials: SPApiCredentials) {}

  /**
   * Get LWA (Login with Amazon) access token
   */
  private async getLWAToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refreshToken,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret
    })

    const response = await fetch(this.lwaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })

    if (!response.ok) {
      throw new Error(`LWA token request failed: ${response.statusText}`)
    }

    const data: LWAToken = await response.json()
    return data.access_token
  }

  /**
   * Generate AWS4 signature for SP-API requests
   */
  private generateAWS4Signature(
    method: string,
    path: string,
    querystring: string,
    headers: Record<string, string>,
    payload: string
  ): string {
    // Simplified AWS4 signature - in production use aws4 library
    const accessKey = process.env.AWS_ACCESS_KEY_ID || ''
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || ''
    const region = 'us-east-1'
    const service = 'execute-api'
    
    // This is a simplified version - use proper AWS4 signing in production
    const canonical = `${method}\n${path}\n${querystring}\n`
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(canonical)
      .digest('hex')
    
    return `AWS4-HMAC-SHA256 Credential=${accessKey}/20240101/${region}/${service}/aws4_request, SignedHeaders=host;x-amz-date, Signature=${signature}`
  }

  /**
   * Make authenticated SP-API request
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const accessToken = await this.getLWAToken()
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'x-amz-access-token': accessToken,
      'x-amz-date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      'host': 'sellingpartnerapi-na.amazon.com',
      'Content-Type': 'application/json'
    }

    // Add AWS4 signature (simplified - use proper implementation)
    if (process.env.AWS_ACCESS_KEY_ID) {
      headers['Authorization'] = this.generateAWS4Signature(
        method,
        new URL(url).pathname,
        new URL(url).search.slice(1),
        headers,
        body ? JSON.stringify(body) : ''
      )
    }

    console.log(`🔗 SP-API Request: ${method} ${endpoint}`)
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      console.error(`SP-API Error: ${response.status} ${response.statusText}`)
      throw new Error(`SP-API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get seller's orders
   */
  async getOrders(createdAfter?: Date): Promise<any[]> {
    const after = createdAfter || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    const endpoint = `/orders/v0/orders?MarketplaceIds=${this.credentials.marketplaceId}&CreatedAfter=${after.toISOString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📦 Fetched ${response.Orders?.length || 0} orders`)
      return response.Orders || []
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      return []
    }
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(): Promise<any[]> {
    const endpoint = `/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId=${this.credentials.marketplaceId}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📊 Fetched inventory for ${response.InventorySummaries?.length || 0} ASINs`)
      return response.InventorySummaries || []
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      return []
    }
  }

  /**
   * Get catalog items (products)
   */
  async getCatalogItem(asin: string): Promise<any> {
    const endpoint = `/catalog/2022-04-01/items/${asin}?marketplaceIds=${this.credentials.marketplaceId}&includedData=attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🛍️ Fetched catalog data for ASIN: ${asin}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch catalog item ${asin}:`, error)
      return null
    }
  }

  /**
   * Get competitive pricing
   */
  async getCompetitivePricing(asins: string[]): Promise<any[]> {
    const asinParams = asins.join(',')
    const endpoint = `/products/pricing/v0/price?MarketplaceId=${this.credentials.marketplaceId}&Asins=${asinParams}&ItemType=Asin`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`💰 Fetched pricing for ${asins.length} ASINs`)
      return response.Product || []
    } catch (error) {
      console.error('Failed to fetch competitive pricing:', error)
      return []
    }
  }

  /**
   * Get my price for products
   */
  async getMyPrices(asins: string[]): Promise<any[]> {
    const asinParams = asins.join(',')
    const endpoint = `/products/pricing/v0/price?MarketplaceId=${this.credentials.marketplaceId}&Asins=${asinParams}&ItemType=Asin&ItemCondition=New`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🏷️ Fetched my prices for ${asins.length} ASINs`)
      return response.Product || []
    } catch (error) {
      console.error('Failed to fetch my prices:', error)
      return []
    }
  }

  /**
   * Get sales metrics report
   */
  async getSalesMetrics(startDate: Date, endDate: Date): Promise<any> {
    // This would typically use Reports API to get sales data
    const endpoint = `/reports/2021-06-30/reports`
    
    try {
      // Create report request first
      const reportRequest = {
        reportType: 'GET_SALES_AND_TRAFFIC_REPORT',
        dataStartTime: startDate.toISOString(),
        dataEndTime: endDate.toISOString(),
        marketplaceIds: [this.credentials.marketplaceId]
      }
      
      const response = await this.makeRequest(endpoint, 'POST', reportRequest)
      console.log(`📈 Requested sales metrics report: ${response.reportId}`)
      return response
    } catch (error) {
      console.error('Failed to request sales metrics:', error)
      return null
    }
  }

  /**
   * Update product price
   */
  async updatePrice(sku: string, newPrice: number): Promise<boolean> {
    const endpoint = `/listings/2021-08-01/items/${this.credentials.sellerId}/${sku}`
    
    try {
      const updateData = {
        productType: 'PRODUCT',
        patches: [{
          op: 'replace',
          path: '/attributes/list_price',
          value: [{
            Amount: newPrice,
            CurrencyCode: 'USD'
          }]
        }]
      }
      
      await this.makeRequest(endpoint, 'POST', updateData)
      console.log(`💲 Updated price for SKU ${sku} to $${newPrice}`)
      return true
    } catch (error) {
      console.error(`Failed to update price for SKU ${sku}:`, error)
      return false
    }
  }

  /**
   * Validate SP-API credentials by making a test call
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.getLWAToken()
      console.log('✅ SP-API credentials validated successfully')
      return { valid: true }
    } catch (error) {
      console.error('❌ SP-API credential validation failed:', error)
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

/**
 * Factory function to create SP-API service for a seller
 */
export async function createSPApiService(sellerId: string): Promise<SPApiService | null> {
  try {
    // Get seller credentials from database
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('sp_api_credentials, amazon_seller_id')
      .eq('id', sellerId)
      .single()

    if (!seller || !seller.sp_api_credentials) {
      throw new Error('Seller or SP-API credentials not found')
    }

    const credentials = seller.sp_api_credentials as any
    const spApiCredentials: SPApiCredentials = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: credentials.refreshToken,
      sellerId: seller.amazon_seller_id,
      marketplaceId: 'ATVPDKIKX0DER' // US marketplace
    }

    return new SPApiService(spApiCredentials)
  } catch (error) {
    console.error('Failed to create SP-API service:', error)
    return null
  }
}