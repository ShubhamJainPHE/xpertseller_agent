import { SPAPIClient, SPAPICredentials } from './client'
import { OrdersService } from './services/orders'
import { InventoryService } from './services/inventory'
import { PricingService } from './services/pricing'
import { SellersService } from './services/sellers'
import { CatalogService } from './services/catalog'
import { FinancesService } from './services/finances'
import { ReportsService } from './services/reports'
import { ListingsService } from './services/listings'
import { NotificationsService } from './services/notifications'
import { MessagingService } from './services/messaging'
import { ShippingServiceV2 } from './services/shipping'
import { FeedsService } from './services/feeds'
import { APlusContentService } from './services/aplus-content'
import { VehiclesService } from './services/vehicles'
import { VendorService } from './services/vendor'
import { SystemService } from './services/system'
import { supabaseAdmin } from '../database/connection'

export class SPAPIManager {
  private clients = new Map<string, SPAPIClient>()
  private services = new Map<string, {
    orders: OrdersService
    inventory: InventoryService
    pricing: PricingService
    sellers: SellersService
    catalog: CatalogService
    finances: FinancesService
    reports: ReportsService
    listings: ListingsService
    notifications: NotificationsService
    messaging: MessagingService
    shipping: ShippingServiceV2
    feeds: FeedsService
    aplusContent: APlusContentService
    vehicles: VehiclesService
    vendor: VendorService
    system: SystemService
  }>()

  constructor() {
    this.initializeClients()
  }

  private async initializeClients(): Promise<void> {
    try {
      const { data: sellers, error } = await supabaseAdmin
        .from('sellers')
        .select('id, amazon_seller_id, marketplace_ids, sp_api_credentials')
        .eq('status', 'active')

      if (error) throw error

      for (const seller of sellers || []) {
        try {
          const credentials: SPAPICredentials = {
            ...seller.sp_api_credentials as any,
            sellerId: seller.id,
            marketplaceId: seller.marketplace_ids[0] // Use primary marketplace
          }

          const region = this.getRegionFromMarketplace(credentials.marketplaceId)
          const client = new SPAPIClient(credentials, region)

          // Test client health
          const isHealthy = await client.healthCheck()
          if (isHealthy) {
            this.clients.set(seller.id, client)
            this.services.set(seller.id, {
              orders: new OrdersService(client),
              inventory: new InventoryService(client),
              pricing: new PricingService(client),
              sellers: new SellersService(client),
              catalog: new CatalogService(client),
              finances: new FinancesService(client),
              reports: new ReportsService(client),
              listings: new ListingsService(client),
              notifications: new NotificationsService(client),
              messaging: new MessagingService(client),
              shipping: new ShippingServiceV2(client),
              feeds: new FeedsService(client),
              aplusContent: new APlusContentService(client),
              vehicles: new VehiclesService(client),
              vendor: new VendorService(client),
              system: new SystemService(client)
            })
          } else {
            console.warn(`SP-API client health check failed for seller ${seller.id}`)
          }
        } catch (error) {
          console.error(`Failed to initialize SP-API client for seller ${seller.id}:`, error)
        }
      }

      console.log(`Initialized SP-API clients for ${this.clients.size} sellers`)
    } catch (error) {
      console.error('Failed to initialize SP-API clients:', error)
    }
  }

  private getRegionFromMarketplace(marketplaceId: string): string {
    const marketplaceRegions: Record<string, string> = {
      'ATVPDKIKX0DER': 'na', // US
      'A2EUQ1WTGCTBG2': 'na', // Canada
      'A1AM78C64UM0Y8': 'na', // Mexico
      'A1RKKUPIHCS9HS': 'eu', // Spain
      'A13V1IB3VIYZZH': 'eu', // France
      'A1F83G8C2ARO7P': 'eu', // UK
      'A1PA6795UKMFR9': 'eu', // Germany
      'APJ6JRA9NG5V4': 'eu', // Italy
      'A1805IZSGTT6HS': 'eu', // Netherlands
      'A17E79C6D8DWNP': 'eu', // Saudi Arabia
      'A2VIGQ35RCS4UG': 'eu', // UAE
      'A21TJRUUN4KGV': 'eu', // India
      'A1VC38T7YXB528': 'fe', // Japan
      'AAHKV2X7AFYLW': 'fe', // China
      'A39IBJ37TRP1C6': 'fe', // Australia
      'A2ZV50J4W1RKNI': 'fe'  // Singapore
    }

    return marketplaceRegions[marketplaceId] || 'na'
  }

