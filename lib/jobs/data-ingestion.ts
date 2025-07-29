import { createSPApiService } from '../services/sp-api'
import { supabaseAdmin } from '../database/connection'
import { Database } from '../database/types'

type Product = Database['public']['Tables']['products']['Insert']
// type SalesData = Database['public']['Tables']['sales_data']['Insert']
type FactStream = Database['public']['Tables']['fact_stream']['Insert']

export class DataIngestionService {
  
  /**
   * Sync all data for a seller
   */
  static async syncSellerData(sellerId: string): Promise<void> {
    console.log(`🔄 Starting data sync for seller: ${sellerId}`)
    
    const spApi = await createSPApiService(sellerId)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }

    try {
      // Run all sync operations in parallel
      await Promise.all([
        this.syncProducts(sellerId, spApi),
        this.syncOrders(sellerId, spApi),
        this.syncInventory(sellerId, spApi),
        this.syncPricing(sellerId, spApi)
      ])

      console.log(`✅ Data sync completed for seller: ${sellerId}`)
    } catch (error) {
      console.error(`❌ Data sync failed for seller ${sellerId}:`, error)
      throw error
    }
  }

  /**
   * Sync product catalog from SP-API
   */
  private static async syncProducts(sellerId: string, spApi: any): Promise<void> {
    console.log('📦 Syncing products...')
    
    try {
      // Get current inventory to find ASINs
      const inventory = await spApi.getInventorySummary()
      
      for (const item of inventory) {
        const asin = item.asin
        if (!asin) continue

        // Get detailed catalog info
        const catalogItem = await spApi.getCatalogItem(asin)
        if (!catalogItem) continue

        // Transform SP-API data to our schema
        const product: Product = {
          seller_id: sellerId,
          asin: asin,
          marketplace_id: item.marketplaceId || 'ATVPDKIKX0DER',
          title: catalogItem.attributes?.item_name?.[0]?.value || 'Unknown Product',
          brand: catalogItem.attributes?.brand?.[0]?.value || null,
          category: catalogItem.productTypes?.[0]?.displayName || null,
          current_price: null, // Will be filled by pricing sync
          list_price: null,
          stock_level: item.totalQuantity || 0,
          reserved_quantity: item.reservedQuantity || 0,
          inbound_quantity: item.inboundQuantity || 0,
          is_fba: item.fulfillmentChannelSku?.includes('FBA') || false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Upsert product
        await supabaseAdmin
          .from('products')
          .upsert(product, {
            onConflict: 'seller_id,asin,marketplace_id'
          })

        // Create fact stream event
        await this.createFactStreamEvent(sellerId, {
          asin,
          event_type: 'product.synced',
          event_category: 'inventory',
          data: { product }
        })

        console.log(`✅ Synced product: ${asin}`)
      }
    } catch (error) {
      console.error('Failed to sync products:', error)
    }
  }

  /**
   * Sync orders and generate sales data
   */
  private static async syncOrders(sellerId: string, spApi: any): Promise<void> {
    console.log('🛒 Syncing orders...')
    
    try {
      const orders = await spApi.getOrders()
      
      // Group orders by date and ASIN for sales_data table
      const salesMap = new Map<string, {
        productId: string
        date: string
        units: number
        revenue: number
      }>()

      for (const order of orders) {
        const orderDate = new Date(order.PurchaseDate).toISOString().split('T')[0]
        
        // Get order items
        for (const item of order.OrderItems || []) {
          const asin = item.ASIN
          if (!asin) continue

          // Get product ID from our database
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('seller_id', sellerId)
            .eq('asin', asin)
            .single()

          if (!product) continue

          const key = `${product.id}-${orderDate}`
          const revenue = parseFloat(item.ItemPrice?.Amount || '0')
          const units = parseInt(item.QuantityOrdered || '1')

          if (salesMap.has(key)) {
            const existing = salesMap.get(key)!
            existing.units += units
            existing.revenue += revenue
          } else {
            salesMap.set(key, {
              productId: product.id,
              date: orderDate,
              units,
              revenue
            })
          }
        }
      }

      // Insert sales data
      for (const [key, salesData] of salesMap) {
        const salesRecord: any = {
          product_id: salesData.productId,
          date: salesData.date,
          units_sold: salesData.units,
          units_ordered: salesData.units,
          revenue: salesData.revenue,
          profit: salesData.revenue * 0.3, // Estimated 30% margin
          created_at: new Date().toISOString()
        }

        await supabaseAdmin
          .from('sales_data')
          .upsert(salesRecord, {
            onConflict: 'product_id,date'
          })
      }

      console.log(`✅ Synced ${orders.length} orders`)
    } catch (error) {
      console.error('Failed to sync orders:', error)
    }
  }

  /**
   * Sync inventory levels
   */
  private static async syncInventory(sellerId: string, spApi: any): Promise<void> {
    console.log('📊 Syncing inventory...')
    
    try {
      const inventory = await spApi.getInventorySummary()
      
      for (const item of inventory) {
        const asin = item.asin
        if (!asin) continue

        // Update product inventory
        await supabaseAdmin
          .from('products')
          .update({
            stock_level: item.totalQuantity || 0,
            reserved_quantity: item.reservedQuantity || 0,
            inbound_quantity: item.inboundQuantity || 0,
            updated_at: new Date().toISOString()
          })
          .eq('seller_id', sellerId)
          .eq('asin', asin)

        // Check for low stock and create events
        const totalQuantity = item.totalQuantity || 0
        if (totalQuantity <= 10) { // Low stock threshold
          await this.createFactStreamEvent(sellerId, {
            asin,
            event_type: 'inventory.low_stock',
            event_category: 'inventory',
            importance_score: totalQuantity <= 5 ? 9 : 7,
            requires_action: true,
            data: {
              current_stock: totalQuantity,
              reserved: item.reservedQuantity,
              inbound: item.inboundQuantity
            }
          })
        }
      }

      console.log(`✅ Synced inventory for ${inventory.length} products`)
    } catch (error) {
      console.error('Failed to sync inventory:', error)
    }
  }

  /**
   * Sync pricing data
   */
  private static async syncPricing(sellerId: string, spApi: any): Promise<void> {
    console.log('💰 Syncing pricing...')
    
    try {
      // Get all seller's ASINs
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, asin')
        .eq('seller_id', sellerId)

      if (!products) return

      const asins = products.map(p => p.asin)
      const chunks = this.chunkArray(asins, 20) // SP-API limit

      for (const chunk of chunks) {
        try {
          const [myPrices, competitivePrices] = await Promise.all([
            spApi.getMyPrices(chunk),
            spApi.getCompetitivePricing(chunk)
          ])

          // Update product prices
          for (const priceData of myPrices) {
            const asin = priceData.ASIN
            const price = priceData.Product?.Offers?.[0]?.ListingPrice?.Amount

            if (asin && price) {
              await supabaseAdmin
                .from('products')
                .update({
                  current_price: parseFloat(price),
                  updated_at: new Date().toISOString()
                })
                .eq('seller_id', sellerId)
                .eq('asin', asin)
            }
          }

          // Process competitive pricing for competitor_data table
          for (const compData of competitivePrices) {
            const asin = compData.ASIN
            const offers = compData.Product?.CompetitivePricing?.CompetitivePrices || []

            for (const offer of offers) {
              if (offer.CompetitivePriceId !== 'OurPrice') {
                // This is a competitor price
                const competitorPrice = offer.Price?.ListingPrice?.Amount
                if (competitorPrice) {
                  // Store competitor data (simplified)
                  await this.createFactStreamEvent(sellerId, {
                    asin,
                    event_type: 'pricing.competitor_update',
                    event_category: 'competition',
                    data: {
                      competitor_price: parseFloat(competitorPrice),
                      price_id: offer.CompetitivePriceId
                    }
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to sync pricing for chunk:`, error)
        }
      }

      console.log(`✅ Synced pricing for ${asins.length} products`)
    } catch (error) {
      console.error('Failed to sync pricing:', error)
    }
  }

  /**
   * Create fact stream event for AI agents
   */
  private static async createFactStreamEvent(
    sellerId: string, 
    eventData: Partial<FactStream>
  ): Promise<void> {
    const event: FactStream = {
      seller_id: sellerId,
      asin: eventData.asin || null,
      marketplace_id: eventData.marketplace_id || null,
      event_type: eventData.event_type!,
      event_category: eventData.event_category!,
      timestamp: new Date().toISOString(),
      data: eventData.data || {},
      metadata: eventData.metadata || {},
      importance_score: eventData.importance_score || 5,
      requires_action: eventData.requires_action || false,
      processing_status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    }

    await supabaseAdmin
      .from('fact_stream')
      .insert(event)
  }

  /**
   * Utility function to chunk arrays
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Start periodic sync for all active sellers
   */
  static async startPeriodicSync(): Promise<void> {
    console.log('🔄 Starting periodic data sync...')
    
    // Get all active sellers
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('status', 'active')
      .eq('onboarding_completed', true)

    if (!sellers) return

    // Sync each seller (in production, use queue system)
    for (const seller of sellers) {
      try {
        await this.syncSellerData(seller.id)
      } catch (error) {
        console.error(`Failed to sync seller ${seller.id}:`, error)
      }
    }
  }
}