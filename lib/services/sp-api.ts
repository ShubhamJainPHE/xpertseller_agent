import crypto from 'crypto'
import { supabaseAdmin } from '../database/connection'
import { SPAPIConfigService } from '../config/sp-api-config'
import { 
  SPAPICredentials, 
  LWAToken, 
  SPAPIResponse, 
  ListingItem,
  InventorySummary,
  Order,
  OrderItem,
  Report,
  FinancialEventGroup,
  FinancialEvents,
  MoneyType
} from '../types/sp-api-types'

// FIXED: Remove duplicate interface declarations - now using imported types

export class SPApiService {
  // FIXED: Use centralized configuration service
  private config = SPAPIConfigService.getConfigForMarketplace(this.credentials.marketplaceId)
  
  constructor(private credentials: SPAPICredentials) {
    // FIXED: Log configuration for debugging
    SPAPIConfigService.logConfig(credentials.marketplaceId)
  }

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

    const response = await fetch(this.config.lwaUrl, {
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
   * REMOVED: AWS4 signature generation - not needed for SP-API
   * SP-API uses LWA token authentication via x-amz-access-token header
   * AWS credentials are only needed for specific IAM operations or if using IAM-based auth
   */

  /**
   * Make authenticated SP-API request
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const accessToken = await this.getLWAToken()
    const url = `${this.config.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,  // FIXED: Added missing Authorization Bearer header
      'x-amz-access-token': accessToken,
      'x-amz-date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      'host': new URL(this.config.baseUrl).hostname,
      'Content-Type': 'application/json'
    }

    // FIXED: SP-API uses LWA token authentication, not AWS signature v4
    // The x-amz-access-token header is sufficient for SP-API authentication
    // AWS signature v4 is only needed for specific IAM-based operations

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
   * Get seller's orders - FIXED RETURN TYPE
   */
  async getOrders(createdAfter?: Date): Promise<Order[]> {
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
   * Get inventory summary - FIXED RETURN TYPE
   */
  async getInventorySummary(): Promise<InventorySummary[]> {
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

  // ===== EXPANDED PRODUCT & CATALOG ENDPOINTS =====

  /**
   * Get ALL seller listings (FBM + FBA) - FIXED ENDPOINT FORMAT WITH TYPES
   */
  async getAllListings(nextToken?: string): Promise<SPAPIResponse<{ items: ListingItem[] }>> {
    const params = new URLSearchParams({
      marketplaceIds: this.credentials.marketplaceId,
      includedData: 'summaries,attributes,fulfillmentAvailability,procurement',
      ...(nextToken && { nextToken })
    })
    
    // FIXED: Use correct seller-specific endpoint format
    const endpoint = `/listings/2021-08-01/items/${this.credentials.sellerId}?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📋 Fetched ${response.items?.length || 0} listings (total: ${response.pagination?.totalResultCount || 'unknown'})`)
      return response
    } catch (error) {
      console.error('Failed to fetch all listings:', error)
      // FIXED: Throw error instead of swallowing it
      throw new Error(`getAllListings failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get detailed listing information by SKU - FIXED ERROR HANDLING WITH TYPES
   */
  async getListingDetails(sku: string): Promise<ListingItem> {
    // FIXED: Validate input parameter
    if (!sku || typeof sku !== 'string') {
      throw new Error('SKU is required and must be a string')
    }
    
    const params = new URLSearchParams({
      marketplaceIds: this.credentials.marketplaceId,
      includedData: 'summaries,attributes,fulfillmentAvailability,procurement'
    })
    
    const endpoint = `/listings/2021-08-01/items/${this.credentials.sellerId}/${encodeURIComponent(sku)}?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📄 Fetched listing details for SKU: ${sku}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch listing details for SKU ${sku}:`, error)
      // FIXED: Throw error instead of returning null
      throw new Error(`getListingDetails failed for SKU ${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search catalog items by keywords - FIXED INPUT VALIDATION
   */
  async searchCatalogItems(keywords: string, nextToken?: string): Promise<any> {
    // FIXED: Validate input parameters
    if (!keywords || typeof keywords !== 'string' || keywords.trim().length === 0) {
      throw new Error('Keywords parameter is required and must be a non-empty string')
    }
    
    const params = new URLSearchParams({
      marketplaceIds: this.credentials.marketplaceId,
      keywords: keywords.trim(),
      includedData: 'attributes,dimensions,identifiers,images,productTypes,relationships,salesRanks',
      pageSize: '20',
      ...(nextToken && { pageToken: nextToken }) // FIXED: Correct parameter name
    })
    const endpoint = `/catalog/2022-04-01/items?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🔍 Found ${response.items?.length || 0} catalog items for: ${keywords}`)
      return response
    } catch (error) {
      console.error(`Failed to search catalog for: ${keywords}`, error)
      // FIXED: Throw error instead of returning empty object
      throw new Error(`searchCatalogItems failed for keywords '${keywords}': ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get FBA fee estimates for ASINs - FIXED REQUEST FORMAT AND VALIDATION
   */
  async getFeeEstimates(requests: Array<{asin: string, price: number, currency?: string}>): Promise<any[]> {
    // FIXED: Validate input parameters
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      throw new Error('Fee estimate requests array is required and cannot be empty')
    }
    
    // FIXED: Validate each request
    for (const req of requests) {
      if (!req.asin || typeof req.price !== 'number' || req.price <= 0) {
        throw new Error(`Invalid fee estimate request: asin=${req.asin}, price=${req.price}`)
      }
    }
    
    const endpoint = `/products/fees/v0/feesEstimate`
    
    try {
      // FIXED: Correct SP-API fee estimate request format
      const requestBody = {
        FeesEstimateRequest: requests.map(req => ({
          MarketplaceId: this.credentials.marketplaceId,
          IdType: 'ASIN',
          IdValue: req.asin,
          IsAmazonFulfilled: true,
          PriceToEstimateFees: {
            ListingPrice: {
              CurrencyCode: req.currency || 'USD',
              Amount: req.price.toString() // FIXED: Amazon expects string, not number
            }
          },
          Identifier: req.asin
        }))
      }
      
      const response = await this.makeRequest(endpoint, 'POST', requestBody)
      console.log(`💰 Fetched fee estimates for ${requests.length} products`)
      return response.FeesEstimateResult || []
    } catch (error) {
      console.error('Failed to fetch fee estimates:', error)
      // FIXED: Throw error instead of returning empty array
      throw new Error(`getFeeEstimates failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get inventory health data
   */
  async getInventoryHealth(nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      marketplaceId: this.credentials.marketplaceId,
      ...(nextToken && { nextToken })
    })
    const endpoint = `/fba/inventory/v1/inventoryHealth?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🏥 Fetched inventory health for ${response.InventoryHealthByAsin?.length || 0} ASINs`)
      return response
    } catch (error) {
      console.error('Failed to fetch inventory health:', error)
      return { InventoryHealthByAsin: [], pagination: null }
    }
  }

  /**
   * Get product restrictions by ASIN
   */
  async getProductRestrictions(asin: string): Promise<any> {
    const endpoint = `/listings/2021-08-01/restrictions?asin=${asin}&marketplaceIds=${this.credentials.marketplaceId}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🚫 Fetched restrictions for ASIN: ${asin}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch restrictions for ASIN ${asin}:`, error)
      return { restrictions: [] }
    }
  }

  // ===== EXPANDED SALES & PERFORMANCE ENDPOINTS =====

  /**
   * Get detailed order items for a specific order - FIXED RETURN TYPE
   */
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const endpoint = `/orders/v0/orders/${orderId}/orderItems`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📋 Fetched ${response.OrderItems?.length || 0} items for order: ${orderId}`)
      return response.OrderItems || []
    } catch (error) {
      console.error(`Failed to fetch order items for ${orderId}:`, error)
      return []
    }
  }

  /**
   * Create and request business reports
   */
  async createBusinessReport(reportType: string, startDate: Date, endDate: Date): Promise<any> {
    const endpoint = `/reports/2021-06-30/reports`
    
    const reportRequest = {
      reportType,
      dataStartTime: startDate.toISOString(),
      dataEndTime: endDate.toISOString(),
      marketplaceIds: [this.credentials.marketplaceId]
    }
    
    try {
      const response = await this.makeRequest(endpoint, 'POST', reportRequest)
      console.log(`📈 Created ${reportType} report: ${response.reportId}`)
      return response
    } catch (error) {
      console.error(`Failed to create ${reportType} report:`, error)
      return null
    }
  }

  /**
   * Get report status and download URL
   */
  async getReport(reportId: string): Promise<any> {
    const endpoint = `/reports/2021-06-30/reports/${reportId}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📄 Report ${reportId} status: ${response.processingStatus}`)
      return response
    } catch (error) {
      console.error(`Failed to get report ${reportId}:`, error)
      return null
    }
  }

  /**
   * Download report data
   */
  async downloadReportData(documentUrl: string): Promise<any> {
    try {
      const response = await fetch(documentUrl)
      if (!response.ok) {
        throw new Error(`Report download failed: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type') || ''
      let data
      
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else if (contentType.includes('text/')) {
        data = await response.text()
      } else {
        data = await response.blob()
      }
      
      console.log(`📥 Downloaded report data (${contentType})`)
      return data
    } catch (error) {
      console.error('Failed to download report data:', error)
      return null
    }
  }

  /**
   * Get account health and performance metrics
   */
  async getAccountHealth(): Promise<any> {
    const endpoint = `/sellers/v1/account/accountHealth`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🏥 Fetched account health data`)
      return response
    } catch (error) {
      console.error('Failed to fetch account health:', error)
      return null
    }
  }

  // ===== EXPANDED INVENTORY & FULFILLMENT ENDPOINTS =====

  /**
   * Get inbound FBA shipments
   */
  async getInboundShipments(queryType: 'SHIPMENT' | 'DATE_RANGE' = 'SHIPMENT', nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      QueryType: queryType,
      MarketplaceId: this.credentials.marketplaceId,
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/fba/inbound/v0/shipments?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`🚚 Fetched ${response.ShipmentData?.length || 0} inbound shipments`)
      return response
    } catch (error) {
      console.error('Failed to fetch inbound shipments:', error)
      return { ShipmentData: [], NextToken: null }
    }
  }

  /**
   * Get shipment items for specific shipment
   */
  async getShipmentItems(shipmentId: string, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      MarketplaceId: this.credentials.marketplaceId,
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/fba/inbound/v0/shipments/${shipmentId}/items?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📦 Fetched ${response.ItemData?.length || 0} items for shipment: ${shipmentId}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch shipment items for ${shipmentId}:`, error)
      return { ItemData: [], NextToken: null }
    }
  }

  /**
   * Get stranded inventory
   */
  async getStrandedInventory(nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      MarketplaceId: this.credentials.marketplaceId,
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/fba/inventory/v1/strandedInventory?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`⚠️ Found ${response.StrandedInventory?.length || 0} stranded inventory items`)
      return response
    } catch (error) {
      console.error('Failed to fetch stranded inventory:', error)
      return { StrandedInventory: [], NextToken: null }
    }
  }

  /**
   * Get inventory age data
   */
  async getInventoryAge(nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      marketplaceId: this.credentials.marketplaceId,
      ...(nextToken && { nextToken })
    })
    const endpoint = `/fba/inventory/v1/inventoryAge?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📅 Fetched inventory age for ${response.InventoryAgeByAsin?.length || 0} ASINs`)
      return response
    } catch (error) {
      console.error('Failed to fetch inventory age:', error)
      return { InventoryAgeByAsin: [], nextToken: null }
    }
  }

  /**
   * Get removal orders
   */
  async getRemovalOrders(createdAfter?: Date, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      ...(createdAfter && { createdAfter: createdAfter.toISOString() }),
      ...(nextToken && { nextToken })
    })
    const endpoint = `/fba/removal/v0/removalOrders?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📤 Fetched ${response.orders?.length || 0} removal orders`)
      return response
    } catch (error) {
      console.error('Failed to fetch removal orders:', error)
      return { orders: [], nextToken: null }
    }
  }

  /**
   * Get FBM shipping services
   */
  async getFBMShippingServices(shipFromAddress: any, packageDimensions: any, weight: any, shipDate?: Date): Promise<any> {
    const endpoint = `/merchant-fulfillment/v0/eligibleShippingServices`
    
    const requestBody = {
      ShipmentRequestDetails: {
        AmazonOrderId: '', // This would come from actual order
        SellerOrderId: '', // This would come from actual order
        ItemList: [],
        ShipFromAddress: shipFromAddress,
        PackageDimensions: packageDimensions,
        Weight: weight,
        ShipDate: shipDate?.toISOString() || new Date().toISOString()
      }
    }
    
    try {
      const response = await this.makeRequest(endpoint, 'POST', requestBody)
      console.log(`🚚 Found ${response.ShippingServiceList?.length || 0} FBM shipping options`)
      return response
    } catch (error) {
      console.error('Failed to fetch FBM shipping services:', error)
      return { ShippingServiceList: [] }
    }
  }

  // ===== FINANCIAL DATA ENDPOINTS =====

  /**
   * Get financial event groups (settlements)
   */
  async getFinancialEventGroups(maxResultsPerPage: number = 100, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      MaxResultsPerPage: maxResultsPerPage.toString(),
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/finances/v0/financialEventGroups?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`💰 Fetched ${response.FinancialEventGroupList?.length || 0} financial event groups`)
      return response
    } catch (error) {
      console.error('Failed to fetch financial event groups:', error)
      return { FinancialEventGroupList: [], NextToken: null }
    }
  }

  /**
   * Get financial events for a specific group
   */
  async getFinancialEventsByGroupId(eventGroupId: string, maxResultsPerPage: number = 100, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      MaxResultsPerPage: maxResultsPerPage.toString(),
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/finances/v0/financialEventGroups/${eventGroupId}/financialEvents?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📅 Fetched financial events for group: ${eventGroupId}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch financial events for group ${eventGroupId}:`, error)
      return { FinancialEvents: {} }
    }
  }

  /**
   * Get financial events by date range
   */
  async getFinancialEventsByDateRange(postedAfter: Date, postedBefore?: Date, maxResultsPerPage: number = 100, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      PostedAfter: postedAfter.toISOString(),
      MaxResultsPerPage: maxResultsPerPage.toString(),
      ...(postedBefore && { PostedBefore: postedBefore.toISOString() }),
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/finances/v0/financialEvents?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📈 Fetched financial events from ${postedAfter.toDateString()}`)
      return response
    } catch (error) {
      console.error('Failed to fetch financial events by date range:', error)
      return { FinancialEvents: {} }
    }
  }

  /**
   * Get financial events by order ID
   */
  async getFinancialEventsByOrderId(orderId: string, maxResultsPerPage: number = 100, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      AmazonOrderId: orderId,
      MaxResultsPerPage: maxResultsPerPage.toString(),
      ...(nextToken && { NextToken: nextToken })
    })
    const endpoint = `/finances/v0/financialEvents?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`💳 Fetched financial events for order: ${orderId}`)
      return response
    } catch (error) {
      console.error(`Failed to fetch financial events for order ${orderId}:`, error)
      return { FinancialEvents: {} }
    }
  }

  // ===== CUSTOMER & COMMUNICATION ENDPOINTS =====

  /**
   * Get seller feedback
   */
  async getSellerFeedback(createdAfter?: Date): Promise<any> {
    const params = new URLSearchParams({
      ...(createdAfter && { CreatedAfter: createdAfter.toISOString() })
    })
    const endpoint = `/sellers/v1/account/feedback?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`⭐ Fetched seller feedback data`)
      return response
    } catch (error) {
      console.error('Failed to fetch seller feedback:', error)
      return { feedback: [] }
    }
  }

  /**
   * Get buyer-seller messages
   */
  async getBuyerMessages(createdAfter?: Date, nextToken?: string): Promise<any> {
    const params = new URLSearchParams({
      marketplaceIds: this.credentials.marketplaceId,
      ...(createdAfter && { createdAfter: createdAfter.toISOString() }),
      ...(nextToken && { nextToken })
    })
    const endpoint = `/messaging/v1/messages?${params.toString()}`
    
    try {
      const response = await this.makeRequest(endpoint)
      console.log(`📨 Fetched ${response.messages?.length || 0} buyer messages`)
      return response
    } catch (error) {
      console.error('Failed to fetch buyer messages:', error)
      return { messages: [], nextToken: null }
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
    // FIXED: Get seller credentials with marketplace info from database
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('sp_api_credentials, amazon_seller_id, marketplace_ids')
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
      // FIXED: Use seller's actual marketplace instead of hardcoded US
      marketplaceId: seller.marketplace_ids?.[0] || credentials.marketplaceId || 'ATVPDKIKX0DER'
    }

    return new SPApiService(spApiCredentials)
  } catch (error) {
    console.error('Failed to create SP-API service:', error)
    return null
  }
}