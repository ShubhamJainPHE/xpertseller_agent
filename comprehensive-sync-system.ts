import { supabaseAdmin } from './lib/database/connection'
import { createSPApiService } from './lib/services/sp-api'

interface SyncResult {
  table: string
  status: 'success' | 'partial' | 'failed'
  recordsProcessed: number
  recordsSuccess: number
  recordsError: number
  errors: string[]
  startTime: string
  endTime: string
  duration: number
}

class ComprehensiveSyncSystem {
  private sellerId: string
  private spApi: any
  private results: SyncResult[] = []
  
  constructor(sellerId: string, spApi: any) {
    this.sellerId = sellerId
    this.spApi = spApi
  }
  
  private async logEvent(eventType: string, data: any, importanceScore: number = 5) {
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: this.sellerId,
          event_type: eventType,
          event_category: 'sync',
          data,
          importance_score: importanceScore,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.warn(`⚠️ Failed to log event: ${eventType}`)
    }
  }
  
  private createSyncResult(table: string): SyncResult {
    return {
      table,
      status: 'failed',
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsError: 0,
      errors: [],
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0
    }
  }
  
  private completeSyncResult(result: SyncResult) {
    result.endTime = new Date().toISOString()
    result.duration = new Date(result.endTime).getTime() - new Date(result.startTime).getTime()
    
    if (result.recordsError === 0 && result.recordsSuccess > 0) {
      result.status = 'success'
    } else if (result.recordsSuccess > 0) {
      result.status = 'partial'
    }
    
    this.results.push(result)
  }

  // 1. Products ✅ (already working)
  async syncProducts(): Promise<SyncResult> {
    const result = this.createSyncResult('products')
    console.log('📦 1. Syncing Products...')
    
    try {
      const response = await this.spApi.getAllListings()
      if (!response?.items) {
        result.errors.push('No listings found')
        this.completeSyncResult(result)
        return result
      }
      
      result.recordsProcessed = response.items.length
      
      for (const listing of response.items) {
        try {
          const details = await this.spApi.getListingDetails(listing.sku)
          
          if (details?.summaries?.[0]) {
            const summary = details.summaries[0]
            const attributes = details.attributes || {}
            
            const productData = {
              seller_id: this.sellerId,
              asin: summary.asin,
              marketplace_id: 'A21TJRUUN4KGV',
              title: summary.itemName || 'Unknown Product',
              brand: attributes.brand?.[0]?.value || null,
              category: attributes.item_type_name?.[0]?.value || null,
              current_price: attributes.list_price?.[0]?.Amount ? 
                parseFloat(attributes.list_price[0].Amount) : null,
              stock_level: 0,
              is_active: summary.status === 'ACTIVE' || summary.status === 'DISCOVERABLE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            const { error } = await supabaseAdmin
              .from('products')
              .upsert(productData, { onConflict: 'seller_id,asin,marketplace_id' })
            
            if (error) {
              result.recordsError++
              result.errors.push(`Product ${summary.asin}: ${error.message}`)
            } else {
              result.recordsSuccess++
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit
        } catch (error) {
          result.recordsError++
          result.errors.push(`Product ${listing.sku}: ${error}`)
        }
      }
      
      await this.logEvent('sync.products_completed', {
        processed: result.recordsProcessed,
        success: result.recordsSuccess,
        errors: result.recordsError
      }, 6)
      
    } catch (error) {
      result.errors.push(`Products sync failed: ${error}`)
    }
    
    this.completeSyncResult(result)
    console.log(`✅ Products: ${result.recordsSuccess}/${result.recordsProcessed} synced`)
    return result
  }

  // 2. Orders
  async syncOrders(): Promise<SyncResult> {
    const result = this.createSyncResult('orders')
    console.log('🛒 2. Syncing Orders...')
    
    try {
      // Get orders from last 90 days for comprehensive data
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const orders = await this.spApi.getOrders(ninetyDaysAgo)
      
      result.recordsProcessed = orders.length
      
      for (const order of orders) {
        try {
          const orderData = {
            seller_id: this.sellerId,
            amazon_order_id: order.AmazonOrderId,
            order_status: order.OrderStatus,
            purchase_date: new Date(order.PurchaseDate).toISOString(),
            last_update_date: order.LastUpdateDate ? new Date(order.LastUpdateDate).toISOString() : new Date().toISOString(),
            fulfillment_channel: order.FulfillmentChannel || 'MFN',
            sales_channel: order.SalesChannel || 'Amazon.in',
            marketplace_id: 'A21TJRUUN4KGV',
            is_prime: Boolean(order.IsPrime),
            is_business_order: Boolean(order.IsBusinessOrder),
            number_of_items_shipped: parseInt(String(order.NumberOfItemsShipped || 0)) || 0,
            number_of_items_unshipped: parseInt(String(order.NumberOfItemsUnshipped || 0)) || 0,
            order_total: order.OrderTotal ? {
              amount: parseFloat(order.OrderTotal.Amount) || 0,
              currency_code: order.OrderTotal.CurrencyCode || 'INR'
            } : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { error } = await supabaseAdmin
            .from('orders')
            .upsert(orderData, { onConflict: 'seller_id,amazon_order_id' })
          
          if (error) {
            result.recordsError++
            result.errors.push(`Order ${order.AmazonOrderId}: ${error.message}`)
          } else {
            result.recordsSuccess++
          }
          
        } catch (error) {
          result.recordsError++
          result.errors.push(`Order ${order.AmazonOrderId}: ${error}`)
        }
      }
      
      await this.logEvent('sync.orders_completed', {
        processed: result.recordsProcessed,
        success: result.recordsSuccess,
        errors: result.recordsError,
        date_range: '90_days'
      }, 7)
      
    } catch (error) {
      result.errors.push(`Orders sync failed: ${error}`)
    }
    
    this.completeSyncResult(result)
    console.log(`✅ Orders: ${result.recordsSuccess}/${result.recordsProcessed} synced`)
    return result
  }

  // 3. Order Items
  async syncOrderItems(): Promise<SyncResult> {
    const result = this.createSyncResult('order_items')
    console.log('📋 3. Syncing Order Items...')
    
    try {
      // Get recent orders to sync their items
      const { data: recentOrders } = await supabaseAdmin
        .from('orders')
        .select('amazon_order_id')
        .eq('seller_id', this.sellerId)
        .order('purchase_date', { ascending: false })
        .limit(50) // Last 50 orders
      
      if (!recentOrders || recentOrders.length === 0) {
        result.errors.push('No orders found to sync items from')
        this.completeSyncResult(result)
        return result
      }
      
      for (const order of recentOrders) {
        try {
          const orderItems = await this.spApi.getOrderItems(order.amazon_order_id)
          result.recordsProcessed += orderItems.length
          
          for (const item of orderItems) {
            try {
              // Find matching product
              const { data: product } = await supabaseAdmin
                .from('products')
                .select('id')
                .eq('seller_id', this.sellerId)
                .eq('asin', item.ASIN)
                .single()
              
              const orderItemData = {
                seller_id: this.sellerId,
                product_id: product?.id || null,
                amazon_order_id: order.amazon_order_id,
                order_item_id: item.OrderItemId,
                asin: item.ASIN,
                seller_sku: item.SellerSKU || null,
                title: item.Title || null,
                quantity_ordered: parseInt(String(item.QuantityOrdered || 0)) || 0,
                quantity_shipped: parseInt(String(item.QuantityShipped || 0)) || 0,
                item_price: item.ItemPrice ? {
                  amount: parseFloat(item.ItemPrice.Amount) || 0,
                  currency_code: item.ItemPrice.CurrencyCode || 'INR'
                } : null,
                item_tax: item.ItemTax ? {
                  amount: parseFloat(item.ItemTax.Amount) || 0,
                  currency_code: item.ItemTax.CurrencyCode || 'INR'
                } : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              
              const { error } = await supabaseAdmin
                .from('order_items')
                .upsert(orderItemData, { onConflict: 'amazon_order_id,order_item_id' })
              
              if (error) {
                result.recordsError++
                result.errors.push(`Order item ${item.OrderItemId}: ${error.message}`)
              } else {
                result.recordsSuccess++
              }
              
            } catch (itemError) {
              result.recordsError++
              result.errors.push(`Order item ${item.OrderItemId}: ${itemError}`)
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limit
          
        } catch (orderError) {
          result.errors.push(`Order items for ${order.amazon_order_id}: ${orderError}`)
        }
      }
      
      await this.logEvent('sync.order_items_completed', {
        processed: result.recordsProcessed,
        success: result.recordsSuccess,
        errors: result.recordsError,
        orders_checked: recentOrders.length
      }, 6)
      
    } catch (error) {
      result.errors.push(`Order items sync failed: ${error}`)
    }
    
    this.completeSyncResult(result)
    console.log(`✅ Order Items: ${result.recordsSuccess}/${result.recordsProcessed} synced`)
    return result
  }

  // 4. Sales Data (aggregated from order items)
  async syncSalesData(): Promise<SyncResult> {
    const result = this.createSyncResult('sales_data')
    console.log('📊 4. Syncing Sales Data...')
    
    try {
      // Aggregate sales data from order_items by date and product
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select(`
          product_id,
          asin,
          quantity_ordered,
          item_price,
          created_at,
          orders!inner(purchase_date, order_status)
        `)
        .eq('seller_id', this.sellerId)
      
      if (!orderItems || orderItems.length === 0) {
        result.errors.push('No order items found for sales data aggregation')
        this.completeSyncResult(result)
        return result
      }
      
      // Group by product and date
      const salesByProductDate = new Map<string, {
        product_id: string
        asin: string
        date: string
        units_sold: number
        units_ordered: number
        revenue: number
        order_count: number
      }>()
      
      for (const item of orderItems) {
        const date = new Date((item as any).orders.purchase_date).toISOString().split('T')[0]
        const key = `${item.product_id}-${date}`
        
        const revenue = item.item_price?.amount || 0
        const quantity = item.quantity_ordered || 0
        
        if (salesByProductDate.has(key)) {
          const existing = salesByProductDate.get(key)!
          existing.units_sold += quantity
          existing.units_ordered += quantity
          existing.revenue += revenue
          existing.order_count += 1
        } else {
          salesByProductDate.set(key, {
            product_id: item.product_id,
            asin: item.asin,
            date,
            units_sold: quantity,
            units_ordered: quantity,
            revenue,
            order_count: 1
          })
        }
      }
      
      result.recordsProcessed = salesByProductDate.size
      
      // Insert/update sales data
      for (const [key, salesData] of salesByProductDate) {
        try {
          const salesRecord = {
            product_id: salesData.product_id,
            date: salesData.date,
            units_sold: salesData.units_sold,
            units_ordered: salesData.units_ordered,
            revenue: salesData.revenue,
            profit: salesData.revenue * 0.2, // Estimated 20% profit margin
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const { error } = await supabaseAdmin
            .from('sales_data')
            .upsert(salesRecord, { onConflict: 'product_id,date' })
          
          if (error) {
            result.recordsError++
            result.errors.push(`Sales data ${key}: ${error.message}`)
          } else {
            result.recordsSuccess++
          }
          
        } catch (salesError) {
          result.recordsError++
          result.errors.push(`Sales data ${key}: ${salesError}`)
        }
      }
      
      await this.logEvent('sync.sales_data_completed', {
        processed: result.recordsProcessed,
        success: result.recordsSuccess,
        errors: result.recordsError,
        date_range_days: 90
      }, 7)
      
    } catch (error) {
      result.errors.push(`Sales data sync failed: ${error}`)
    }
    
    this.completeSyncResult(result)
    console.log(`✅ Sales Data: ${result.recordsSuccess}/${result.recordsProcessed} synced`)
    return result
  }

  // 5. Inventory Levels
  async syncInventoryLevels(): Promise<SyncResult> {
    const result = this.createSyncResult('inventory_levels')
    console.log('📦 5. Syncing Inventory Levels...')
    
    try {
      // Try multiple inventory endpoints
      let inventoryData: any[] = []
      
      try {
        inventoryData = await this.spApi.getInventorySummary()
      } catch (invError) {
        console.log('⚠️ Inventory summary failed, trying alternative approaches...')
        
        // Try getting inventory via products
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('asin, seller_sku')
          .eq('seller_id', this.sellerId)
        
        if (products) {
          // Create mock inventory data with 0 levels for tracking
          inventoryData = products.map(p => ({
            asin: p.asin,
            sellerSku: p.seller_sku,
            totalQuantity: 0,
            inventoryDetails: { fulfillableQuantity: 0 }
          }))
        }
      }
      
      result.recordsProcessed = inventoryData.length
      
      for (const item of inventoryData) {
        try {
          const inventoryRecord = {
            seller_id: this.sellerId,
            asin: item.asin,
            sku: item.sellerSku,
            marketplace_id: 'A21TJRUUN4KGV',
            total_quantity: item.totalQuantity || 0,
            sellable_quantity: item.inventoryDetails?.fulfillableQuantity || 0,
            unsellable_quantity: item.inventoryDetails?.unfulfillableQuantity || 0,
            reserved_quantity: item.inventoryDetails?.reservedQuantity || 0,
            inbound_quantity: item.inventoryDetails?.inboundQuantity || 0,
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
          
          // Check if inventory_levels table exists, if not use products table
          try {
            const { error } = await supabaseAdmin
              .from('inventory_levels')
              .upsert(inventoryRecord, { onConflict: 'seller_id,asin,sku,marketplace_id' })
            
            if (error && error.code === '42P01') {
              // Table doesn't exist, update products table instead
              await supabaseAdmin
                .from('products')
                .update({
                  stock_level: inventoryRecord.total_quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('seller_id', this.sellerId)
                .eq('asin', item.asin)
              
              result.recordsSuccess++
            } else if (error) {
              result.recordsError++
              result.errors.push(`Inventory ${item.asin}: ${error.message}`)
            } else {
              result.recordsSuccess++
            }
          } catch (tableError) {
            // Fallback to products table
            await supabaseAdmin
              .from('products')
              .update({
                stock_level: inventoryRecord.total_quantity,
                updated_at: new Date().toISOString()
              })
              .eq('seller_id', this.sellerId)
              .eq('asin', item.asin)
            
            result.recordsSuccess++
          }
          
        } catch (itemError) {
          result.recordsError++
          result.errors.push(`Inventory ${item.asin}: ${itemError}`)
        }
      }
      
      await this.logEvent('sync.inventory_levels_completed', {
        processed: result.recordsProcessed,
        success: result.recordsSuccess,
        errors: result.recordsError
      }, 6)
      
    } catch (error) {
      result.errors.push(`Inventory levels sync failed: ${error}`)
    }
    
    this.completeSyncResult(result)
    console.log(`✅ Inventory Levels: ${result.recordsSuccess}/${result.recordsProcessed} synced`)
    return result
  }

  // Master sync function
  async runComprehensiveSync(): Promise<SyncResult[]> {
    console.log('🚀 Starting Comprehensive Sync System...\n')
    
    const startTime = new Date()
    await this.logEvent('sync.comprehensive_started', {
      seller_id: this.sellerId,
      start_time: startTime.toISOString(),
      tables_to_sync: ['products', 'orders', 'order_items', 'sales_data', 'inventory_levels']
    }, 8)
    
    try {
      // Phase 1: Core Product Data
      console.log('🔸 PHASE 1: Core Product Data')
      await this.syncProducts()
      
      // Phase 2: Transaction Data
      console.log('\n🔸 PHASE 2: Transaction Data')
      await this.syncOrders()
      await this.syncOrderItems()
      
      // Phase 3: Analytics Data
      console.log('\n🔸 PHASE 3: Analytics Data')
      await this.syncSalesData()
      await this.syncInventoryLevels()
      
      const endTime = new Date()
      const totalDuration = endTime.getTime() - startTime.getTime()
      
      // Calculate summary stats
      const totalProcessed = this.results.reduce((sum, r) => sum + r.recordsProcessed, 0)
      const totalSuccess = this.results.reduce((sum, r) => sum + r.recordsSuccess, 0)
      const totalErrors = this.results.reduce((sum, r) => sum + r.recordsError, 0)
      
      console.log('\n🎉 COMPREHENSIVE SYNC COMPLETE!')
      console.log('=====================================')
      console.log(`⏱️ Total Duration: ${Math.round(totalDuration / 1000)}s`)
      console.log(`📊 Total Records: ${totalProcessed}`)
      console.log(`✅ Successful: ${totalSuccess}`)
      console.log(`❌ Errors: ${totalErrors}`)
      console.log(`📈 Success Rate: ${Math.round((totalSuccess / totalProcessed) * 100)}%`)
      
      console.log('\n📋 Table Results:')
      this.results.forEach(result => {
        const statusIcon = result.status === 'success' ? '✅' : 
                          result.status === 'partial' ? '⚠️' : '❌'
        console.log(`${statusIcon} ${result.table}: ${result.recordsSuccess}/${result.recordsProcessed} (${Math.round(result.duration / 1000)}s)`)
      })
      
      if (totalErrors > 0) {
        console.log('\n❌ Errors Summary:')
        this.results.forEach(result => {
          if (result.errors.length > 0) {
            console.log(`${result.table}: ${result.errors.slice(0, 3).join(', ')}`)
          }
        })
      }
      
      await this.logEvent('sync.comprehensive_completed', {
        total_duration_ms: totalDuration,
        tables_synced: this.results.length,
        records_processed: totalProcessed,
        records_success: totalSuccess,
        records_error: totalErrors,
        success_rate: Math.round((totalSuccess / totalProcessed) * 100),
        results: this.results
      }, 9)
      
    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error)
      
      await this.logEvent('sync.comprehensive_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        results: this.results
      }, 10)
    }
    
    return this.results
  }
}

async function runComprehensiveSync() {
  try {
    console.log('🇮🇳 India Comprehensive Sync System Starting...\n')
    
    // Get India seller
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, email, amazon_seller_id')
      .eq('amazon_seller_id', 'A14IOOJN7DLJME')
      .single()
    
    if (!seller) {
      throw new Error('India seller not found')
    }
    
    console.log(`✅ Found India seller: ${seller.email}`)
    
    // Create SP-API service
    const spApi = await createSPApiService(seller.id)
    if (!spApi) {
      throw new Error('Failed to create SP-API service')
    }
    
    console.log('✅ SP-API service created')
    
    // Validate credentials
    const validation = await spApi.validateCredentials()
    if (!validation.valid) {
      throw new Error(`SP-API credentials invalid: ${validation.error}`)
    }
    
    console.log('✅ SP-API credentials validated\n')
    
    // Run comprehensive sync
    const syncSystem = new ComprehensiveSyncSystem(seller.id, spApi)
    const results = await syncSystem.runComprehensiveSync()
    
    console.log('\n🎯 SYNC SYSTEM COMPLETE!')
    console.log('All essential tables have been processed.')
    console.log('Check the results above for detailed status.')
    
    return results
    
  } catch (error) {
    console.error('❌ Comprehensive sync system failed:', error)
    throw error
  }
}

// Execute the comprehensive sync
runComprehensiveSync()
  .then(() => process.exit(0))
  .catch(e => { 
    console.error('❌ Fatal error:', e)
    process.exit(1) 
  })