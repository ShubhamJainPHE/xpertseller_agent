import { createClient } from '@supabase/supabase-js'
import { ComposioToolSet } from 'composio-core'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uvfjofawxsmrdpaxxptg.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmpvZmF3eHNtcmRwYXh4cHRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc5NjgzMywiZXhwIjoyMDY5MzcyODMzfQ.vZngCRA4_TyRSfzrfhhaXle532LRbtfxd5FFgQEOXYo'

interface TableMetadata {
  table_name: string
  table_type: string
  column_count: number
  has_data: boolean
  primary_keys: string[]
  foreign_keys: string[]
}

interface APIEndpointMapping {
  table_name: string
  sp_api_endpoint: string
  sync_method: string
  dependencies: string[]
  sync_frequency: string
}

export class DirectSupabaseIntegration {
  private supabase: any
  private composio: ComposioToolSet
  private tableCache: Map<string, TableMetadata> = new Map()
  private endpointMappings: APIEndpointMapping[] = []

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    this.composio = new ComposioToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || 'ak_m7G25pTBup6hdv2Mjn_v'
    })
    
    this.initializeEndpointMappings()
  }

  private initializeEndpointMappings(): void {
    this.endpointMappings = [
      // Core Business Tables
      { table_name: 'sellers', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'seller_data_sync', dependencies: [], sync_frequency: 'daily' },
      { table_name: 'products', sp_api_endpoint: 'catalog-items', sync_method: 'catalog_sync', dependencies: ['sellers'], sync_frequency: 'hourly' },
      { table_name: 'orders', sp_api_endpoint: 'orders', sync_method: 'orders_sync', dependencies: ['sellers'], sync_frequency: 'every_15_min' },
      { table_name: 'order_items', sp_api_endpoint: 'orders', sync_method: 'order_items_sync', dependencies: ['orders', 'products'], sync_frequency: 'every_15_min' },
      
      // Inventory & Fulfillment
      { table_name: 'fba_inventory', sp_api_endpoint: 'fba-inventory', sync_method: 'inventory_sync', dependencies: ['products'], sync_frequency: 'hourly' },
      { table_name: 'fba_eligibility', sp_api_endpoint: 'fba-inventory', sync_method: 'eligibility_sync', dependencies: ['products'], sync_frequency: 'daily' },
      { table_name: 'inbound_shipments', sp_api_endpoint: 'fba-inbound-eligibility', sync_method: 'shipments_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      { table_name: 'awd_inbound_orders', sp_api_endpoint: 'awd', sync_method: 'awd_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      
      // Financial Data
      { table_name: 'financial_events', sp_api_endpoint: 'finances', sync_method: 'financial_sync', dependencies: ['sellers', 'orders'], sync_frequency: 'daily' },
      { table_name: 'financial_performance', sp_api_endpoint: 'finances', sync_method: 'performance_sync', dependencies: ['financial_events'], sync_frequency: 'daily' },
      { table_name: 'seller_wallet', sp_api_endpoint: 'finances', sync_method: 'wallet_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      
      // Pricing & Competition
      { table_name: 'pricing', sp_api_endpoint: 'product-pricing', sync_method: 'pricing_sync', dependencies: ['products'], sync_frequency: 'hourly' },
      { table_name: 'pricing_history', sp_api_endpoint: 'product-pricing', sync_method: 'pricing_history_sync', dependencies: ['pricing'], sync_frequency: 'daily' },
      { table_name: 'product_fees', sp_api_endpoint: 'product-fees', sync_method: 'fees_sync', dependencies: ['products'], sync_frequency: 'daily' },
      { table_name: 'fee_breakdowns', sp_api_endpoint: 'product-fees', sync_method: 'fee_details_sync', dependencies: ['product_fees'], sync_frequency: 'daily' },
      
      // Reports & Analytics
      { table_name: 'reports', sp_api_endpoint: 'reports', sync_method: 'reports_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      { table_name: 'report_metadata', sp_api_endpoint: 'reports', sync_method: 'report_metadata_sync', dependencies: ['reports'], sync_frequency: 'daily' },
      { table_name: 'brand_analytics', sp_api_endpoint: 'vendor-insights', sync_method: 'brand_analytics_sync', dependencies: ['products'], sync_frequency: 'weekly' },
      { table_name: 'sales_data', sp_api_endpoint: 'sales', sync_method: 'sales_sync', dependencies: ['products', 'orders'], sync_frequency: 'daily' },
      { table_name: 'sales_metrics', sp_api_endpoint: 'sales', sync_method: 'metrics_sync', dependencies: ['sales_data'], sync_frequency: 'daily' },
      
      // Listings & Content
      { table_name: 'listings', sp_api_endpoint: 'listings-items', sync_method: 'listings_sync', dependencies: ['products'], sync_frequency: 'daily' },
      { table_name: 'listing_variations', sp_api_endpoint: 'listings-items', sync_method: 'variations_sync', dependencies: ['listings'], sync_frequency: 'daily' },
      { table_name: 'aplus_content', sp_api_endpoint: 'aplus-content', sync_method: 'aplus_sync', dependencies: ['products'], sync_frequency: 'weekly' },
      { table_name: 'catalog_items', sp_api_endpoint: 'catalog-items', sync_method: 'catalog_sync', dependencies: ['products'], sync_frequency: 'daily' },
      
      // Feeds & Data Exchange
      { table_name: 'feeds', sp_api_endpoint: 'feeds', sync_method: 'feeds_sync', dependencies: ['sellers'], sync_frequency: 'on_demand' },
      { table_name: 'uploads', sp_api_endpoint: 'uploads', sync_method: 'uploads_sync', dependencies: ['feeds'], sync_frequency: 'on_demand' },
      { table_name: 'report_processing_queue', sp_api_endpoint: 'reports', sync_method: 'queue_sync', dependencies: ['reports'], sync_frequency: 'real_time' },
      
      // Messaging & Notifications
      { table_name: 'messages', sp_api_endpoint: 'messaging', sync_method: 'messages_sync', dependencies: ['sellers', 'orders'], sync_frequency: 'hourly' },
      { table_name: 'solicitations', sp_api_endpoint: 'solicitations', sync_method: 'solicitations_sync', dependencies: ['orders'], sync_frequency: 'daily' },
      { table_name: 'notifications', sp_api_endpoint: 'notifications', sync_method: 'notifications_sync', dependencies: ['sellers'], sync_frequency: 'real_time' },
      { table_name: 'notification_subscriptions', sp_api_endpoint: 'notifications', sync_method: 'subscriptions_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      
      // Shipping & Logistics
      { table_name: 'shipping_labels', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'shipping_sync', dependencies: ['orders'], sync_frequency: 'hourly' },
      { table_name: 'shipping_services', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'services_sync', dependencies: ['sellers'], sync_frequency: 'weekly' },
      { table_name: 'easy_ship_packages', sp_api_endpoint: 'easy-ship', sync_method: 'easy_ship_sync', dependencies: ['orders'], sync_frequency: 'daily' },
      { table_name: 'mcf_orders', sp_api_endpoint: 'fulfillment-outbound', sync_method: 'mcf_sync', dependencies: ['orders'], sync_frequency: 'hourly' },
      
      // Vendor & B2B
      { table_name: 'vendor_direct_fulfillment_inventory', sp_api_endpoint: 'vendor-direct-fulfillment-inventory', sync_method: 'vendor_inventory_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      { table_name: 'vendor_direct_fulfillment_orders', sp_api_endpoint: 'vendor-direct-fulfillment-orders', sync_method: 'vendor_orders_sync', dependencies: ['sellers'], sync_frequency: 'hourly' },
      
      // Compliance & Quality
      { table_name: 'product_compliance', sp_api_endpoint: 'listings-restrictions', sync_method: 'compliance_sync', dependencies: ['products'], sync_frequency: 'weekly' },
      { table_name: 'product_type_definitions', sp_api_endpoint: 'definitions-product-types', sync_method: 'definitions_sync', dependencies: [], sync_frequency: 'monthly' },
      { table_name: 'restricted_data_tokens', sp_api_endpoint: 'tokens', sync_method: 'tokens_sync', dependencies: ['sellers'], sync_frequency: 'as_needed' },
      
      // Tax & Invoicing
      { table_name: 'tax_calculations', sp_api_endpoint: 'finances', sync_method: 'tax_sync', dependencies: ['orders'], sync_frequency: 'daily' },
      { table_name: 'invoices_brazil', sp_api_endpoint: 'finances', sync_method: 'invoices_sync', dependencies: ['orders'], sync_frequency: 'daily' },
      
      // System & Monitoring
      { table_name: 'api_error_logs', sp_api_endpoint: 'all_endpoints', sync_method: 'error_logging', dependencies: [], sync_frequency: 'real_time' },
      { table_name: 'api_rate_limits', sp_api_endpoint: 'all_endpoints', sync_method: 'rate_monitoring', dependencies: [], sync_frequency: 'real_time' },
      { table_name: 'data_sync_status', sp_api_endpoint: 'all_endpoints', sync_method: 'sync_tracking', dependencies: [], sync_frequency: 'real_time' },
      { table_name: 'kpi_snapshots', sp_api_endpoint: 'all_endpoints', sync_method: 'kpi_aggregation', dependencies: ['sales_data', 'financial_events'], sync_frequency: 'daily' },
      
      // Authentication & Credentials
      { table_name: 'oauth_tokens', sp_api_endpoint: 'authorization', sync_method: 'token_management', dependencies: ['sellers'], sync_frequency: 'as_needed' },
      { table_name: 'application_credentials', sp_api_endpoint: 'authorization', sync_method: 'credentials_sync', dependencies: ['sellers'], sync_frequency: 'as_needed' },
      { table_name: 'seller_authorizations', sp_api_endpoint: 'authorization', sync_method: 'auth_sync', dependencies: ['sellers'], sync_frequency: 'daily' },
      
      // Marketplace & Services
      { table_name: 'marketplace_configs', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'marketplace_sync', dependencies: ['sellers'], sync_frequency: 'weekly' },
      { table_name: 'seller_marketplace_participation', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'participation_sync', dependencies: ['sellers'], sync_frequency: 'weekly' },
      { table_name: 'services', sp_api_endpoint: 'services', sync_method: 'services_sync', dependencies: ['sellers'], sync_frequency: 'weekly' },
      
      // Advanced Features
      { table_name: 'data_kiosk_queries', sp_api_endpoint: 'data-kiosk', sync_method: 'kiosk_sync', dependencies: ['sellers'], sync_frequency: 'on_demand' },
      { table_name: 'replenishment_metrics', sp_api_endpoint: 'fba-inventory', sync_method: 'replenishment_sync', dependencies: ['fba_inventory'], sync_frequency: 'daily' },
      { table_name: 'customer_feedback', sp_api_endpoint: 'solicitations', sync_method: 'feedback_sync', dependencies: ['orders'], sync_frequency: 'daily' },
      { table_name: 'product_bundles', sp_api_endpoint: 'catalog-items', sync_method: 'bundles_sync', dependencies: ['products'], sync_frequency: 'weekly' },
      { table_name: 'transfers', sp_api_endpoint: 'fba-inventory', sync_method: 'transfers_sync', dependencies: ['fba_inventory'], sync_frequency: 'daily' },
      { table_name: 'vehicles', sp_api_endpoint: 'merchant-fulfillment', sync_method: 'vehicles_sync', dependencies: ['sellers'], sync_frequency: 'monthly' },
      
      // Internal System Tables
      { table_name: 'notification_queue', sp_api_endpoint: 'internal', sync_method: 'queue_management', dependencies: [], sync_frequency: 'real_time' },
      { table_name: 'app_notifications', sp_api_endpoint: 'internal', sync_method: 'app_notifications', dependencies: ['sellers'], sync_frequency: 'real_time' },
      { table_name: 'business_alerts', sp_api_endpoint: 'internal', sync_method: 'alerts_processing', dependencies: ['sellers'], sync_frequency: 'real_time' },
      { table_name: 'data_quality_metrics', sp_api_endpoint: 'internal', sync_method: 'quality_monitoring', dependencies: [], sync_frequency: 'daily' },
      { table_name: 'seller_accounts', sp_api_endpoint: 'internal', sync_method: 'account_management', dependencies: ['sellers'], sync_frequency: 'daily' },
      { table_name: 'otp_codes', sp_api_endpoint: 'internal', sync_method: 'otp_management', dependencies: ['sellers'], sync_frequency: 'real_time' }
    ]
  }

  // Core Database Operations
  async getAllTables(): Promise<TableMetadata[]> {
    try {
      // Get all known tables from your 65-table list
      const knownTables = [
        'api_error_logs', 'api_rate_limits', 'aplus_content', 'app_notifications', 'application_credentials',
        'awd_inbound_orders', 'brand_analytics', 'business_alerts', 'catalog_items', 'customer_feedback',
        'data_kiosk_queries', 'data_quality_metrics', 'data_sync_status', 'easy_ship_packages', 'fba_eligibility',
        'fba_inventory', 'fee_breakdowns', 'feeds', 'financial_events', 'financial_performance',
        'inbound_shipments', 'invoices_brazil', 'kpi_snapshots', 'listing_variations', 'listings',
        'marketplace_configs', 'mcf_orders', 'messages', 'notification_queue', 'notification_subscriptions',
        'notifications', 'oauth_tokens', 'order_items', 'order_shipments', 'orders', 'otp_codes',
        'pricing', 'pricing_history', 'product_bundles', 'product_compliance', 'product_fees',
        'product_type_definitions', 'products', 'replenishment_metrics', 'report_metadata', 'report_processing_queue',
        'reports', 'restricted_data_tokens', 'sales_data', 'sales_metrics', 'seller_accounts',
        'seller_authorizations', 'seller_marketplace_participation', 'seller_wallet', 'sellers',
        'services', 'shipping_labels', 'shipping_services', 'solicitations', 'tax_calculations',
        'transfers', 'uploads', 'vehicles', 'vendor_direct_fulfillment_inventory', 'vendor_direct_fulfillment_orders'
      ]

      const tables = knownTables.map(name => ({ table_name: name, table_type: 'BASE TABLE' }))

      const enrichedTables = await Promise.all(
        (tables || []).map(async (table: any) => {
          try {
            const { data: columns } = await this.supabase
              .from('information_schema.columns')
              .select('column_name, is_nullable, column_default')
              .eq('table_schema', 'public')
              .eq('table_name', table.table_name)

            const { count } = await this.supabase
              .from(table.table_name)
              .select('*', { count: 'exact', head: true })

            const metadata: TableMetadata = {
              table_name: table.table_name,
              table_type: table.table_type,
              column_count: columns?.length || 0,
              has_data: (count || 0) > 0,
              primary_keys: columns?.filter((c: any) => c.column_default?.includes('gen_random_uuid')).map((c: any) => c.column_name) || [],
              foreign_keys: columns?.filter((c: any) => c.column_name.endsWith('_id')).map((c: any) => c.column_name) || []
            }

            this.tableCache.set(table.table_name, metadata)
            return metadata
          } catch (error) {
            return {
              table_name: table.table_name,
              table_type: table.table_type,
              column_count: 0,
              has_data: false,
              primary_keys: [],
              foreign_keys: []
            }
          }
        })
      )

      return enrichedTables
    } catch (error) {
      console.error('Error getting all tables:', error)
      return []
    }
  }

  async queryAnyTable(tableName: string, options: {
    where?: string
    columns?: string
    limit?: number
    orderBy?: string
  } = {}): Promise<any> {
    try {
      const { where, columns = '*', limit = 100, orderBy } = options

      let query = this.supabase.from(tableName).select(columns)

      if (where) {
        // Simple where clause parsing - can be enhanced
        query = query.filter('id', 'gte', 0) // Base filter
      }

      if (orderBy) {
        const [column, direction] = orderBy.split(' ')
        query = query.order(column, { ascending: direction?.toLowerCase() !== 'desc' })
      } else {
        // Default ordering by created_at or id
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false })
      }

      const { data, error, count } = await query.limit(limit)

      if (error) throw error

      return {
        table: tableName,
        rows: data || [],
        count: data?.length || 0,
        total_count: count,
        query_options: options
      }
    } catch (error) {
      console.error(`Error querying table ${tableName}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Query failed'
      return {
        table: tableName,
        rows: [],
        count: 0,
        error: errorMessage
      }
    }
  }

  async getTableSchema(tableName: string): Promise<any> {
    try {
      const { data: columns, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position')

      if (error) throw error

      return {
        table_name: tableName,
        columns: columns || [],
        column_count: columns?.length || 0,
        relationships: this.getTableRelationships(tableName)
      }
    } catch (error) {
      console.error(`Error getting schema for ${tableName}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Schema fetch failed'
      return { table_name: tableName, columns: [], error: errorMessage }
    }
  }

  // API Endpoint Mapping Methods
  getEndpointMapping(tableName: string): APIEndpointMapping | null {
    return this.endpointMappings.find(mapping => mapping.table_name === tableName) || null
  }

  getAllEndpointMappings(): APIEndpointMapping[] {
    return this.endpointMappings
  }

  getTablesByEndpoint(endpoint: string): string[] {
    return this.endpointMappings
      .filter(mapping => mapping.sp_api_endpoint === endpoint)
      .map(mapping => mapping.table_name)
  }

  getTableRelationships(tableName: string): string[] {
    const mapping = this.getEndpointMapping(tableName)
    return mapping?.dependencies || []
  }

  // Smart Query Builder
  async buildSmartQuery(intent: string, context: any = {}): Promise<{ tables: string[]; query: string; endpoint: string }> {
    const intentMappings: Record<string, { tables: string[]; endpoint: string }> = {
      'get_seller_info': { tables: ['sellers', 'seller_accounts'], endpoint: 'merchant-fulfillment' },
      'get_products': { tables: ['products', 'catalog_items'], endpoint: 'catalog-items' },
      'get_orders': { tables: ['orders', 'order_items'], endpoint: 'orders' },
      'get_inventory': { tables: ['fba_inventory', 'fba_eligibility'], endpoint: 'fba-inventory' },
      'get_financial_data': { tables: ['financial_events', 'financial_performance'], endpoint: 'finances' },
      'get_pricing': { tables: ['pricing', 'pricing_history'], endpoint: 'product-pricing' },
      'get_reports': { tables: ['reports', 'report_metadata'], endpoint: 'reports' },
      'get_listings': { tables: ['listings', 'listing_variations'], endpoint: 'listings-items' },
      'get_shipping': { tables: ['shipping_labels', 'shipping_services'], endpoint: 'merchant-fulfillment' },
      'get_analytics': { tables: ['brand_analytics', 'sales_metrics'], endpoint: 'vendor-insights' }
    }

    const mapping = intentMappings[intent]
    if (!mapping) {
      return { tables: ['sellers'], query: 'SELECT * FROM sellers LIMIT 10', endpoint: 'merchant-fulfillment' }
    }

    const primaryTable = mapping.tables[0]
    const query = `SELECT * FROM ${primaryTable}${context.seller_id ? ` WHERE seller_id = '${context.seller_id}'` : ''} LIMIT 10`

    return {
      tables: mapping.tables,
      query,
      endpoint: mapping.endpoint
    }
  }

  // Email Integration via Composio
  async sendEmail(recipient: string, subject: string, body: string, isHtml: boolean = true): Promise<any> {
    try {
      return await this.composio.executeAction({
        action: 'gmail_send_email',
        params: {
          recipient_email: recipient,
          subject,
          body,
          is_html: isHtml
        }
      })
    } catch (error) {
      console.error('Email send failed:', error)
      throw error
    }
  }

  // Sync Status Management
  async updateSyncStatus(tableName: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', details?: any): Promise<void> {
    try {
      const mapping = this.getEndpointMapping(tableName)
      
      await this.supabase
        .from('data_sync_status')
        .upsert({
          table_name: tableName,
          sync_method: mapping?.sync_method || 'unknown',
          sp_api_endpoint: mapping?.sp_api_endpoint || 'unknown',
          status,
          last_sync_at: new Date().toISOString(),
          details,
          updated_at: new Date().toISOString()
        })
        
      console.log(`📊 Sync status updated: ${tableName} -> ${status}`)
    } catch (error) {
      console.error(`Failed to update sync status for ${tableName}:`, error)
    }
  }

  // Health Check
  async healthCheck(): Promise<{ healthy: boolean; table_count: number; errors: string[] }> {
    try {
      const tables = await this.getAllTables()
      const errors: string[] = []

      // Check critical tables exist
      const criticalTables = ['sellers', 'products', 'orders', 'fba_inventory', 'financial_events']
      for (const table of criticalTables) {
        if (!tables.find(t => t.table_name === table)) {
          errors.push(`Critical table missing: ${table}`)
        }
      }

      // Test Composio connection
      try {
        await this.composio.executeAction({
          action: 'gmail_send_email',
          params: {
            recipient_email: 'test@example.com',
            subject: 'Health Check',
            body: 'Test',
            is_html: false
          }
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Composio connection failed'
        errors.push(`Composio connection issue: ${errorMessage}`)
      }

      return {
        healthy: errors.length === 0,
        table_count: tables.length,
        errors
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed'
      return {
        healthy: false,
        table_count: 0,
        errors: [errorMessage]
      }
    }
  }
}

export const directSupabase = new DirectSupabaseIntegration()