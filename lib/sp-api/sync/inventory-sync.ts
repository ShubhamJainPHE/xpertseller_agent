import { spApiManager } from '../manager'
import { supabaseAdmin } from '../../database/connection'
import { InventorySummary } from '../services/inventory'

export class InventorySyncService {
  async syncSellerInventory(sellerId: string): Promise<{
    productsProcessed: number
    lowStockAlerts: number
    errors: string[]
  }> {
    const services = spApiManager.getSellerServices(sellerId)
    if (!services) {
      throw new Error(`No SP-API services found for seller ${sellerId}`)
    }

    const errors: string[] = []
    let productsProcessed = 0
    let lowStockAlerts = 0

    try {
      // Get seller's marketplace info
      const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('marketplace_ids')
        .eq('id', sellerId)
        .single()

      if (!seller) {
        throw new Error(`Seller ${sellerId} not found`)
      }

      const marketplaceId = seller.marketplace_ids[0] // Use primary marketplace

      // Get all inventory
      const inventory = await services.inventory.getAllInventory(marketplaceId)

      for (const item of inventory) {
        try {
          await this.processInventoryItem(sellerId, item)
          productsProcessed++

          // Check for low stock conditions
          if (await this.checkLowStockCondition(sellerId, item)) {
            lowStockAlerts++
          }
        } catch (error) {
          errors.push(`Failed to process inventory item ${item.asin || item.sellerSku}: ${error}`)
        }
      }

    } catch (error) {
      errors.push(`Inventory sync failed: ${error}`)
    }

    return { productsProcessed, lowStockAlerts, errors }
  }

  private async processInventoryItem(sellerId: string, item: InventorySummary): Promise<void> {
    if (!item.asin && !item.sellerSku) {
      throw new Error('Inventory item missing both ASIN and SKU')
    }

    // Find matching product
    let query = supabaseAdmin
      .from('products')
      .select('id, reorder_point, velocity_7d')
      .eq('seller_id', sellerId)

    if (item.asin) {
      query = query.eq('asin', item.asin)
    } else if (item.sellerSku) {
      query = query.eq('seller_sku', item.sellerSku)
    }

    const { data: product } = await query.single()

    if (!product) {
      console.warn(`Product not found for inventory item: ASIN=${item.asin}, SKU=${item.sellerSku}`)
      return
    }

    const details = item.inventoryDetails
    const stockLevel = item.totalQuantity || 0
    const availableQuantity = details?.fulfillableQuantity || 0
    const reservedQuantity = details?.reservedQuantity?.totalReservedQuantity || 0
    const inboundQuantity = (details?.inboundWorkingQuantity || 0) + 
                           (details?.inboundShippedQuantity || 0) + 
                           (details?.inboundReceivingQuantity || 0)

    // Update product inventory levels
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        stock_level: stockLevel,
        reserved_quantity: reservedQuantity,
        inbound_quantity: inboundQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)

    if (error) {
      throw new Error(`Failed to update product inventory: ${error.message}`)
    }

    // Create fact stream event for inventory update
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: sellerId,
        asin: item.asin,
        event_type: 'inventory.updated',
        event_category: 'inventory',
        data: {
          stock_level: stockLevel,
          available_quantity: availableQuantity,
          reserved_quantity: reservedQuantity,
          inbound_quantity: inboundQuantity
        },
        importance_score: this.calculateInventoryImportance(stockLevel, availableQuantity, product.reorder_point)
      })
  }

  private async checkLowStockCondition(sellerId: string, item: InventorySummary): Promise<boolean> {
    const availableQuantity = item.inventoryDetails?.fulfillableQuantity || 0

    // Check for low stock conditions
    if (availableQuantity <= 10) {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: sellerId,
          asin: item.asin,
          event_type: availableQuantity === 0 ? 'inventory.stockout' : 'inventory.low',
          event_category: 'inventory',
          data: {
            available_quantity: availableQuantity,
            urgency_level: availableQuantity === 0 ? 'critical' : 'high'
          },
          importance_score: availableQuantity === 0 ? 10 : 8,
          requires_action: true
        })

      return true
    }

    return false
  }

  private calculateInventoryImportance(stockLevel: number, availableQuantity: number, reorderPoint: number): number {
    if (availableQuantity === 0) return 10
    if (availableQuantity <= 5) return 9
    if (availableQuantity <= reorderPoint) return 7
    return 5
  }
}