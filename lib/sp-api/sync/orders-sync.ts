import { spApiManager } from '../manager'
import { supabaseAdmin } from '../../database/connection'
import { Order, OrderItem } from '../services/orders'

export class OrdersSyncService {
  async syncSellerOrders(sellerId: string, startDate?: Date): Promise<{
    ordersProcessed: number
    itemsProcessed: number
    errors: string[]
  }> {
    const services = spApiManager.getSellerServices(sellerId)
    if (!services) {
      throw new Error(`No SP-API services found for seller ${sellerId}`)
    }

    const errors: string[] = []
    let ordersProcessed = 0
    let itemsProcessed = 0

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

      const marketplaceIds = seller.marketplace_ids

      // Sync orders from the last 30 days or specified start date
      const createdAfter = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      let nextToken: string | undefined
      do {
        try {
          const ordersResponse = await services.orders.getOrders({
            CreatedAfter: createdAfter.toISOString(),
            MarketplaceIds: marketplaceIds,
            MaxResultsPerPage: 50,
            NextToken: nextToken
          })

          if (ordersResponse.payload?.Orders) {
            for (const order of ordersResponse.payload.Orders) {
              try {
                await this.processOrder(sellerId, order)
                ordersProcessed++

                // Sync order items
                const itemsCount = await this.syncOrderItems(sellerId, order.AmazonOrderId)
                itemsProcessed += itemsCount
              } catch (error) {
                errors.push(`Failed to process order ${order.AmazonOrderId}: ${error}`)
              }
            }
          }

          nextToken = ordersResponse.payload?.NextToken
        } catch (error) {
          errors.push(`Failed to fetch orders: ${error}`)
          break
        }
      } while (nextToken)

    } catch (error) {
      errors.push(`Orders sync failed: ${error}`)
    }

    return { ordersProcessed, itemsProcessed, errors }
  }

  private async processOrder(sellerId: string, order: Order): Promise<void> {
    // Convert SP-API order to database format
    const orderData = {
      seller_id: sellerId,
      amazon_order_id: order.AmazonOrderId,
      order_status: order.OrderStatus,
      purchase_date: order.PurchaseDate,
      last_update_date: order.LastUpdateDate,
      fulfillment_channel: order.FulfillmentChannel,
      sales_channel: order.SalesChannel,
      order_total: order.OrderTotal ? {
        amount: parseFloat(order.OrderTotal.Amount),
        currency_code: order.OrderTotal.CurrencyCode
      } : null,
      marketplace_id: order.MarketplaceId,
      is_prime: order.IsPrime || false,
      is_business_order: order.IsBusinessOrder || false,
      order_data: order // Store full order data as JSON
    }

    // Upsert order data
    const { error } = await supabaseAdmin
      .from('orders')
      .upsert(orderData, { 
        onConflict: 'seller_id,amazon_order_id',
        ignoreDuplicates: false 
      })

    if (error) {
      throw new Error(`Failed to save order: ${error.message}`)
    }

    // Create fact stream event
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: sellerId,
        event_type: 'order.updated',
        event_category: 'performance',
        data: {
          amazon_order_id: order.AmazonOrderId,
          order_status: order.OrderStatus,
          order_total: order.OrderTotal,
          fulfillment_channel: order.FulfillmentChannel
        },
        importance_score: 5
      })
  }

  private async syncOrderItems(sellerId: string, amazonOrderId: string): Promise<number> {
    const services = spApiManager.getSellerServices(sellerId)
    if (!services) return 0

    let itemsProcessed = 0
    let nextToken: string | undefined

    do {
      try {
        const itemsResponse = await services.orders.getOrderItems(amazonOrderId, nextToken)
        
        if (itemsResponse.payload?.OrderItems) {
          for (const item of itemsResponse.payload.OrderItems) {
            await this.processOrderItem(sellerId, amazonOrderId, item)
            itemsProcessed++
          }
        }

        nextToken = itemsResponse.payload?.NextToken
      } catch (error) {
        console.error(`Failed to sync items for order ${amazonOrderId}:`, error)
        break
      }
    } while (nextToken)

    return itemsProcessed
  }

  private async processOrderItem(sellerId: string, amazonOrderId: string, item: OrderItem): Promise<void> {
    // Find matching product by ASIN
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('asin', item.ASIN)
      .single()

    if (!product) {
      console.warn(`Product not found for ASIN ${item.ASIN} in order ${amazonOrderId}`)
      return
    }

    const orderItemData = {
      seller_id: sellerId,
      product_id: product.id,
      amazon_order_id: amazonOrderId,
      order_item_id: item.OrderItemId,
      asin: item.ASIN,
      seller_sku: item.SellerSKU,
      title: item.Title,
      quantity_ordered: item.QuantityOrdered,
      quantity_shipped: item.QuantityShipped || 0,
      item_price: item.ItemPrice ? {
        amount: parseFloat(item.ItemPrice.Amount),
        currency_code: item.ItemPrice.CurrencyCode
      } : null,
      item_tax: item.ItemTax ? {
        amount: parseFloat(item.ItemTax.Amount),
        currency_code: item.ItemTax.CurrencyCode
      } : null,
      promotion_discount: item.PromotionDiscount ? {
        amount: parseFloat(item.PromotionDiscount.Amount),
        currency_code: item.PromotionDiscount.CurrencyCode
      } : null,
      item_data: item // Store full item data as JSON
    }

    // Upsert order item data
    const { error } = await supabaseAdmin
      .from('order_items')
      .upsert(orderItemData, { 
        onConflict: 'amazon_order_id,order_item_id',
        ignoreDuplicates: false 
      })

    if (error) {
      throw new Error(`Failed to save order item: ${error.message}`)
    }

    // Update product sales data
    await this.updateProductSalesData(product.id, item)
  }

  private async updateProductSalesData(productId: string, item: OrderItem): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const revenue = item.ItemPrice ? parseFloat(item.ItemPrice.Amount) : 0

    // Upsert daily sales data
    const { error } = await supabaseAdmin
      .from('sales_data')
      .upsert({
        product_id: productId,
        date: today,
        units_sold: item.QuantityOrdered,
        units_ordered: item.QuantityOrdered,
        revenue: revenue
      }, {
        onConflict: 'product_id,date',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Failed to update sales data:', error)
    }
  }
}