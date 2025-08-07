import { createSPApiService } from '../services/sp-api'
import { supabaseAdmin } from '../database/connection'
import { Database } from '../database/types'
import { SPAPIValidator, SPAPIErrorHandler, DataSanitizer, ValidationResult } from '../utils/sp-api-validator'
import { 
  SPAPIResponse, 
  ListingItem, 
  InventorySummary, 
  Order, 
  OrderItem,
  SanitizedProductData,
  SyncResult,
  ComprehensiveSyncSummary,
  ErrorContext
} from '../types/sp-api-types'

type Product = Database['public']['Tables']['products']['Insert']
type FactStream = Database['public']['Tables']['fact_stream']['Insert']

export class DataIngestionService {
  // FIXED: Add memory management tracking
  private static readonly MAX_CONCURRENT_OPERATIONS = 5
  private static readonly MEMORY_CLEANUP_INTERVAL = 100 // Clean up every 100 operations
  private static operationCount = 0
  
  /**
   * Sync all data for a seller with expanded endpoints - FIXED MEMORY MANAGEMENT
   */
  static async syncSellerData(sellerId: string): Promise<void> {
    console.log(`🔄 Starting comprehensive data sync for seller: ${sellerId}`)
    
    const spApi = await createSPApiService(sellerId)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }

