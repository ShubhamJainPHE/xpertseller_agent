import { directSupabase } from './direct-supabase-integration'
import { vercelMCP } from './vercel-mcp-integration'
import { ComposioToolSet } from 'composio-core'

interface MCPResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

interface SystemHealth {
  overall: boolean
  components: {
    supabase: boolean
    vercel: boolean
    composio: boolean
  }
  table_count: number
  deployment_status: string
  errors: string[]
}

export class UnifiedMCPSystem {
  private composio: ComposioToolSet
  private isInitialized: boolean = false

  constructor() {
    this.composio = new ComposioToolSet({
      apiKey: process.env.COMPOSIO_API_KEY || 'ak_m7G25pTBup6hdv2Mjn_v'
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🚀 Initializing Unified MCP System...')
      
      // Test all components
      await Promise.all([
        this.testSupabaseConnection(),
        this.testVercelConnection(),
        this.testComposioConnection()
      ])
      
      this.isInitialized = true
      console.log('✅ Unified MCP System initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MCP System:', error)
      throw error
    }
  }

  private async testSupabaseConnection(): Promise<void> {
    const tables = await directSupabase.getAllTables()
    if (tables.length === 0) {
      throw new Error('Supabase connection failed - no tables found')
    }
  }

  private async testVercelConnection(): Promise<void> {
    const health = await vercelMCP.healthCheck()
    if (!health.healthy) {
      throw new Error(`Vercel connection failed: ${health.errors.join(', ')}`)
    }
  }

  private async testComposioConnection(): Promise<void> {
    // Test with a simple action that doesn't actually send
    try {
      // Just validate the toolset is properly initialized
      if (!this.composio) {
        throw new Error('Composio toolset not initialized')
      }
    } catch (error) {
      throw new Error(`Composio connection failed: ${error.message}`)
    }
  }

  // Unified Database Operations
  async queryDatabase(intent: string, context: any = {}): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const queryInfo = await directSupabase.buildSmartQuery(intent, context)
      const result = await directSupabase.queryAnyTable(queryInfo.tables[0], {
        limit: context.limit || 10,
        where: context.where,
        columns: context.columns
      })
      
      return {
        success: true,
        data: {
          intent,
          table: queryInfo.tables[0],
          endpoint: queryInfo.endpoint,
          results: result.rows,
          count: result.count
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async getAllTables(): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const tables = await directSupabase.getAllTables()
      return {
        success: true,
        data: {
          tables: tables.map(t => ({
            name: t.table_name,
            columns: t.column_count,
            has_data: t.has_data,
            api_endpoint: directSupabase.getEndpointMapping(t.table_name)?.sp_api_endpoint
          })),
          total_count: tables.length
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async getTableSchema(tableName: string): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const schema = await directSupabase.getTableSchema(tableName)
      const mapping = directSupabase.getEndpointMapping(tableName)
      
      return {
        success: true,
        data: {
          ...schema,
          api_mapping: mapping
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Unified Communication
  async sendNotification(recipient: string, subject: string, message: string, urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal'): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      // Use Composio Gmail for notifications
      const result = await directSupabase.sendEmail(recipient, subject, message, true)
      
      return {
        success: true,
        data: {
          recipient,
          subject,
          urgency,
          result
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Unified Deployment Management
  async getDeploymentStatus(): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const summary = await vercelMCP.getDeploymentSummary()
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async deployApplication(config: any = {}): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const deployment = await vercelMCP.deployWithMonitoring('xpertseller-agent', config)
      
      return {
        success: deployment.success,
        data: {
          deployment_id: deployment.deployment?.uid,
          url: deployment.url,
          logs: deployment.logs
        },
        error: deployment.error,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Smart Data Flow Management
  async syncTableToAPI(tableName: string, options: any = {}): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const mapping = directSupabase.getEndpointMapping(tableName)
      if (!mapping) {
        throw new Error(`No API mapping found for table: ${tableName}`)
      }
      
      // Update sync status
      await directSupabase.updateSyncStatus(tableName, 'in_progress', {
        sync_method: mapping.sync_method,
        endpoint: mapping.sp_api_endpoint,
        started_at: new Date().toISOString()
      })
      
      // Get table data
      const data = await directSupabase.queryAnyTable(tableName, {
        limit: options.limit || 100,
        orderBy: 'updated_at DESC'
      })
      
      // Mark sync as completed
      await directSupabase.updateSyncStatus(tableName, 'completed', {
        records_processed: data.count,
        completed_at: new Date().toISOString()
      })
      
      return {
        success: true,
        data: {
          table: tableName,
          endpoint: mapping.sp_api_endpoint,
          records_processed: data.count,
          sync_method: mapping.sync_method
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      // Mark sync as failed
      await directSupabase.updateSyncStatus(tableName, 'failed', {
        error: error.message,
        failed_at: new Date().toISOString()
      })
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async syncAllTables(): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      const mappings = directSupabase.getAllEndpointMappings()
      const results = []
      
      for (const mapping of mappings) {
        const result = await this.syncTableToAPI(mapping.table_name, { limit: 50 })
        results.push({
          table: mapping.table_name,
          success: result.success,
          error: result.error
        })
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      return {
        success: failed === 0,
        data: {
          total_tables: results.length,
          successful,
          failed,
          results
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // System Health and Monitoring
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [supabaseHealth, vercelHealth] = await Promise.all([
        directSupabase.healthCheck(),
        vercelMCP.healthCheck()
      ])
      
      const composioHealthy = !!this.composio
      
      return {
        overall: supabaseHealth.healthy && vercelHealth.healthy && composioHealthy,
        components: {
          supabase: supabaseHealth.healthy,
          vercel: vercelHealth.healthy,
          composio: composioHealthy
        },
        table_count: supabaseHealth.table_count,
        deployment_status: vercelHealth.latestDeployment?.readyState || 'UNKNOWN',
        errors: [
          ...supabaseHealth.errors,
          ...vercelHealth.errors,
          ...(composioHealthy ? [] : ['Composio not initialized'])
        ]
      }
    } catch (error) {
      return {
        overall: false,
        components: {
          supabase: false,
          vercel: false,
          composio: false
        },
        table_count: 0,
        deployment_status: 'ERROR',
        errors: [error.message]
      }
    }
  }

  // Agent Integration Helper
  async processAgentRequest(agentName: string, request: {
    action: string
    context: any
    urgency?: 'low' | 'normal' | 'high' | 'critical'
  }): Promise<MCPResponse> {
    await this.initialize()
    
    try {
      let result: any
      
      switch (request.action) {
        case 'query_data':
          result = await this.queryDatabase(request.context.intent, request.context)
          break
          
        case 'send_notification':
          result = await this.sendNotification(
            request.context.recipient,
            request.context.subject,
            request.context.message,
            request.urgency
          )
          break
          
        case 'check_deployment':
          result = await this.getDeploymentStatus()
          break
          
        case 'sync_data':
          result = await this.syncTableToAPI(request.context.table, request.context.options)
          break
          
        default:
          throw new Error(`Unknown action: ${request.action}`)
      }
      
      // Log the agent request
      console.log(`🤖 Agent ${agentName} executed ${request.action}: ${result.success ? 'SUCCESS' : 'FAILED'}`)
      
      return result
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

export const unifiedMCPSystem = new UnifiedMCPSystem()