  // Get services for a specific seller
  getSellerServices(sellerId: string) {
    return this.services.get(sellerId)
  }

  // Get client for a specific seller
  getSellerClient(sellerId: string): SPAPIClient | undefined {
    return this.clients.get(sellerId)
  }

  // Add new seller client
  async addSellerClient(sellerId: string, credentials: SPAPICredentials): Promise<boolean> {
    try {
      const region = this.getRegionFromMarketplace(credentials.marketplaceId)
      const client = new SPAPIClient(credentials, region)

      // Test client health
      const isHealthy = await client.healthCheck()
      if (!isHealthy) {
        throw new Error('SP-API client health check failed')
      }

      this.clients.set(sellerId, client)
      this.services.set(sellerId, {
        orders: new OrdersService(client),
        inventory: new InventoryService(client),
        pricing: new PricingService(client),
        sellers: new SellersService(client),
        catalog: new CatalogService(client),
        finances: new FinancesService(client),
        reports: new ReportsService(client),
        listings: new ListingsService(client),
        notifications: new NotificationsService(client),
        messaging: new MessagingService(client),
        shipping: new ShippingServiceV2(client),
        feeds: new FeedsService(client),
        aplusContent: new APlusContentService(client),
        vehicles: new VehiclesService(client),
        vendor: new VendorService(client),
        system: new SystemService(client)
      })

      return true
    } catch (error) {
      console.error(`Failed to add SP-API client for seller ${sellerId}:`, error)
      return false
    }
  }

  // Remove seller client
  removeSellerClient(sellerId: string): void {
    this.clients.delete(sellerId)
    this.services.delete(sellerId)
  }

  // Get system-wide health status
  async getSystemHealth(): Promise<{
    totalClients: number
    healthyClients: number
    unhealthyClients: string[]
    circuitBreakerStatus: Record<string, string>
    rateLimitStatus: Record<string, Record<string, number>>
  }> {
    const unhealthyClients: string[] = []
    const circuitBreakerStatus: Record<string, string> = {}
    const rateLimitStatus: Record<string, Record<string, number>> = {}

    let healthyCount = 0

    for (const [sellerId, client] of this.clients.entries()) {
      try {
        const isHealthy = await client.healthCheck()
        if (isHealthy) {
          healthyCount++
        } else {
          unhealthyClients.push(sellerId)
        }

        circuitBreakerStatus[sellerId] = client.getCircuitBreakerStatus()
        rateLimitStatus[sellerId] = client.getRateLimitStatus()
      } catch (error) {
        unhealthyClients.push(sellerId)
        circuitBreakerStatus[sellerId] = 'error'
      }
    }

    return {
      totalClients: this.clients.size,
      healthyClients: healthyCount,
      unhealthyClients,
      circuitBreakerStatus,
      rateLimitStatus
    }
  }

  // Refresh all client credentials
  async refreshAllCredentials(): Promise<void> {
    const refreshPromises = Array.from(this.clients.values()).map(async (client) => {
      try {
        // Force token refresh
        await (client as any).refreshAccessToken()
      } catch (error) {
        console.error('Failed to refresh client credentials:', error)
      }
    })

    await Promise.all(refreshPromises)
  }

  // Get aggregated metrics across all clients
  async getAggregatedMetrics(): Promise<{
    totalRequests: number
    successRate: number
    averageResponseTime: number
    errorsByType: Record<string, number>
  }> {
    const { data: metrics, error } = await supabaseAdmin
      .from('system_metrics')
      .select('*')
      .eq('metric_type', 'api_performance')
      .eq('metric_name', 'sp_api_request')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error || !metrics) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorsByType: {}
      }
    }

    const totalRequests = metrics.length
    const successfulRequests = metrics.filter(m => 
      (m.dimensions as any)?.success === true
    ).length
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
    const averageResponseTime = metrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) / totalRequests

    const errorsByType: Record<string, number> = {}
    metrics
      .filter(m => (m.dimensions as any)?.success === false)
      .forEach(m => {
        const error = (m.dimensions as any)?.error || 'unknown'
        errorsByType[error] = (errorsByType[error] || 0) + 1
      })

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorsByType
    }
  }
}

// Global singleton instance
export const spApiManager = new SPAPIManager()