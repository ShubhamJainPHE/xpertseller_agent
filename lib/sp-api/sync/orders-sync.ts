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
    // Validate required fields
    if (!order.AmazonOrderId || !order.OrderStatus || !order.PurchaseDate) {
      throw new Error('Order missing required fields: AmazonOrderId, OrderStatus, or PurchaseDate')
    }

    // Convert SP-API order to database format with proper validation
    const orderData = {
      seller_id: sellerId,
      amazon_order_id: order.AmazonOrderId,
      order_status: order.OrderStatus,
      purchase_date: new Date(order.PurchaseDate).toISOString(),
      last_update_date: order.LastUpdateDate ? new Date(order.LastUpdateDate).toISOString() : new Date().toISOString(),
      fulfillment_channel: order.FulfillmentChannel || 'MFN',
      sales_channel: order.SalesChannel || 'Amazon.com',
      marketplace_id: order.MarketplaceId || 'ATVPDKIKX0DER',
      is_prime: Boolean(order.IsPrime),
      is_business_order: Boolean(order.IsBusinessOrder),
      number_of_items_shipped: parseInt(order.NumberOfItemsShipped) || 0,
      number_of_items_unshipped: parseInt(order.NumberOfItemsUnshipped) || 0
    }

    // Add order_total and order_data only if columns exist
    if (order.OrderTotal) {
      try {
        orderData.order_total = {
          amount: parseFloat(order.OrderTotal.Amount) || 0,
          currency_code: order.OrderTotal.CurrencyCode || 'USD'
        }
      } catch (e) {
        console.warn('Invalid order total data:', order.OrderTotal)
      }
    }

    // Store full order data as JSON if column exists
    try {
      orderData.order_data = order
    } catch (e) {
      console.warn('Cannot store full order data, column may not exist')
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

    // Create fact stream event (with error handling)
    try {
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
    } catch (factError) {
      console.warn('Fact stream not available, skipping event logging:', factError)
    }
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
    // Validate required fields
    if (!item.OrderItemId || !item.ASIN || !item.QuantityOrdered) {
      throw new Error('OrderItem missing required fields: OrderItemId, ASIN, or QuantityOrdered')
    }

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

    // Build order item data with validation
    const orderItemData = {
      seller_id: sellerId,
      product_id: product.id,
      amazon_order_id: amazonOrderId,
      order_item_id: item.OrderItemId,
      asin: item.ASIN,
      seller_sku: item.SellerSKU || null,
      title: item.Title || null,
      quantity_ordered: parseInt(item.QuantityOrdered) || 0,
      quantity_shipped: parseInt(item.QuantityShipped) || 0
    }

    // Add JSONB fields only if columns exist
    try {
      if (item.ItemPrice) {
        orderItemData.item_price = {
          amount: parseFloat(item.ItemPrice.Amount) || 0,
          currency_code: item.ItemPrice.CurrencyCode || 'USD'
        }
      }
    } catch (e) {
      console.warn('Cannot set item_price, column may not exist')
    }

    try {
      if (item.ItemTax) {
        orderItemData.item_tax = {
          amount: parseFloat(item.ItemTax.Amount) || 0,
          currency_code: item.ItemTax.CurrencyCode || 'USD'
        }
      }
    } catch (e) {
      console.warn('Cannot set item_tax, column may not exist')
    }

    try {
      if (item.PromotionDiscount) {
        orderItemData.promotion_discount = {
          amount: parseFloat(item.PromotionDiscount.Amount) || 0,
          currency_code: item.PromotionDiscount.CurrencyCode || 'USD'
        }
      }
    } catch (e) {
      console.warn('Cannot set promotion_discount, column may not exist')
    }

    try {
      orderItemData.item_data = item
    } catch (e) {
      console.warn('Cannot set item_data, column may not exist')
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

    // Get existing sales data for today
    const { data: existingSales } = await supabaseAdmin
      .from('sales_data')
      .select('units_sold, units_ordered, revenue')
      .eq('product_id', productId)
      .eq('date', today)
      .single()

    // Calculate cumulative values
    const cumulativeUnits = (existingSales?.units_sold || 0) + item.QuantityOrdered
    const cumulativeRevenue = (existingSales?.revenue || 0) + revenue

    // Upsert daily sales data with proper aggregation
    const { error } = await supabaseAdmin
      .from('sales_data')
      .upsert({
        product_id: productId,
        date: today,
        units_sold: cumulativeUnits,
        units_ordered: cumulativeUnits,
        revenue: cumulativeRevenue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id,date'
      })

    if (error) {
      console.error('Failed to update sales data:', error)
      throw new Error(`Sales data update failed: ${error.message}`)
    }
  }
}