import { spApiManager } from '../manager'
import { supabaseAdmin } from '../../database/connection'

export class PricingSyncService {
  async syncSellerPricing(sellerId: string): Promise<{
    productsProcessed: number
    buyBoxChanges: number
    priceAlerts: number
    errors: string[]
  }> {
    const services = spApiManager.getSellerServices(sellerId)
    if (!services) {
      throw new Error(`No SP-API services found for seller ${sellerId}`)
    }

    const errors: string[] = []
    let productsProcessed = 0
    let buyBoxChanges = 0
    let priceAlerts = 0

    try {
      // Get seller's active products
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, asin, marketplace_id, current_price, margin_floor')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .limit(20) // Process in batches to manage rate limits

      if (!products) return { productsProcessed: 0, buyBoxChanges: 0, priceAlerts: 0, errors: ['No products found'] }

      for (const product of products) {
        try {
          const pricingData = await services.pricing.analyzeBuyBoxPosition(
            product.asin,
            product.marketplace_id,
            product.current_price || 0
          )

          await this.processPricingData(sellerId, product, pricingData)
          productsProcessed++

          if (!pricingData.hasBuyBox && product.current_price) {
            buyBoxChanges++
          }

          if (pricingData.lowestCompetitorPrice && product.current_price && 
              product.current_price > pricingData.lowestCompetitorPrice * 1.2) {
            priceAlerts++
          }

        } catch (error) {
          errors.push(`Failed to sync pricing for ${product.asin}: ${error}`)
        }

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      }

    } catch (error) {
      errors.push(`Pricing sync failed: ${error}`)
    }

    return { productsProcessed, buyBoxChanges, priceAlerts, errors }
  }

  private async processPricingData(sellerId: string, product: any, pricingData: any): Promise<void> {
    // Update competitor data
    await supabaseAdmin
      .from('competitor_data')
      .upsert({
        product_id: product.id,
        competitor_asin: 'buy_box_winner',
        price: pricingData.buyBoxPrice,
        buy_box_winner: true,
        date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'product_id,competitor_asin,date' })

    // Create pricing event
    const eventType = pricingData.hasBuyBox ? 'pricing.buy_box_won' : 'pricing.buy_box_lost'
    
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: sellerId,
        asin: product.asin,
        event_type: eventType,
        event_category: 'pricing',
        data: {
          has_buy_box: pricingData.hasBuyBox,
          buy_box_price: pricingData.buyBoxPrice,
          current_price: product.current_price,
          competitor_count: pricingData.competitorCount,
          recommended_action: pricingData.recommendedAction
        },
        importance_score: pricingData.hasBuyBox ? 5 : 8,
        requires_action: !pricingData.hasBuyBox
      })
  }
}