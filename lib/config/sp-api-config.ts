/**
 * FIXED: Centralized SP-API configuration management
 * Replaces hardcoded values throughout the codebase
 */

export interface SPAPIConfig {
  region: string
  baseUrl: string
  lwaUrl: string
  service: string
  maxRetries: number
  rateLimits: {
    defaultDelay: number
    batchSize: number
    concurrentLimit: number
  }
  memory: {
    batchSize: number
    cleanupInterval: number
    maxConcurrentOps: number
  }
}

export class SPAPIConfigService {
  private static readonly MARKETPLACE_REGIONS: Record<string, string> = {
    // North America
    'ATVPDKIKX0DER': 'us-east-1', // US
    'A2EUQ1WTGCTBG2': 'us-east-1', // Canada 
    'A1AM78C64UM0Y8': 'us-east-1', // Mexico
    // Europe
    'A1RKKUPIHCS9HS': 'eu-west-1', // Spain
    'A13V1IB3VIYZZH': 'eu-west-1', // France
    'A1F83G8C2ARO7P': 'eu-west-1', // UK
    'A1PA6795UKMFR9': 'eu-west-1', // Germany
    'APJ6JRA9NG5V4': 'eu-west-1',  // Italy
    'A1805IZSGTT6HS': 'eu-west-1', // Netherlands
    'ARBP9OOSHTCHU': 'eu-west-1',  // Egypt
    'A1C3SOZRARQ6R3': 'eu-west-1', // Poland
    'AMEN7PMS3EDWL': 'eu-west-1',  // Turkey
    // Other regions  
    'A2Q3Y263D00KWC': 'us-east-1', // Brazil
    'A21TJRUUN4KGV': 'eu-west-1',  // India (Europe region) - FIXED
    'A17E79C6D8DWNP': 'eu-west-1'  // Spain alternate
  }

  private static readonly REGION_BASE_URLS: Record<string, string> = {
    'us-east-1': 'https://sellingpartnerapi-na.amazon.com',  // North America
    'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',   // Europe
    'us-west-2': 'https://sellingpartnerapi-fe.amazon.com'   // Far East (India, Japan, Australia)
  }

  private static readonly DEFAULT_CONFIG: Omit<SPAPIConfig, 'region' | 'baseUrl'> = {
    lwaUrl: 'https://api.amazon.com/auth/o2/token',
    service: 'execute-api',
    maxRetries: 3,
    rateLimits: {
      defaultDelay: 1000, // 1 second between requests
      batchSize: 20,      // Items per batch for bulk operations
      concurrentLimit: 5  // Max concurrent operations
    },
    memory: {
      batchSize: 50,           // Items per memory batch
      cleanupInterval: 100,    // Operations between cleanup
      maxConcurrentOps: 5      // Max concurrent operations
    }
  }

  /**
   * Get configuration for a specific marketplace
   */
  static getConfigForMarketplace(marketplaceId: string): SPAPIConfig {
    const region = this.getRegionFromMarketplace(marketplaceId)
    const baseUrl = this.getBaseUrlFromRegion(region)

    return {
      ...this.DEFAULT_CONFIG,
      region,
      baseUrl,
      // Allow environment overrides
      lwaUrl: process.env.LWA_URL || this.DEFAULT_CONFIG.lwaUrl,
      maxRetries: parseInt(process.env.SP_API_MAX_RETRIES || '3'),
      rateLimits: {
        defaultDelay: parseInt(process.env.SP_API_DEFAULT_DELAY || '1000'),
        batchSize: parseInt(process.env.SP_API_BATCH_SIZE || '20'),
        concurrentLimit: parseInt(process.env.SP_API_CONCURRENT_LIMIT || '5')
      },
      memory: {
        batchSize: parseInt(process.env.MEMORY_BATCH_SIZE || '50'),
        cleanupInterval: parseInt(process.env.MEMORY_CLEANUP_INTERVAL || '100'),
        maxConcurrentOps: parseInt(process.env.MAX_CONCURRENT_OPS || '5')
      }
    }
  }

  /**
   * Get AWS region from marketplace ID
   */
  static getRegionFromMarketplace(marketplaceId: string): string {
    return this.MARKETPLACE_REGIONS[marketplaceId] || 'us-east-1'
  }

  /**
   * Get base URL from region
   */
  static getBaseUrlFromRegion(region: string): string {
    return this.REGION_BASE_URLS[region] || this.REGION_BASE_URLS['us-east-1']
  }

  /**
   * Get supported marketplaces
   */
  static getSupportedMarketplaces(): string[] {
    return Object.keys(this.MARKETPLACE_REGIONS)
  }

  /**
   * Validate marketplace ID
   */
  static isValidMarketplace(marketplaceId: string): boolean {
    return marketplaceId in this.MARKETPLACE_REGIONS
  }

  /**
   * Get environment-specific overrides
   */
  static getEnvironmentConfig(): Partial<SPAPIConfig> {
    return {
      lwaUrl: process.env.LWA_URL,
      maxRetries: process.env.SP_API_MAX_RETRIES ? parseInt(process.env.SP_API_MAX_RETRIES) : undefined,
      rateLimits: {
        defaultDelay: process.env.SP_API_DEFAULT_DELAY ? parseInt(process.env.SP_API_DEFAULT_DELAY) : 1000,
        batchSize: process.env.SP_API_BATCH_SIZE ? parseInt(process.env.SP_API_BATCH_SIZE) : 20,
        concurrentLimit: process.env.SP_API_CONCURRENT_LIMIT ? parseInt(process.env.SP_API_CONCURRENT_LIMIT) : 5
      },
      memory: {
        batchSize: process.env.MEMORY_BATCH_SIZE ? parseInt(process.env.MEMORY_BATCH_SIZE) : 50,
        cleanupInterval: process.env.MEMORY_CLEANUP_INTERVAL ? parseInt(process.env.MEMORY_CLEANUP_INTERVAL) : 100,
        maxConcurrentOps: process.env.MAX_CONCURRENT_OPS ? parseInt(process.env.MAX_CONCURRENT_OPS) : 5
      }
    }
  }

  /**
   * Log configuration for debugging
   */
  static logConfig(marketplaceId: string): void {
    const config = this.getConfigForMarketplace(marketplaceId)
    console.log('🔧 SP-API Configuration:', {
      marketplace: marketplaceId,
      region: config.region,
      baseUrl: config.baseUrl,
      rateLimits: config.rateLimits,
      memory: config.memory
    })
  }
}