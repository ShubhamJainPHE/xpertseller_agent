import { NextRequest, NextResponse } from 'next/server'
import { createSPApiService } from '@/lib/services/sp-api'
import { supabaseAdmin } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    
    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Starting Amazon data sync for seller: ${sellerId}`)

    // Create SP-API service
    const spApiService = await createSPApiService(sellerId)
    if (!spApiService) {
      return NextResponse.json(
        { error: 'Failed to create SP-API service - check credentials' },
        { status: 500 }
      )
    }

    // Test SP-API connection first
    const credentialsValid = await spApiService.validateCredentials()
    if (!credentialsValid.valid) {
      console.error('SP-API credentials invalid:', credentialsValid.error)
      return NextResponse.json(
        { error: `SP-API credentials invalid: ${credentialsValid.error}` },
        { status: 400 }
      )
    }

    console.log('✅ SP-API credentials validated successfully')

    const results = {
      sellerId,
      timestamp: new Date().toISOString(),
      credentialsValid: true,
      syncResults: {} as any
    }

    // 1. Sync Inventory Data
    try {
      console.log('📦 Fetching inventory data...')
      const inventory = await spApiService.getInventorySummary()
      
      if (inventory.length > 0) {
        // Store inventory data in database
        const inventoryInserts = inventory.map((item: any) => ({
          seller_id: sellerId,
          asin: item.asin,
          sku: item.sellerSku,
          fnsku: item.fnSku,
          condition: item.condition,
          inventory_details: item,
          total_quantity: item.totalQuantity || 0,
          sellable_quantity: item.sellableQuantity || 0,
          last_updated: new Date().toISOString()
        }))

        const { error: inventoryError } = await supabaseAdmin
          .from('inventory')
          .upsert(inventoryInserts, { 
            onConflict: 'seller_id,asin',
            ignoreDuplicates: false 
          })

        if (inventoryError) {
          console.error('Failed to store inventory data:', inventoryError)
        } else {
          console.log(`✅ Stored ${inventory.length} inventory items`)
        }
      }

      results.syncResults.inventory = {
        success: true,
        itemCount: inventory.length,
        message: `Synced ${inventory.length} inventory items`
      }
    } catch (error) {
      console.error('Inventory sync failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isPermissionError = errorMessage.includes('403') || errorMessage.includes('Forbidden')
      
      results.syncResults.inventory = {
        success: false,
        error: errorMessage,
        permissionIssue: isPermissionError,
        suggestion: isPermissionError ? 'This seller may not have FBA inventory access permissions. Check Amazon Seller Central permissions.' : 'Check SP-API configuration and network connectivity.'
      }
    }

    // 2. Sync Recent Orders
    try {
      console.log('📋 Fetching recent orders...')
      const orders = await spApiService.getOrders()
      
      if (orders.length > 0) {
        // Store orders data in database
        const orderInserts = orders.map((order: any) => ({
          seller_id: sellerId,
          amazon_order_id: order.AmazonOrderId,
          order_status: order.OrderStatus,
          purchase_date: order.PurchaseDate,
          order_total: order.OrderTotal?.Amount || 0,
          currency_code: order.OrderTotal?.CurrencyCode || 'USD',
          marketplace_id: order.MarketplaceId,
          order_details: order,
          last_updated: new Date().toISOString()
        }))

        const { error: ordersError } = await supabaseAdmin
          .from('orders')
          .upsert(orderInserts, { 
            onConflict: 'seller_id,amazon_order_id',
            ignoreDuplicates: false 
          })

        if (ordersError) {
          console.error('Failed to store orders data:', ordersError)
        } else {
          console.log(`✅ Stored ${orders.length} orders`)
        }
      }

      results.syncResults.orders = {
        success: true,
        itemCount: orders.length,
        message: `Synced ${orders.length} recent orders`
      }
    } catch (error) {
      console.error('Orders sync failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isPermissionError = errorMessage.includes('403') || errorMessage.includes('Forbidden')
      
      results.syncResults.orders = {
        success: false,
        error: errorMessage,
        permissionIssue: isPermissionError,
        suggestion: isPermissionError ? 'This seller may not have Orders API access permissions. Check Amazon Seller Central permissions or try using a different marketplace.' : 'Check SP-API configuration and network connectivity.'
      }
    }

    // 3. Update seller sync status
    try {
      const { error: updateError } = await supabaseAdmin
        .from('sellers')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: 'completed'
        })
        .eq('id', sellerId)

      if (updateError) {
        console.error('Failed to update seller sync status:', updateError)
      }
    } catch (error) {
      console.error('Failed to update sync status:', error)
    }

    console.log('🎉 Amazon data sync completed successfully')

    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ Amazon sync failed:', error)
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  return NextResponse.json({
    service: 'Amazon SP-API Sync',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}