import { SPAPIClient, SPAPIResponse } from '../client'

export interface ItemOffers {
  ASIN: string
  MarketplaceID: string
  ItemCondition: ItemCondition
  Status: ItemOffersStatus
  Identifier: ItemIdentifier
  Summary: OffersSummary
  Offers: OfferDetail[]
}

export interface OfferDetail {
  SellerId?: string
  SubCondition: string
  SellerFeedbackRating?: SellerFeedbackRating
  ShippingTime: ShippingTimeType
  ListingPrice: MoneyType
  Shipping: MoneyType
  ShipsFrom?: ShipsFrom
  IsFulfilledByAmazon: boolean
  IsBuyBoxWinner?: boolean
  ConditionNotes?: string
  PrimeInformation?: PrimeInformation
  IsExpeditedShippingAvailable?: boolean
  IsFeaturedMerchant?: boolean
  ShipsDomestically?: boolean
}

export interface OffersSummary {
  LowestPrices: LowestPriceType[]
  BuyBoxPrices?: BuyBoxPriceType[]
  ListPrice?: MoneyType
  CompetitivePriceThreshold?: MoneyType
  SuggestedLowerPricePlusShipping?: MoneyType
  SalesRankings?: SalesRankType[]
  BuyBoxEligibleOffers?: OfferCountType[]
  OffersAvailableTime?: string
}

export interface LowestPriceType {
  Condition: string
  FulfillmentChannel: string
  LandedPrice: MoneyType
  ListingPrice: MoneyType
  Shipping: MoneyType
  Points?: Points
}

export interface BuyBoxPriceType {
  Condition: string
  LandedPrice: MoneyType
  ListingPrice: MoneyType
  Shipping: MoneyType
  Points?: Points
}

export interface MoneyType {
  CurrencyCode: string
  Amount: number
}

export interface Points {
  PointsNumber: number
  PointsMonetaryValue?: MoneyType
}

export interface SalesRankType {
  ProductCategoryId: string
  Rank: number
}

export interface OfferCountType {
  Condition: string
  FulfillmentChannel?: FulfillmentChannelType
  OfferCount: number
}

export type ItemCondition = 'New' | 'Used' | 'Collectible' | 'Refurbished' | 'Club'
export type ItemOffersStatus = 'Active' | 'Inactive'
export type FulfillmentChannelType = 'Amazon' | 'Merchant'
export type ShippingTimeType = {
  MinimumHours?: number
  MaximumHours?: number
  AvailableDate?: string
  AvailabilityType?: 'NOW' | 'FUTURE_WITHOUT_DATE' | 'FUTURE_WITH_DATE'
}

export interface ItemIdentifier {
  MarketplaceId: string
  ASIN?: string
  SellerSKU?: string
  ItemCondition: ItemCondition
}

export interface SellerFeedbackRating {
  SellerPositiveFeedbackRating?: number
  FeedbackCount: number
}

export interface ShipsFrom {
  Country?: string
  State?: string
}

export interface PrimeInformation {
  IsPrime: boolean
  IsNationalPrime?: boolean
}

export interface CompetitivePricing {
  ASIN: string
  MarketplaceID: string
  status: string
  CompetitivePrices: CompetitivePriceType[]
}

export interface CompetitivePriceType {
  CompetitivePriceId: string
  Price: PriceType
  condition?: string
  subcondition?: string
  belongsToRequester?: boolean
}

export interface PriceType {
  LandedPrice?: MoneyType
  ListingPrice: MoneyType
  Shipping?: MoneyType
}

export class PricingService {
  constructor(private client: SPAPIClient) {}

  async getItemOffers(asin: string, marketplaceId: string, itemCondition: ItemCondition = 'New'): Promise<SPAPIResponse<ItemOffers>> {
    return this.client.get(`/products/pricing/v0/items/${asin}/offers`, {
      MarketplaceId: marketplaceId,
      ItemCondition: itemCondition
    })
  }