    try {
      // FIXED: Memory management - force garbage collection before heavy operations
      this.incrementOperationCount()
      this.checkMemoryUsage()
      
      if (this.operationCount % this.MEMORY_CLEANUP_INTERVAL === 0) {
        console.log('🗑️ Triggering periodic memory cleanup...')
        await this.clearIntermediateMemory()
      }
      
      // Phase 1: Core product and listing data (sequential for dependencies)
      console.log('🔸 Phase 1: Product catalog and listings')
      await this.syncAllListings(sellerId, spApi)
      
      // FIXED: Clear intermediate memory between phases
      await this.clearIntermediateMemory()
      
      await this.syncProductCatalog(sellerId, spApi)
      
      // Phase 2: Inventory and fulfillment data (parallel with proper error handling)
      console.log('🔸 Phase 2: Inventory and fulfillment')
      const phase2Results = await Promise.allSettled([
        this.syncInventoryDetails(sellerId, spApi),
        this.syncInboundShipments(sellerId, spApi),
        this.syncStrandedInventory(sellerId, spApi)
      ])
      
      // Log any phase 2 failures but don't stop execution
      phase2Results.forEach((result, index) => {
        const operations = ['syncInventoryDetails', 'syncInboundShipments', 'syncStrandedInventory']
        if (result.status === 'rejected') {
          console.error(`❌ Phase 2 operation ${operations[index]} failed:`, result.reason)
        }
      })
      
      // Phase 3: Sales and financial data (parallel with proper error handling)
      console.log('🔸 Phase 3: Sales and financial data')
      const phase3Results = await Promise.allSettled([
        this.syncDetailedOrders(sellerId, spApi),
        this.syncBusinessReports(sellerId, spApi),
        this.syncFinancialEvents(sellerId, spApi)
      ])
      
      // Log any phase 3 failures but don't stop execution
      phase3Results.forEach((result, index) => {
        const operations = ['syncDetailedOrders', 'syncBusinessReports', 'syncFinancialEvents']
        if (result.status === 'rejected') {
          console.error(`❌ Phase 3 operation ${operations[index]} failed:`, result.reason)
        }
      })
      
      // Phase 4: Additional data (parallel with proper error handling)
      console.log('🔸 Phase 4: Additional seller data')
      const phase4Results = await Promise.allSettled([
        this.syncPricingData(sellerId, spApi),
        this.syncAccountHealth(sellerId, spApi),
        this.syncSellerFeedback(sellerId, spApi)
      ])
      
      // Log any phase 4 failures but don't stop execution
      phase4Results.forEach((result, index) => {
        const operations = ['syncPricingData', 'syncAccountHealth', 'syncSellerFeedback']
        if (result.status === 'rejected') {
          console.error(`❌ Phase 4 operation ${operations[index]} failed:`, result.reason)
        }
      })

      console.log(`✅ Comprehensive data sync completed for seller: ${sellerId}`)
    } catch (error) {
      console.error(`❌ Data sync failed for seller ${sellerId}:`, error)
      throw error
    }
  }

  /**
   * Sync ALL seller listings (FBM + FBA) - EXPANDED VERSION with validation
   */
  private static async syncAllListings(sellerId: string, spApi: any): Promise<void> {
    console.log('📋 Syncing all seller listings (FBM + FBA)...')
    
    try {
      let nextToken: string | undefined = undefined
      let totalListings = 0
      let errorCount = 0
      
      do {
        const response = await this.executeWithRetry(
          () => spApi.getAllListings(nextToken),
          { sellerId, operation: 'getAllListings' }
        )
        
        // FIXED: Proper null check and error handling
        if (!response) {
          console.warn('⚠️ No response received from getAllListings - API may have failed')
          break
        }
        
        if (!response || typeof response !== 'object' || !(response as any).items || !Array.isArray((response as any).items)) {
          console.warn('⚠️ Invalid response structure from getAllListings:', response)
          break
        }
        
        const listings = (response as any).items
        
        // FIXED: Process listings in smaller batches to prevent memory accumulation
        const batchSize = 50
        const listingBatches = this.chunkArray(listings, batchSize)
        
        for (const [batchIndex, batch] of listingBatches.entries()) {
          console.log(`📊 Processing listing batch ${batchIndex + 1}/${listingBatches.length} (${batch.length} items)`)
          
          for (const listing of batch) {
            try {
            const listingData = listing as any
            
            // Validate basic listing data
            const asinValidation = SPAPIValidator.validateASIN(listingData.asin)
            if (!asinValidation.isValid) {
              console.warn(`⚠️ Invalid ASIN for listing ${listingData.sku}: ${asinValidation.errors.join(', ')}`)
              continue
            }
            
            // Validate marketplace
            const marketplaceValidation = SPAPIValidator.validateMarketplaceId(listingData.marketplaceId || spApi.credentials?.marketplaceId || 'ATVPDKIKX0DER')
            if (!marketplaceValidation.isValid) {
              console.warn(`⚠️ Invalid marketplace for listing ${listingData.sku}: ${marketplaceValidation.errors.join(', ')}`)
            }
            
            // FIXED: Validate listing data before processing
            if (!listingData || !listingData.sku || typeof listingData.sku !== 'string') {
              console.warn(`⚠️ Invalid listing data - missing or invalid SKU:`, listingData)
              continue
            }
            
            // Get detailed listing information with retry and proper error handling
            let listingDetails = null
            try {
              listingDetails = await this.executeWithRetry(
                () => spApi.getListingDetails(listingData.sku),
                { sellerId, operation: 'getListingDetails', asin: listingData.asin }
              )
            } catch (detailsError) {
              console.warn(`⚠️ Failed to get listing details for SKU ${listingData.sku}, continuing with basic data`)
              // Continue processing with null listingDetails
            }
            
            // FIXED: Safe property access with null checks
            const rawProduct = {
              seller_id: sellerId,
              asin: listingData.asin || 'UNKNOWN',
              marketplace_id: listingData.marketplaceId || spApi.credentials?.marketplaceId || 'ATVPDKIKX0DER',
              title: listingData.productName || 
                     (listingDetails as any)?.summaries?.[0]?.itemName || 
                     (listingDetails as any)?.attributes?.item_name?.[0]?.value || 
                     'Unknown Product',
              brand: (listingDetails as any)?.attributes?.brand?.[0]?.value || 
                     (listingDetails as any)?.attributes?.brand || null,
              category: (listingDetails as any)?.productTypes?.[0] || 
                       (listingDetails as any)?.productTypes?.[0]?.displayName || null,
              current_price: this.safeParseNumber((listingDetails as any)?.attributes?.list_price?.[0]?.Amount),
              list_price: this.safeParseNumber((listingDetails as any)?.attributes?.list_price?.[0]?.Amount),
              stock_level: 0, // Will be updated by inventory sync
              is_fba: listingData.fulfillmentChannel === 'AMAZON' || listingData.fulfillmentChannel === 'AFN',
              is_active: listingData.status === 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            // Sanitize product data
            const product = DataSanitizer.sanitizeProductData(rawProduct) as Product
            
            // Skip if ASIN sanitization failed
            if (!product.asin) {
              console.warn(`⚠️ Skipping listing with invalid ASIN: ${listingData.sku}`)
              continue
            }

            // Upsert product with error handling
            const { error: upsertError } = await supabaseAdmin
              .from('products')
              .upsert(product, {
                onConflict: 'seller_id,asin,marketplace_id'
              })
              
            if (upsertError) {
              console.error(`❌ Failed to upsert product ${product.asin}:`, upsertError)
              errorCount++
              continue
            }

            // Create fact stream event
            await this.createFactStreamEvent(sellerId, {
              asin: listingData.asin,
              event_type: 'listing.synced',
              event_category: 'inventory',
              data: { 
                listing: {
                  sku: listingData.sku,
                  asin: listingData.asin,
                  status: listingData.status,
                  fulfillmentChannel: listingData.fulfillmentChannel
                },
                validation: {
                  asin_valid: asinValidation.isValid,
                  marketplace_valid: marketplaceValidation.isValid,
                  warnings: [...asinValidation.warnings, ...marketplaceValidation.warnings]
                }
              }
            })
            
              totalListings++
            } catch (itemError) {
              errorCount++
              SPAPIErrorHandler.logError(itemError, {
                sellerId,
                operation: 'syncListing',
                asin: (listing as any).asin
              })
            }
          }
          
          // FIXED: Clear memory after each batch and add breathing room
          if (batchIndex < listingBatches.length - 1) {
            await this.clearBatchMemory()
            await new Promise(resolve => setTimeout(resolve, 500)) // 0.5s between batches
          }
        }
        
        nextToken = (response as any).pagination?.nextToken
        
        // Rate limiting between pages
        if (nextToken) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } while (nextToken)
      
      console.log(`✅ Synced ${totalListings} total listings (${errorCount} errors)`)
      
      // Log summary event
      await this.createFactStreamEvent(sellerId, {
        event_type: 'sync.listings_completed',
        event_category: 'inventory',
        data: {
          total_synced: totalListings,
          error_count: errorCount,
          success_rate: totalListings / (totalListings + errorCount)
        }
      })
      
    } catch (error) {
      SPAPIErrorHandler.logError(error, {
        sellerId,
        operation: 'syncAllListings'
      })
      throw error
    }
  }
  
  /**
   * Sync detailed product catalog information
   */
  private static async syncProductCatalog(sellerId: string, spApi: any): Promise<void> {
    console.log('🛍️ Syncing product catalog details...')
    
    try {
      // Get all products for this seller
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, asin')
        .eq('seller_id', sellerId)
        .not('asin', 'eq', 'UNKNOWN')
      
      if (!products) return
      
      for (const product of products) {
        try {
          const catalogItem = await spApi.getCatalogItem(product.asin)
          if (!catalogItem) continue
          
          // Update product with detailed catalog data
          const updates = {
            title: catalogItem.attributes?.item_name?.[0]?.value || undefined,
            brand: catalogItem.attributes?.brand?.[0]?.value || undefined,
            category: catalogItem.productTypes?.[0]?.displayName || undefined,
            product_group: catalogItem.attributes?.item_type_name?.[0]?.value || undefined,
            product_dimensions: catalogItem.dimensions || {},
            weight: catalogItem.attributes?.item_weight?.[0]?.value || undefined,
            updated_at: new Date().toISOString()
          }
          
          // Remove undefined values
          const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
          )
          
          if (Object.keys(cleanUpdates).length > 1) { // More than just updated_at
            await supabaseAdmin
              .from('products')
              .update(cleanUpdates)
              .eq('id', product.id)
          }
          
        } catch (itemError) {
          console.error(`Failed to sync catalog for ASIN ${product.asin}:`, itemError)
        }
        
        // Rate limiting - small delay between catalog requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log(`✅ Updated catalog details for ${products.length} products`)
    } catch (error) {
      console.error('Failed to sync product catalog:', error)
    }
  }

  /**
   * Sync detailed orders with expanded order items
   */
  private static async syncDetailedOrders(sellerId: string, spApi: any): Promise<void> {
    console.log('🛒 Syncing detailed orders and items...')
    
    try {
      // Get orders from last 30 days instead of 7
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const orders = await spApi.getOrders(thirtyDaysAgo)
      
      // Group orders by date and ASIN for fact_stream events
      const salesMap = new Map<string, {
        productId: string
        asin: string
        date: string
        units: number
        revenue: number
        profit: number
        orderCount: number
      }>()

      for (const order of orders) {
        try {
          const orderDate = new Date(order.PurchaseDate).toISOString().split('T')[0]
          
          // Get detailed order items using new endpoint
          const orderItems = await spApi.getOrderItems(order.AmazonOrderId)
          
          for (const item of orderItems) {
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
            const itemTax = parseFloat(item.ItemTax?.Amount || '0')
            const shippingPrice = parseFloat(item.ShippingPrice?.Amount || '0')
            const totalItemRevenue = revenue + itemTax + shippingPrice
            const estimatedProfit = totalItemRevenue * 0.3 // Estimated 30% margin

            if (salesMap.has(key)) {
              const existing = salesMap.get(key)!
              existing.units += units
              existing.revenue += totalItemRevenue
              existing.profit += estimatedProfit
              existing.orderCount += 1
            } else {
              salesMap.set(key, {
                productId: product.id,
                asin: asin,
                date: orderDate,
                units,
                revenue: totalItemRevenue,
                profit: estimatedProfit,
                orderCount: 1
              })
            }
          }
        } catch (orderError) {
          console.error(`Failed to process order ${order.AmazonOrderId}:`, orderError)
        }
      }

      // Store sales data as fact_stream events
      for (const [key, salesData] of salesMap) {
        await this.createFactStreamEvent(sellerId, {
          asin: salesData.asin,
          event_type: 'sales.daily_summary',
          event_category: 'performance',
          importance_score: 6,
          data: {
            product_id: salesData.productId,
            date: salesData.date,
            units_sold: salesData.units,
            units_ordered: salesData.units,
            revenue: salesData.revenue,
            profit: salesData.profit,
            order_count: salesData.orderCount,
            avg_order_value: salesData.revenue / salesData.orderCount
          }
        })
      }

      console.log(`✅ Synced ${orders.length} orders with detailed items`)
    } catch (error) {
      console.error('Failed to sync detailed orders:', error)
    }
  }

  /**
   * Sync comprehensive inventory details
   */
  private static async syncInventoryDetails(sellerId: string, spApi: any): Promise<void> {
    console.log('📊 Syncing comprehensive inventory data...')
    
    try {
      // Basic inventory summary (existing)
      const inventory = await spApi.getInventorySummary()
      
      // Enhanced inventory health data
      const inventoryHealth = await spApi.getInventoryHealth()
      const inventoryAge = await spApi.getInventoryAge()
      
      // Process basic inventory
      for (const item of inventory) {
        const asin = item.asin
        if (!asin) continue

        // Find health data for this ASIN
        const healthData = inventoryHealth.InventoryHealthByAsin?.find(
          (health: any) => health.asin === asin
        )
        
        // Find age data for this ASIN  
        const ageData = inventoryAge.InventoryAgeByAsin?.find(
          (age: any) => age.asin === asin
        )

        // Update product inventory with enhanced data
        const updates = {
          stock_level: item.totalQuantity || 0,
          reserved_quantity: item.reservedQuantity || 0,
          inbound_quantity: item.inboundQuantity || 0,
          velocity_30d: healthData?.recommendedReplenishmentQty || null,
          updated_at: new Date().toISOString()
        }
        
        await supabaseAdmin
          .from('products')
          .update(updates)
          .eq('seller_id', sellerId)
          .eq('asin', asin)

        // Enhanced low stock alerts with more context
        const totalQuantity = item.totalQuantity || 0
        const daysOfInventoryRemaining = ageData?.totalQuantity && ageData?.averageDailySalesLast30Days 
          ? ageData.totalQuantity / ageData.averageDailySalesLast30Days 
          : null
          
        if (totalQuantity <= 10 || (daysOfInventoryRemaining && daysOfInventoryRemaining <= 14)) {
          await this.createFactStreamEvent(sellerId, {
            asin,
            event_type: 'inventory.low_stock_enhanced',
            event_category: 'inventory',
            importance_score: totalQuantity <= 5 ? 9 : 7,
            requires_action: true,
            data: {
              current_stock: totalQuantity,
              reserved: item.reservedQuantity,
              inbound: item.inboundQuantity,
              days_remaining: daysOfInventoryRemaining,
              recommended_replenishment: healthData?.recommendedReplenishmentQty,
              health_status: healthData?.currentInventoryLevel
            }
          })
        }
      }

      console.log(`✅ Synced enhanced inventory for ${inventory.length} products`)
    } catch (error) {
      console.error('Failed to sync inventory details:', error)
    }
  }

  /**
   * Sync comprehensive pricing data with FBA fees
   */
  private static async syncPricingData(sellerId: string, spApi: any): Promise<void> {
    console.log('💰 Syncing comprehensive pricing data...')
    
    try {
      // Get all seller's ASINs with current prices
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, asin, current_price')
        .eq('seller_id', sellerId)
        .not('asin', 'eq', 'UNKNOWN')

      if (!products) return

      const asins = products.map(p => p.asin)
      const chunks = this.chunkArray(asins, 20) // SP-API limit

      for (const chunk of chunks) {
        try {
          // Get pricing data with proper error handling
          const pricingResults = await Promise.allSettled([
            spApi.getMyPrices(chunk),
            spApi.getCompetitivePricing(chunk)
          ])
          
          const myPrices = pricingResults[0].status === 'fulfilled' ? pricingResults[0].value : []
          const competitivePrices = pricingResults[1].status === 'fulfilled' ? pricingResults[1].value : []
          
          if (pricingResults[0].status === 'rejected') {
            console.warn('Failed to get my prices:', pricingResults[0].reason)
          }
          if (pricingResults[1].status === 'rejected') {
            console.warn('Failed to get competitive prices:', pricingResults[1].reason)
          }
          
          // Get FBA fee estimates for products with prices
          const feeRequests = products
            .filter(p => chunk.includes(p.asin) && p.current_price)
            .map(p => ({ asin: p.asin, price: p.current_price }))
            
          const feeEstimates = feeRequests.length > 0 
            ? await spApi.getFeeEstimates(feeRequests)
            : []

          // Update product prices and fees
          for (const priceData of myPrices) {
            const asin = priceData.ASIN
            const price = priceData.Product?.Offers?.[0]?.ListingPrice?.Amount
            
            // Find corresponding fee estimate
            const feeData = feeEstimates.find(
              (fee: any) => fee.FeesEstimateIdentifier?.IdValue === asin
            )
            
            const updates: any = {
              updated_at: new Date().toISOString()
            }
            
            if (price) {
              updates.current_price = parseFloat(price)
              updates.list_price = parseFloat(price)
            }
            
            // Add FBA fee information if available
            if (feeData?.FeesEstimate?.TotalFeesEstimate) {
              const totalFees = parseFloat(feeData.FeesEstimate.TotalFeesEstimate.Amount || '0')
              // Store fee data in supplier_info JSON field for now
              updates.supplier_info = {
                fba_fees: {
                  total_fees: totalFees,
                  fee_breakdown: feeData.FeesEstimate.FeeDetailList || [],
                  last_updated: new Date().toISOString()
                }
              }
            }

            if (Object.keys(updates).length > 1) { // More than just updated_at
              try {
                const { error: pricingUpdateError } = await supabaseAdmin
                  .from('products')
                  .update(updates)
                  .eq('seller_id', sellerId)
                  .eq('asin', asin)
                  
                if (pricingUpdateError) {
                  console.error(`❌ Failed to update pricing for ASIN ${asin}:`, pricingUpdateError)
                }
              } catch (pricingError) {
                console.error(`❌ Pricing update transaction error for ASIN ${asin}:`, pricingError)
              }
            }
          }

          // Process competitive pricing
          for (const compData of competitivePrices) {
            const asin = compData.ASIN
            const offers = compData.Product?.CompetitivePricing?.CompetitivePrices || []

            // Find our price and competitor prices
            let ourPrice = null
            const competitorPrices = []
            
            for (const offer of offers) {
              const price = parseFloat(offer.Price?.ListingPrice?.Amount || '0')
              
              if (offer.CompetitivePriceId === 'OurPrice') {
                ourPrice = price
              } else if (price > 0) {
                competitorPrices.push({
                  price,
                  priceId: offer.CompetitivePriceId,
                  condition: offer.condition
                })
              }
            }
            
            // Create pricing intelligence event
            if (competitorPrices.length > 0) {
              const avgCompetitorPrice = competitorPrices.reduce((sum, comp) => sum + comp.price, 0) / competitorPrices.length
              const minCompetitorPrice = Math.min(...competitorPrices.map(comp => comp.price))
              
              await this.createFactStreamEvent(sellerId, {
                asin,
                event_type: 'pricing.competitive_analysis',
                event_category: 'competition',
                data: {
                  our_price: ourPrice,
                  competitor_count: competitorPrices.length,
                  avg_competitor_price: avgCompetitorPrice,
                  min_competitor_price: minCompetitorPrice,
                  competitive_position: ourPrice ? (ourPrice <= minCompetitorPrice ? 'competitive' : 'above_market') : 'unknown',
                  competitor_details: competitorPrices
                }
              })
            }
          }
        } catch (error) {
          console.error(`Failed to sync pricing for chunk:`, error)
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(`✅ Synced comprehensive pricing for ${asins.length} products`)
    } catch (error) {
      console.error('Failed to sync comprehensive pricing:', error)
    }
  }


  // ===== ERROR HANDLING AND RETRY UTILITIES =====
  
  /**
   * Execute SP-API operations with retry logic - FIXED ERROR HANDLING
   */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { sellerId: string; operation: string; asin?: string; endpoint?: string },
    maxRetries: number = 3
  ): Promise<T | null> {
    // FIXED: Input validation
    if (typeof operation !== 'function') {
      throw new Error('executeWithRetry: operation must be a function')
    }
    
    if (!context || !context.sellerId || !context.operation) {
      throw new Error('executeWithRetry: context with sellerId and operation is required')
    }
    
    if (typeof maxRetries !== 'number' || maxRetries < 1) {
      maxRetries = 3
    }
    
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        // FIXED: Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`✅ ${context.operation} succeeded on attempt ${attempt}`)
        }
        return result
      } catch (error) {
        lastError = error
        
        // FIXED: Better error strategy handling with fallbacks
        let shouldRetry = false
        let delayMs = 5000
        
        try {
          const strategy = SPAPIErrorHandler.getRetryStrategy(error)
          shouldRetry = strategy.shouldRetry
          delayMs = strategy.delayMs
        } catch (strategyError) {
          console.warn('Error in retry strategy calculation, using defaults:', strategyError)
          shouldRetry = attempt < maxRetries && !this.isNonRetryableError(error)
        }
        
        if (!shouldRetry || attempt === maxRetries) {
          SPAPIErrorHandler.logError(error, context)
          break
        }
        
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${context.operation}, retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    // FIXED: Always log final failure with more context
    if (lastError) {
      SPAPIErrorHandler.logError(lastError, { 
        ...context, 
        finalAttempt: true, 
        totalAttempts: maxRetries 
      } as any)
    }
    
    return null
  }
  
  /**
   * FIXED: Helper to identify non-retryable errors
   */
  private static isNonRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || ''
    const statusCode = error?.response?.status || error?.status
    
    // Don't retry on authentication, permission, or validation errors
    return statusCode === 401 || 
           statusCode === 403 || 
           statusCode === 400 ||
           errorMessage.includes('invalid') ||
           errorMessage.includes('malformed')
  }
  
  /**
   * Enhanced utility function to chunk arrays with rate limiting and validation
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    // FIXED: Input validation
    if (!array || !Array.isArray(array)) {
      console.warn('chunkArray: Invalid array parameter')
      return []
    }
    
    if (typeof chunkSize !== 'number' || chunkSize <= 0) {
      console.warn('chunkArray: Invalid chunk size, using default of 20')
      chunkSize = 20
    }
    
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
  
  /**
   * FIXED: Safe number parsing utility
   */
  private static safeParseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isNaN(num) ? null : num
  }
  
  /**
   * Utility function for safe JSON parsing with improved validation
   */
  private static safeJsonParse(jsonString: string, fallback: any = {}) {
    // FIXED: Input validation
    if (typeof jsonString !== 'string') {
      console.warn('safeJsonParse: Input is not a string, using fallback')
      return fallback
    }
    
    if (jsonString.trim() === '') {
      console.warn('safeJsonParse: Empty string provided, using fallback')
      return fallback
    }
    
    try {
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn(`safeJsonParse: Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}, using fallback`)
      return fallback
    }
  }
  
  /**
   * Validate and sanitize seller ID
   */
  private static validateSellerId(sellerId: string): boolean {
    return !!(sellerId && typeof sellerId === 'string' && sellerId.length > 0)
  }
  
  /**
   * Enhanced fact stream event creation with validation
   */
  private static async createFactStreamEvent(
    sellerId: string, 
    eventData: Partial<FactStream>
  ): Promise<void> {
    try {
      // Validate required fields
      if (!this.validateSellerId(sellerId)) {
        console.error('❌ Invalid seller ID for fact stream event')
        return
      }
      
      if (!eventData.event_type || !eventData.event_category) {
        console.error('❌ Missing required fields for fact stream event')
        return
      }
      
      // Sanitize ASIN if provided
      let sanitizedASIN = null
      if (eventData.asin) {
        const asinValidation = SPAPIValidator.validateASIN(eventData.asin)
        if (asinValidation.isValid) {
          sanitizedASIN = eventData.asin
        } else {
          console.warn(`⚠️ Invalid ASIN in fact stream event: ${eventData.asin}`)
        }
      }

      const event: FactStream = {
        seller_id: sellerId,
        asin: sanitizedASIN,
        marketplace_id: eventData.marketplace_id || null,
        event_type: eventData.event_type,
        event_category: eventData.event_category,
        timestamp: new Date().toISOString(),
        data: eventData.data || {},
        metadata: {
          ...(eventData.metadata as any || {}),
          sync_version: '2.0',
          created_by: 'comprehensive_data_ingestion'
        },
        importance_score: Math.max(1, Math.min(10, eventData.importance_score || 5)),
        requires_action: Boolean(eventData.requires_action),
        processing_status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      }

      try {
        const { error } = await supabaseAdmin
          .from('fact_stream')
          .insert(event)
          
        if (error) {
          console.error('❌ Failed to create fact stream event:', error)
          // Don't throw - this shouldn't stop the main sync process
        }
      } catch (factError) {
        console.error('❌ Fact stream transaction error:', factError)
        // Continue execution - fact stream events are not critical
      }
    } catch (error) {
      console.error('❌ Error creating fact stream event:', error)
    }
  }

  // ===== NEW COMPREHENSIVE SYNC METHODS =====
  
  /**
   * Sync inbound FBA shipments
   */
  private static async syncInboundShipments(sellerId: string, spApi: any): Promise<void> {
    console.log('🚚 Syncing inbound shipments...')
    
    try {
      let nextToken: string | undefined = undefined
      let totalShipments = 0
      
      do {
        const response = await spApi.getInboundShipments('DATE_RANGE', nextToken) as any
        const shipments = response.ShipmentData || []
        
        for (const shipment of shipments) {
          // Store shipment data in fact_stream for now (could create separate table later)
          await this.createFactStreamEvent(sellerId, {
            event_type: 'shipment.inbound',
            event_category: 'inventory',
            data: {
              shipment_id: shipment.ShipmentId,
              shipment_status: shipment.ShipmentStatus,
              shipment_name: shipment.ShipmentName,
              destination_fulfillment_center: shipment.DestinationFulfillmentCenterId,
              shipment_data: shipment
            }
          })
          
          // Get shipment items if shipment is active
          if (['WORKING', 'SHIPPED', 'RECEIVING'].includes(shipment.ShipmentStatus)) {
            try {
              const itemsResponse = await spApi.getShipmentItems(shipment.ShipmentId)
              const items = itemsResponse.ItemData || []
              
              // Update inbound_quantity for products
              for (const item of items) {
                if (item.SellerSKU) {
                  const quantityShipped = item.QuantityShipped || 0
                  
                  // Update product inbound quantity
                  await supabaseAdmin
                    .from('products')
                    .update({
                      inbound_quantity: quantityShipped,
                      updated_at: new Date().toISOString()
                    })
                    .eq('seller_id', sellerId)
                    .eq('asin', item.FulfillmentNetworkSKU || item.SellerSKU)
                }
              }
            } catch (itemsError) {
              console.error(`Failed to get items for shipment ${shipment.ShipmentId}:`, itemsError)
            }
          }
          
          totalShipments++
        }
        
        nextToken = response.NextToken
      } while (nextToken)
      
      console.log(`✅ Synced ${totalShipments} inbound shipments`)
    } catch (error) {
      console.error('Failed to sync inbound shipments:', error)
    }
  }
  
  /**
   * Sync stranded inventory
   */
  private static async syncStrandedInventory(sellerId: string, spApi: any): Promise<void> {
    console.log('⚠️ Syncing stranded inventory...')
    
    try {
      let nextToken: string | undefined = undefined
      let totalStrandedItems = 0
      
      do {
        const response = await spApi.getStrandedInventory(nextToken) as any
        const strandedItems = response.StrandedInventory || []
        
        for (const item of strandedItems) {
          // Create high-priority alert for stranded inventory
          await this.createFactStreamEvent(sellerId, {
            asin: item.asin,
            event_type: 'inventory.stranded',
            event_category: 'inventory',
            importance_score: 8,
            requires_action: true,
            data: {
              fnsku: item.fnSku,
              asin: item.asin,
              product_name: item.productName,
              stranded_quantity: item.strandedQuantity,
              stranded_reasons: item.reasons || [],
              recommendations: item.recommendations || []
            }
          })
          
          totalStrandedItems++
        }
        
        nextToken = response.NextToken
      } while (nextToken)
      
      console.log(`⚠️ Found ${totalStrandedItems} stranded inventory items`)
    } catch (error) {
      console.error('Failed to sync stranded inventory:', error)
    }
  }
  
  /**
   * Sync business reports
   */
  private static async syncBusinessReports(sellerId: string, spApi: any): Promise<void> {
    console.log('📈 Syncing business reports...')
    
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      
      // Request sales and traffic report
      const salesReportRequest = await spApi.createBusinessReport(
        'GET_SALES_AND_TRAFFIC_REPORT',
        startDate,
        endDate
      )
      
      if (salesReportRequest?.reportId) {
        // Store report request info
        await this.createFactStreamEvent(sellerId, {
          event_type: 'report.requested',
          event_category: 'performance',
          data: {
            report_id: salesReportRequest.reportId,
            report_type: 'GET_SALES_AND_TRAFFIC_REPORT',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'REQUESTED'
          }
        })
        
        // Note: In production, you'd have a separate job to check report status and download
        console.log(`📊 Requested sales report: ${salesReportRequest.reportId}`)
      }
      
      // Request inventory report
      const inventoryReportRequest = await spApi.createBusinessReport(
        'GET_FBA_INVENTORY_PLANNING_DATA',
        startDate,
        endDate
      )
      
      if (inventoryReportRequest?.reportId) {
        await this.createFactStreamEvent(sellerId, {
          event_type: 'report.requested',
          event_category: 'inventory',
          data: {
            report_id: inventoryReportRequest.reportId,
            report_type: 'GET_FBA_INVENTORY_PLANNING_DATA',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'REQUESTED'
          }
        })
        
        console.log(`📉 Requested inventory report: ${inventoryReportRequest.reportId}`)
      }
      
    } catch (error) {
      console.error('Failed to sync business reports:', error)
    }
  }
  
  /**
   * Sync financial events
   */
  private static async syncFinancialEvents(sellerId: string, spApi: any): Promise<void> {
    console.log('💰 Syncing financial events...')
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      // Get financial event groups (settlements)
      let nextToken: string | undefined = undefined
      let totalEvents = 0
      
      do {
        const eventGroups = await spApi.getFinancialEventGroups(100, nextToken) as any
        const groups = eventGroups.FinancialEventGroupList || []
        
        for (const group of groups) {
          // Get detailed financial events for each group
          const groupEvents = await spApi.getFinancialEventsByGroupId(group.FinancialEventGroupId) as any
          
          if (groupEvents.FinancialEvents) {
            // Store financial events in fact_stream
            await this.createFactStreamEvent(sellerId, {
              event_type: 'financial.settlement',
              event_category: 'performance',
              data: {
                event_group_id: group.FinancialEventGroupId,
                group_start_date: group.FinancialEventGroupStart,
                group_end_date: group.FinancialEventGroupEnd,
                processing_status: group.ProcessingStatus,
                original_total: group.OriginalTotal,
                converted_total: group.ConvertedTotal,
                events: groupEvents.FinancialEvents
              }
            })
            
            totalEvents++
          }
        }
        
        nextToken = eventGroups.NextToken
      } while (nextToken)
      
      console.log(`💳 Synced ${totalEvents} financial event groups`)
    } catch (error) {
      console.error('Failed to sync financial events:', error)
    }
  }
  
  /**
   * Sync account health data
   */
  private static async syncAccountHealth(sellerId: string, spApi: any): Promise<void> {
    console.log('🏥 Syncing account health...')
    
    try {
      const accountHealth = await spApi.getAccountHealth()
      
      if (accountHealth) {
        await this.createFactStreamEvent(sellerId, {
          event_type: 'account.health_update',
          event_category: 'performance',
          importance_score: 6,
          data: accountHealth
        })
        
        console.log(`🏥 Updated account health data`)
      }
    } catch (error) {
      console.error('Failed to sync account health:', error)
    }
  }
  
  /**
   * Sync seller feedback
   */
  private static async syncSellerFeedback(sellerId: string, spApi: any): Promise<void> {
    console.log('⭐ Syncing seller feedback...')
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const feedback = await spApi.getSellerFeedback(thirtyDaysAgo)
      
      if (feedback?.feedback?.length > 0) {
        await this.createFactStreamEvent(sellerId, {
          event_type: 'feedback.update',
          event_category: 'performance',
          data: {
            feedback_count: feedback.feedback.length,
            feedback_details: feedback.feedback
          }
        })
        
        console.log(`⭐ Synced ${feedback.feedback.length} feedback entries`)
      }
    } catch (error) {
      console.error('Failed to sync seller feedback:', error)
    }
  }

  /**
   * Start periodic sync for all active sellers
   */
  static async startPeriodicSync(): Promise<void> {
    console.log('🔄 Starting comprehensive periodic data sync...')
    
    // Get all active sellers
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('id, email')
      .eq('status', 'active')
      .eq('onboarding_completed', true)

    if (!sellers) return

    console.log(`📅 Syncing ${sellers.length} active sellers`)

    // FIXED: Process sellers in batches with concurrency control
    const batchSize = 3 // Process 3 sellers concurrently
    const batches = this.chunkArray(sellers, batchSize)
    
    for (const batch of batches) {
      // Process batch concurrently with Promise.allSettled for better error handling
      const batchResults = await Promise.allSettled(
        batch.map(async (seller) => {
          try {
            console.log(`🔄 Starting sync for seller: ${seller.email}`)
            await this.syncSellerData(seller.id)
            console.log(`✅ Completed sync for seller: ${seller.email}`)
            return { success: true, sellerId: seller.id, email: seller.email }
          } catch (error) {
            console.error(`❌ Failed to sync seller ${seller.email}:`, error)
            
            // Log sync failure event with proper error handling
            try {
              await this.createFactStreamEvent(seller.id, {
                event_type: 'sync.failed',
                event_category: 'performance',
                importance_score: 7,
                requires_action: true,
                data: {
                  error_message: error instanceof Error ? error.message : 'Unknown error',
                  sync_timestamp: new Date().toISOString()
                }
              })
            } catch (eventError) {
              console.error(`Failed to log sync failure event for ${seller.email}:`, eventError)
            }
            
            throw error // Re-throw to be caught by Promise.allSettled
          }
        })
      )
      
      // Log batch results
      const successCount = batchResults.filter(r => r.status === 'fulfilled').length
      const failureCount = batchResults.filter(r => r.status === 'rejected').length
      console.log(`📊 Batch completed: ${successCount} successful, ${failureCount} failed`)
      
      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        console.log('⏱️ Waiting 10 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }
    
    console.log('✅ Comprehensive periodic sync completed for all sellers')
  }
  
  // ===== MEMORY MANAGEMENT UTILITIES =====
  
  /**
   * FIXED: Increment operation count for memory tracking
   */
  private static incrementOperationCount(): void {
    this.operationCount++
  }
  
  /**
   * FIXED: Clear intermediate memory between major phases
   */
  private static async clearIntermediateMemory(): Promise<void> {
    // Clear any cached data structures
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc()
        console.log('🗑️ Cleared intermediate memory')
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error)
      }
    }
    
    // Add small delay to allow memory to clear
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  /**
   * FIXED: Clear memory after processing batches
   */
  private static async clearBatchMemory(): Promise<void> {
    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc && this.operationCount % 10 === 0) {
      try {
        global.gc()
      } catch (error) {
        // Silently fail if GC not available
      }
    }
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  /**
   * FIXED: Monitor memory usage and warn if excessive
   */
  private static checkMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        const memUsage = process.memoryUsage()
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
        
        console.log(`📈 Memory: ${heapUsedMB}MB used, ${heapTotalMB}MB total`)
        
        // Warn if memory usage is high
        if (heapUsedMB > 512) {
          console.warn(`⚠️ High memory usage detected: ${heapUsedMB}MB`)
          
          // Try to force garbage collection
          if (global.gc) {
            console.log('🗑️ Forcing garbage collection due to high memory usage')
            global.gc()
          }
        }
      } catch (error) {
        console.warn('Failed to check memory usage:', error)
      }
    }
  }
}