import { OrdersSyncService } from './orders-sync'
import { InventorySyncService } from './inventory-sync'
import { PricingSyncService } from './pricing-sync'
import { supabaseAdmin } from '../../database/connection'

export class SyncScheduler {
  private ordersSyncService = new OrdersSyncService()
  private inventorySyncService = new InventorySyncService()
  private pricingSyncService = new PricingSyncService()

  // Run comprehensive sync for a seller
  async syncSeller(sellerId: string): Promise<{
    success: boolean
    summary: {
      orders: any
      inventory: any
      pricing: any
    }
    errors: string[]
  }> {
    const allErrors: string[] = []
    
    try {
      console.log(`Starting sync for seller ${sellerId}`)

      // Sync orders (less frequent)
      const ordersResult = await this.ordersSyncService.syncSellerOrders(sellerId)
      
      // Sync inventory (high priority)
      const inventoryResult = await this.inventorySyncService.syncSellerInventory(sellerId)
      
      // Sync pricing (high priority)
      const pricingResult = await this.pricingSyncService.syncSellerPricing(sellerId)

      allErrors.push(...ordersResult.errors, ...inventoryResult.errors, ...pricingResult.errors)

      // Log sync completion
      await supabaseAdmin
        .from('system_metrics')
        .insert({
          metric_type: 'system_health',
          metric_name: 'seller_sync_completed',
          metric_value: 1,
          dimensions: { 
            seller_id: sellerId,
            orders_processed: ordersResult.ordersProcessed,
            products_processed: inventoryResult.productsProcessed,
            pricing_updates: pricingResult.productsProcessed
          }
        })

      return {
        success: allErrors.length === 0,
        summary: {
          orders: ordersResult,
          inventory: inventoryResult,
          pricing: pricingResult
        },
        errors: allErrors
      }

    } catch (error) {
      allErrors.push(`Sync failed for seller ${sellerId}: ${error}`)
      return {
        success: false,
        summary: { orders: null, inventory: null, pricing: null },
        errors: allErrors
      }
    }
  }

  // Sync all active sellers
  async syncAllSellers(): Promise<void> {
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('status', 'active')

    if (!sellers) return

    console.log(`Starting sync for ${sellers.length} sellers`)

    for (const seller of sellers) {
      try {
        await this.syncSeller(seller.id)
        // Add delay between sellers to manage rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to sync seller ${seller.id}:`, error)
      }
    }
  }
}

export const syncScheduler = new SyncScheduler()