  async getItemOffersBatch(params: {
    MarketplaceId: string
    ItemCondition?: ItemCondition
    ASINs?: string[]
    SKUs?: string[]
  }): Promise<SPAPIResponse<ItemOffers[]>> {
    const requestData: any = {
      MarketplaceId: params.MarketplaceId,
      ItemCondition: params.ItemCondition || 'New'
    }

    if (params.ASINs && params.ASINs.length > 0) {
      requestData.ASINs = params.ASINs
    }
    if (params.SKUs && params.SKUs.length > 0) {
      requestData.SKUs = params.SKUs
    }

    return this.client.post('/products/pricing/v0/items/offers', requestData)
  }

  async getCompetitivePricing(params: {
    MarketplaceId: string
    ASINs?: string[]
    SKUs?: string[]
  }): Promise<SPAPIResponse<CompetitivePricing[]>> {
    const queryParams: any = {
      MarketplaceId: params.MarketplaceId
    }

    if (params.ASINs && params.ASINs.length > 0) {
      queryParams.Asins = params.ASINs.join(',')
    }
    if (params.SKUs && params.SKUs.length > 0) {
      queryParams.Skus = params.SKUs.join(',')
    }

    return this.client.get('/products/pricing/v0/price', queryParams)
  }

  async getListingOffers(sellerSku: string, marketplaceId: string, itemCondition: ItemCondition = 'New'): Promise<SPAPIResponse<ItemOffers>> {
    return this.client.get(`/products/pricing/v0/listings/${sellerSku}/offers`, {
      MarketplaceId: marketplaceId,
      ItemCondition: itemCondition
    })
  }

  // Helper method to analyze Buy Box competitiveness
  async analyzeBuyBoxPosition(asin: string, marketplaceId: string, sellerPrice: number): Promise<{
    hasBuyBox: boolean
    buyBoxPrice?: number
    lowestCompetitorPrice?: number
    priceGap?: number
    recommendedAction: 'maintain' | 'lower_price' | 'increase_price' | 'monitor'
    competitorCount: number
    primeEligibleCount: number
  }> {
    const offers = await this.getItemOffers(asin, marketplaceId)
    
    if (!offers.payload) {
      return {
        hasBuyBox: false,
        recommendedAction: 'monitor',
        competitorCount: 0,
        primeEligibleCount: 0
      }
    }

    const buyBoxWinner = offers.payload.Offers.find(offer => offer.IsBuyBoxWinner)
    const competitorOffers = offers.payload.Offers.filter(offer => !offer.IsBuyBoxWinner)
    const primeOffers = offers.payload.Offers.filter(offer => offer.PrimeInformation?.IsPrime)
    
    const lowestCompetitorPrice = competitorOffers.length > 0 
      ? Math.min(...competitorOffers.map(offer => offer.ListingPrice.Amount))
      : undefined

    const buyBoxPrice = buyBoxWinner?.ListingPrice.Amount
    const hasBuyBox = buyBoxWinner !== undefined && buyBoxPrice === sellerPrice

    let recommendedAction: 'maintain' | 'lower_price' | 'increase_price' | 'monitor' = 'monitor'
    let priceGap: number | undefined

    if (buyBoxPrice && lowestCompetitorPrice) {
      priceGap = sellerPrice - buyBoxPrice
      
      if (hasBuyBox) {
        if (sellerPrice > lowestCompetitorPrice + 0.50) {
          recommendedAction = 'lower_price'
        } else {
          recommendedAction = 'maintain'
        }
      } else {
        if (sellerPrice > buyBoxPrice) {
          recommendedAction = 'lower_price'
        } else if (sellerPrice < buyBoxPrice - 1.00) {
          recommendedAction = 'increase_price'
        }
      }
    }

    return {
      hasBuyBox,
      buyBoxPrice,
      lowestCompetitorPrice,
      priceGap,
      recommendedAction,
      competitorCount: competitorOffers.length,
      primeEligibleCount: primeOffers.length
    }
  }

