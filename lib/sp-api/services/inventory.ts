import { SPAPIClient, SPAPIResponse } from '../client'

export interface InventorySummary {
  asin?: string
  fnSku?: string
  sellerSku?: string
  condition?: string
  inventoryDetails?: InventoryDetails
  lastUpdatedTime?: string
  productName?: string
  totalQuantity?: number
}

export interface InventoryDetails {
  fulfillableQuantity?: number
  inboundWorkingQuantity?: number
  inboundShippedQuantity?: number
  inboundReceivingQuantity?: number
  reservedQuantity?: ReservedQuantity
  researchingQuantity?: ResearchingQuantity
  unfulfillableQuantity?: UnfulfillableQuantity
}

export interface ReservedQuantity {
  totalReservedQuantity?: number
  pendingCustomerOrderQuantity?: number
  pendingTransshipmentQuantity?: number
  fcProcessingQuantity?: number
}

export interface ResearchingQuantity {
  totalResearchingQuantity?: number
  researchingQuantityBreakdown?: ResearchingQuantityEntry[]
}

export interface ResearchingQuantityEntry {
  name?: string
  quantity?: number
}

export interface UnfulfillableQuantity {
  totalUnfulfillableQuantity?: number
  customerDamagedQuantity?: number
  warehouseDamagedQuantity?: number
  distributorDamagedQuantity?: number
  carrierDamagedQuantity?: number
  defectiveQuantity?: number
  expiredQuantity?: number
}

export interface GetInventoryParams {
  details?: boolean
  granularityType: 'Marketplace'
  granularityId: string
  startDateTime?: string
  sellerSkus?: string[]
  nextToken?: string
  maxResultsPerPage?: number
}

export interface InventoryAgedReport {
  asin?: string
  fnSku?: string
  sellerSku?: string
  productName?: string
  condition?: string
  totalQuantity?: number
  lastUpdatedTime?: string
  daysOfSupply?: number
  ageGroup?: AgeGroup
}

export type AgeGroup = '0_TO_90_DAYS' | '91_TO_180_DAYS' | '181_TO_270_DAYS' | '271_TO_365_DAYS' | '365_PLUS_DAYS'

export class InventoryService {
  constructor(private client: SPAPIClient) {}

  async getInventorySummaries(params: GetInventoryParams): Promise<SPAPIResponse<{
    granularity: {
      granularityType: string
      granularityId: string
    }
    inventorySummaries: InventorySummary[]
    nextToken?: string
  }>> {
    const queryParams: any = {
      granularityType: params.granularityType,
      granularityId: params.granularityId,
      details: params.details || false
    }

    if (params.startDateTime) {
      queryParams.startDateTime = params.startDateTime
    }
    if (params.sellerSkus && params.sellerSkus.length > 0) {
      queryParams.sellerSkus = params.sellerSkus.join(',')
    }
    if (params.nextToken) {
      queryParams.nextToken = params.nextToken
    }
    if (params.maxResultsPerPage) {
      queryParams.maxResultsPerPage = params.maxResultsPerPage
    }

    return this.client.get('/fba/inventory/v1/summaries', queryParams)
  }

  async getInventoryAgedReport(params: {
    granularityType: 'Marketplace'
    granularityId: string
    sellerSkus?: string[]
    nextToken?: string
    maxResultsPerPage?: number
  }): Promise<SPAPIResponse<{
    granularity: {
      granularityType: string
      granularityId: string
    }
    inventoryAgedReportItems: InventoryAgedReport[]
    nextToken?: string
  }>> {
    const queryParams: any = {
      granularityType: params.granularityType,
      granularityId: params.granularityId
    }

    if (params.sellerSkus && params.sellerSkus.length > 0) {
      queryParams.sellerSkus = params.sellerSkus.join(',')
    }
    if (params.nextToken) {
      queryParams.nextToken = params.nextToken
    }
    if (params.maxResultsPerPage) {
      queryParams.maxResultsPerPage = params.maxResultsPerPage
    }

    return this.client.get('/fba/inventory/v1/summaries', queryParams)
  }

  // Get all inventory for a seller with pagination
  async getAllInventory(marketplaceId: string, sellerSkus?: string[]): Promise<InventorySummary[]> {
    const allInventory: InventorySummary[] = []
    let nextToken: string | undefined

    do {
      const response = await this.getInventorySummaries({
        granularityType: 'Marketplace',
        granularityId: marketplaceId,
        details: true,
        sellerSkus,
        nextToken,
        maxResultsPerPage: 50
      })

      if (response.payload?.inventorySummaries) {
        allInventory.push(...response.payload.inventorySummaries)
      }

      nextToken = response.payload?.nextToken
    } while (nextToken)

    return allInventory
  }

  // Helper method to calculate stock levels and velocity
  async calculateStockMetrics(marketplaceId: string, asin: string): Promise<{
    currentStock: number
    availableStock: number
    inboundStock: number
    reservedStock: number
    daysOfSupply?: number
    stockStatus: 'healthy' | 'low' | 'critical' | 'out_of_stock'
  }> {
    const inventory = await this.getInventorySummaries({
      granularityType: 'Marketplace',
      granularityId: marketplaceId,
      details: true,
      sellerSkus: [asin] // In practice, you'd map ASIN to seller SKU
    })

    const item = inventory.payload?.inventorySummaries?.[0]
    if (!item || !item.inventoryDetails) {
      return {
        currentStock: 0,
        availableStock: 0,
        inboundStock: 0,
        reservedStock: 0,
        stockStatus: 'out_of_stock'
      }
    }

    const details = item.inventoryDetails
    const currentStock = item.totalQuantity || 0
    const availableStock = details.fulfillableQuantity || 0
    const inboundStock = (details.inboundWorkingQuantity || 0) + 
                        (details.inboundShippedQuantity || 0) + 
                        (details.inboundReceivingQuantity || 0)
    const reservedStock = details.reservedQuantity?.totalReservedQuantity || 0

    // Determine stock status
    let stockStatus: 'healthy' | 'low' | 'critical' | 'out_of_stock'
    if (availableStock === 0) {
      stockStatus = 'out_of_stock'
    } else if (availableStock <= 5) {
      stockStatus = 'critical'
    } else if (availableStock <= 20) {
      stockStatus = 'low'
    } else {
      stockStatus = 'healthy'
    }

    return {
      currentStock,
      availableStock,
      inboundStock,
      reservedStock,
      stockStatus
    }
  }

  // Monitor for low stock across all products
  async monitorLowStock(marketplaceId: string, threshold: number = 20): Promise<{
    asin?: string
    sellerSku?: string
    productName?: string
    availableQuantity: number
    daysUntilStockout?: number
    urgency: 'critical' | 'warning' | 'notice'
  }[]> {
    const inventory = await this.getAllInventory(marketplaceId)
    const lowStockItems: any[] = []

    for (const item of inventory) {
      const availableQuantity = item.inventoryDetails?.fulfillableQuantity || 0
      
      if (availableQuantity <= threshold) {
        let urgency: 'critical' | 'warning' | 'notice'
        if (availableQuantity === 0) {
          urgency = 'critical'
        } else if (availableQuantity <= 5) {
          urgency = 'critical'
        } else if (availableQuantity <= 10) {
          urgency = 'warning'
        } else {
          urgency = 'notice'
        }

        lowStockItems.push({
          asin: item.asin,
          sellerSku: item.sellerSku,
          productName: item.productName,
          availableQuantity,
          urgency
        })
      }
    }

    return lowStockItems.sort((a, b) => a.availableQuantity - b.availableQuantity)
  }
}