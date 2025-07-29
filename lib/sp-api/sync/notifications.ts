import { SPAPIClient } from '../client'
import { supabaseAdmin } from '../../database/connection'

export interface SPAPINotification {
  notificationVersion: string
  notificationType: string
  payloadVersion: string
  eventTime: string
  payload: any
  notificationMetadata: {
    applicationId: string
    subscriptionId: string
    publishTime: string
    notificationId: string
  }
}

export class NotificationHandler {
  async processNotification(notification: SPAPINotification): Promise<void> {
    try {
      switch (notification.notificationType) {
        case 'ORDER_STATUS_CHANGE':
          await this.handleOrderStatusChange(notification)
          break
        case 'FBA_INVENTORY_AVAILABILITY_CHANGE':
          await this.handleInventoryChange(notification)
          break
        case 'PRICING_HEALTH':
          await this.handlePricingHealth(notification)
          break
        default:
          console.log(`Unhandled notification type: ${notification.notificationType}`)
      }
    } catch (error) {
      console.error('Failed to process SP-API notification:', error)
    }
  }

  private async handleOrderStatusChange(notification: SPAPINotification): Promise<void> {
    const orderData = notification.payload
    
    // Find seller by marketplace
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .contains('marketplace_ids', [orderData.MarketplaceId])
      .single()

    if (!seller) return

    // Create real-time fact stream event
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: seller.id,
        event_type: 'order.status_changed',
        event_category: 'performance',
        data: orderData,
        importance_score: 6,
        requires_action: orderData.OrderStatus === 'Canceled'
      })
  }

  private async handleInventoryChange(notification: SPAPINotification): Promise<void> {
    const inventoryData = notification.payload
    
    // Create inventory alert
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: inventoryData.SellerId,
        asin: inventoryData.ASIN,
        event_type: 'inventory.real_time_change',
        event_category: 'inventory',
        data: inventoryData,
        importance_score: 8,
        requires_action: inventoryData.TotalQuantity <= 5
      })
  }

  private async handlePricingHealth(notification: SPAPINotification): Promise<void> {
    const pricingData = notification.payload
    
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: pricingData.SellerId,
        asin: pricingData.ASIN,
        event_type: 'pricing.health_alert',
        event_category: 'pricing',
        data: pricingData,
        importance_score: 7,
        requires_action: true
      })
  }
}

export const notificationHandler = new NotificationHandler()