  // Monitor pricing across multiple ASINs
  async monitorPricing(asins: string[], marketplaceId: string): Promise<Array<{
    asin: string
    currentBuyBoxPrice?: number
    lowestPrice?: number
    offerCount: number
    primeOfferCount: number
    averageRating?: number
    salesRank?: number
    lastUpdated: string
  }>> {
    const results: any[] = []

    // Process in batches to respect rate limits
    for (let i = 0; i < asins.length; i += 5) {
      const batch = asins.slice(i, i + 5)
      
      const batchPromises = batch.map(async (asin) => {
        try {
          const offers = await this.getItemOffers(asin, marketplaceId)
          
          if (!offers.payload) {
            return {
              asin,
              offerCount: 0,
              primeOfferCount: 0,
              lastUpdated: new Date().toISOString()
            }
          }

          const buyBoxWinner = offers.payload.Offers.find(offer => offer.IsBuyBoxWinner)
          const primeOffers = offers.payload.Offers.filter(offer => offer.PrimeInformation?.IsPrime)
          const lowestPrice = Math.min(...offers.payload.Offers.map(offer => offer.ListingPrice.Amount))
          const salesRank = offers.payload.Summary.SalesRankings?.[0]?.Rank

          return {
            asin,
            currentBuyBoxPrice: buyBoxWinner?.ListingPrice.Amount,
            lowestPrice,
            offerCount: offers.payload.Offers.length,
            primeOfferCount: primeOffers.length,
            salesRank,
            lastUpdated: new Date().toISOString()
          }
        } catch (error) {
          console.error(`Error fetching pricing for ASIN ${asin}:`, error)
          return {
            asin,
            offerCount: 0,
            primeOfferCount: 0,
            lastUpdated: new Date().toISOString()
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add delay between batches to respect rate limits
      if (i + 5 < asins.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return results
  }

  // Calculate optimal pricing strategy
  async calculateOptimalPrice(asin: string, marketplaceId: string, currentPrice: number, marginFloor: number): Promise<{
    recommendedPrice: number
    priceChangePercentage: number
    expectedImpact: 'positive' | 'negative' | 'neutral'
    confidence: number
    reasoning: string[]
  }> {
    const analysis = await this.analyzeBuyBoxPosition(asin, marketplaceId, currentPrice)
    const reasoning: string[] = []
    let recommendedPrice = currentPrice
    let expectedImpact: 'positive' | 'negative' | 'neutral' = 'neutral'
    let confidence = 0.5

    if (analysis.hasBuyBox) {
      if (analysis.lowestCompetitorPrice && currentPrice > analysis.lowestCompetitorPrice + 0.25) {
        // Can potentially increase price slightly
        recommendedPrice = Math.min(currentPrice + 0.25, analysis.lowestCompetitorPrice + 0.20)
        expectedImpact = 'positive'
        confidence = 0.7
        reasoning.push('Currently have Buy Box with opportunity to increase margin')
      } else {
        // Maintain current price
        recommendedPrice = currentPrice
        reasoning.push('Maintaining Buy Box at optimal price point')
        confidence = 0.8
      }
    } else {
      if (analysis.buyBoxPrice && currentPrice > analysis.buyBoxPrice) {
        // Need to lower price to compete for Buy Box
        const targetPrice = Math.max(analysis.buyBoxPrice - 0.01, marginFloor)
        if (targetPrice > marginFloor) {
          recommendedPrice = targetPrice
          expectedImpact = 'positive'
          confidence = 0.85
          reasoning.push('Lowering price to compete for Buy Box while maintaining margin')
        } else {
          reasoning.push('Cannot compete for Buy Box without violating margin floor')
          confidence = 0.3
        }
      }
    }

    // Ensure we don't go below margin floor
    if (recommendedPrice < marginFloor) {
      recommendedPrice = marginFloor
      expectedImpact = 'negative'
      reasoning.push('Price constrained by margin floor')
    }

    const priceChangePercentage = ((recommendedPrice - currentPrice) / currentPrice) * 100

    return {
      recommendedPrice: Math.round(recommendedPrice * 100) / 100, // Round to 2 decimal places
      priceChangePercentage: Math.round(priceChangePercentage * 100) / 100,
      expectedImpact,
      confidence,
      reasoning
    }
  }
}