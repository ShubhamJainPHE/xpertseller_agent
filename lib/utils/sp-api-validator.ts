/**
 * SP-API Data Validation and Error Handling Utilities
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class SPAPIValidator {
  /**
   * Validate ASIN format - FIXED INPUT VALIDATION
   */
  static validateASIN(asin: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // FIXED: Better input validation
    if (!asin || typeof asin !== 'string') {
      errors.push('ASIN is required and must be a string')
    } else {
      const cleanASIN = asin.trim().toUpperCase()
      
      if (cleanASIN.length === 0) {
        errors.push('ASIN cannot be empty or whitespace only')
      } else if (cleanASIN === 'UNKNOWN' || cleanASIN === 'NULL' || cleanASIN === 'UNDEFINED') {
        errors.push('ASIN cannot be a placeholder value')
      } else if (!/^[A-Z0-9]{10}$/.test(cleanASIN)) {
        if (cleanASIN.length !== 10) {
          errors.push(`ASIN must be exactly 10 characters, got ${cleanASIN.length}: ${asin}`)
        } else {
          errors.push(`ASIN contains invalid characters (must be A-Z, 0-9 only): ${asin}`)
        }
      }
      
      // Additional warnings for suspicious ASINs
      if (cleanASIN.length === 10 && !/^[A-Z0-9]{10}$/.test(cleanASIN)) {
        warnings.push(`Suspicious ASIN format: ${asin}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate SKU format
   */
  static validateSKU(sku: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!sku) {
      errors.push('SKU is required')
    } else if (sku.length > 40) {
      errors.push('SKU too long (max 40 characters)')
    } else if (!/^[A-Za-z0-9\-_]+$/.test(sku)) {
      warnings.push('SKU contains special characters that may cause issues')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate product price - FIXED STRING PARSING AND EDGE CASES
   */
  static validatePrice(price: number | string | null): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (price === null || price === undefined) {
      warnings.push('Price is null or undefined')
    } else {
      let numPrice: number
      
      // FIXED: Better string price parsing
      if (typeof price === 'string') {
        const cleanPrice = price.trim().replace(/[$,\s]/g, '') // Remove currency symbols and commas
        
        if (cleanPrice === '' || cleanPrice === 'null' || cleanPrice === 'undefined') {
          warnings.push('Price string is empty or contains placeholder values')
          return { isValid: true, errors, warnings }
        }
        
        numPrice = parseFloat(cleanPrice)
      } else if (typeof price === 'number') {
        numPrice = price
      } else {
        errors.push(`Invalid price type: ${typeof price}, expected number or string`)
        return { isValid: false, errors, warnings }
      }
      
      // FIXED: Better validation logic
      if (isNaN(numPrice) || !isFinite(numPrice)) {
        errors.push(`Price is not a valid finite number: ${price}`)
      } else if (numPrice < 0) {
        errors.push(`Price cannot be negative: ${numPrice}`)
      } else if (numPrice === 0) {
        warnings.push('Price is zero (free product)')
      } else if (numPrice < 0.01) {
        warnings.push(`Price is very low (< $0.01): ${numPrice}`)
      } else if (numPrice > 999999) {
        warnings.push(`Price is unusually high (> $999,999): ${numPrice}`)
      } else if (numPrice > 100000) {
        warnings.push(`Price is very high (> $100,000): ${numPrice}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate inventory quantity
   */
  static validateQuantity(quantity: number | string | null): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (quantity === null || quantity === undefined) {
      warnings.push('Quantity is null or undefined')
    } else {
      const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity
      
      if (isNaN(numQuantity)) {
        errors.push('Quantity is not a valid number')
      } else if (numQuantity < 0) {
        errors.push('Quantity cannot be negative')
      } else if (numQuantity === 0) {
        warnings.push('Quantity is zero (out of stock)')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate marketplace ID
   */
  static validateMarketplaceId(marketplaceId: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const validMarketplaces = [
      'ATVPDKIKX0DER', // US
      'A2EUQ1WTGCTBG2', // Canada
      'A1AM78C64UM0Y8', // Mexico
      'A1RKKUPIHCS9HS', // Spain
      'A13V1IB3VIYZZH', // France
      'A1F83G8C2ARO7P', // UK
      'A1PA6795UKMFR9', // Germany
      'APJ6JRA9NG5V4',  // Italy
      'A1805IZSGTT6HS', // Netherlands
      'ARBP9OOSHTCHU',  // Egypt
      'A2Q3Y263D00KWC', // Brazil
      'A21TJRUUN4KGV',  // India
      'A17E79C6D8DWNP', // Spain
      'A1C3SOZRARQ6R3', // Poland
      'AMEN7PMS3EDWL'   // Turkey
    ]

    if (!marketplaceId) {
      errors.push('Marketplace ID is required')
    } else if (!validMarketplaces.includes(marketplaceId)) {
      warnings.push(`Unknown marketplace ID: ${marketplaceId}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate order data structure
   */
  static validateOrderData(order: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!order) {
      errors.push('Order data is required')
      return { isValid: false, errors, warnings }
    }

    // Required fields
    if (!order.AmazonOrderId) {
      errors.push('Amazon Order ID is required')
    }

    if (!order.PurchaseDate) {
      errors.push('Purchase Date is required')
    } else {
      const purchaseDate = new Date(order.PurchaseDate)
      if (isNaN(purchaseDate.getTime())) {
        errors.push('Invalid Purchase Date format')
      }
    }

    if (!order.MarketplaceId) {
      errors.push('Marketplace ID is required')
    }

    // Validate order total
    if (order.OrderTotal?.Amount) {
      const priceValidation = this.validatePrice(order.OrderTotal.Amount)
      errors.push(...priceValidation.errors)
      warnings.push(...priceValidation.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate financial event data
   */
  static validateFinancialEvent(event: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!event) {
      errors.push('Financial event data is required')
      return { isValid: false, errors, warnings }
    }

    // Check for required event types
    const hasValidEventType = event.ShipmentEvent || 
                             event.RefundEvent || 
                             event.GuaranteeClaimEvent || 
                             event.ChargebackEvent ||
                             event.PayWithAmazonEvent ||
                             event.ServiceProviderCreditEvent

    if (!hasValidEventType) {
      warnings.push('Unknown financial event type')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

/**
 * Error handling utilities for SP-API operations
 */
export class SPAPIErrorHandler {
  /**
   * Categorize SP-API errors
   */
  static categorizeError(error: any): {
    category: 'auth' | 'rate_limit' | 'permission' | 'data' | 'network' | 'unknown'
    severity: 'low' | 'medium' | 'high' | 'critical'
    retryable: boolean
    message: string
  } {
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const statusCode = error?.response?.status || error?.status

    // Authentication errors
    if (statusCode === 401 || errorMessage.includes('authentication')) {
      return {
        category: 'auth',
        severity: 'critical',
        retryable: true,
        message: 'Authentication failed - token may be expired'
      }
    }

    // Rate limiting
    if (statusCode === 429 || errorMessage.includes('rate limit')) {
      return {
        category: 'rate_limit',
        severity: 'medium',
        retryable: true,
        message: 'Rate limit exceeded - will retry with backoff'
      }
    }

    // Permission errors
    if (statusCode === 403 || errorMessage.includes('forbidden')) {
      return {
        category: 'permission',
        severity: 'high',
        retryable: false,
        message: 'Insufficient permissions for this operation'
      }
    }

    // Data validation errors
    if (statusCode === 400 || errorMessage.includes('validation')) {
      return {
        category: 'data',
        severity: 'medium',
        retryable: false,
        message: 'Data validation failed - check request format'
      }
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true,
        message: 'Network connectivity issue'
      }
    }

    // Server errors
    if (statusCode >= 500) {
      return {
        category: 'network',
        severity: 'high',
        retryable: true,
        message: 'Amazon server error - will retry'
      }
    }

    return {
      category: 'unknown',
      severity: 'medium',
      retryable: false,
      message: errorMessage
    }
  }

  /**
   * Determine retry strategy based on error
   */
  static getRetryStrategy(error: any): {
    shouldRetry: boolean
    delayMs: number
    maxRetries: number
  } {
    const { category, retryable } = this.categorizeError(error)

    if (!retryable) {
      return { shouldRetry: false, delayMs: 0, maxRetries: 0 }
    }

    switch (category) {
      case 'rate_limit':
        return { shouldRetry: true, delayMs: 60000, maxRetries: 5 } // 1 minute delay
        
      case 'auth':
        return { shouldRetry: true, delayMs: 5000, maxRetries: 2 } // Quick retry after token refresh
        
      case 'network':
        return { shouldRetry: true, delayMs: 10000, maxRetries: 3 } // 10 second delay
        
      default:
        return { shouldRetry: true, delayMs: 5000, maxRetries: 2 } // Default retry
    }
  }

  /**
   * Log error with context
   */
  static logError(error: any, context: {
    sellerId: string
    operation: string
    asin?: string
    endpoint?: string
  }): void {
    const { category, severity } = this.categorizeError(error)
    
    const logData = {
      timestamp: new Date().toISOString(),
      severity,
      category,
      context,
      error: {
        message: error?.message || 'Unknown error',
        status: error?.response?.status || error?.status,
        stack: error?.stack
      }
    }

    if (severity === 'critical' || severity === 'high') {
      console.error('🚨 SP-API Critical Error:', JSON.stringify(logData, null, 2))
    } else {
      console.warn('⚠️ SP-API Warning:', JSON.stringify(logData, null, 2))
    }
  }
}

/**
 * Data sanitization utilities
 */
export class DataSanitizer {
  /**
   * Sanitize string data
   */
  static sanitizeString(value: any): string | null {
    if (value === null || value === undefined) return null
    
    const str = String(value).trim()
    return str === '' ? null : str
  }

  /**
   * Sanitize numeric data
   */
  static sanitizeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null
    
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    return isNaN(num) ? null : num
  }

  /**
   * Sanitize integer data
   */
  static sanitizeInteger(value: any): number | null {
    if (value === null || value === undefined || value === '') return null
    
    const num = typeof value === 'string' ? parseInt(value) : Math.floor(Number(value))
    return isNaN(num) ? null : num
  }

  /**
   * Sanitize date data
   */
  static sanitizeDate(value: any): string | null {
    if (value === null || value === undefined || value === '') return null
    
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  /**
   * Sanitize ASIN - FIXED VALIDATION INTEGRATION
   */
  static sanitizeASIN(value: any): string | null {
    const sanitized = this.sanitizeString(value)
    if (!sanitized) return null
    
    const asin = sanitized.trim().toUpperCase()
    
    // FIXED: Use the improved validation
    const validation = SPAPIValidator.validateASIN(asin)
    if (!validation.isValid) {
      console.warn(`Invalid ASIN detected during sanitization: ${asin}, errors: ${validation.errors.join(', ')}`)
      return null
    }
    
    // Log warnings but still return the ASIN
    if (validation.warnings.length > 0) {
      console.warn(`ASIN warnings during sanitization: ${asin}, warnings: ${validation.warnings.join(', ')}`)
    }
    
    return asin
  }

  /**
   * Sanitize product data for database insertion - FIXED COMPREHENSIVE VALIDATION
   */
  static sanitizeProductData(rawProduct: any): any {
    if (!rawProduct || typeof rawProduct !== 'object') {
      throw new Error('sanitizeProductData: rawProduct must be a valid object')
    }
    
    // FIXED: Comprehensive sanitization with validation logging
    const sanitized = {
      seller_id: this.sanitizeString(rawProduct.seller_id),
      asin: this.sanitizeASIN(rawProduct.asin),
      marketplace_id: this.sanitizeString(rawProduct.marketplace_id) || 'ATVPDKIKX0DER',
      title: this.sanitizeString(rawProduct.title) || 'Unknown Product',
      brand: this.sanitizeString(rawProduct.brand),
      category: this.sanitizeString(rawProduct.category),
      subcategory: this.sanitizeString(rawProduct.subcategory),
      product_group: this.sanitizeString(rawProduct.product_group),
      current_price: this.sanitizeNumber(rawProduct.current_price),
      list_price: this.sanitizeNumber(rawProduct.list_price),
      cost_basis: this.sanitizeNumber(rawProduct.cost_basis),
      stock_level: this.sanitizeInteger(rawProduct.stock_level) || 0,
      reserved_quantity: this.sanitizeInteger(rawProduct.reserved_quantity) || 0,
      inbound_quantity: this.sanitizeInteger(rawProduct.inbound_quantity) || 0,
      is_fba: Boolean(rawProduct.is_fba),
      is_active: rawProduct.is_active !== undefined ? Boolean(rawProduct.is_active) : true,
      weight: this.sanitizeNumber(rawProduct.weight),
      product_dimensions: this.sanitizeJSONField(rawProduct.product_dimensions),
      supplier_info: this.sanitizeJSONField(rawProduct.supplier_info),
      created_at: rawProduct.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // FIXED: Validate critical fields
    if (!sanitized.seller_id) {
      throw new Error('sanitizeProductData: seller_id is required')
    }
    
    if (!sanitized.asin) {
      throw new Error('sanitizeProductData: valid ASIN is required')
    }
    
    // FIXED: Validate numeric fields
    if (sanitized.current_price !== null) {
      const priceValidation = SPAPIValidator.validatePrice(sanitized.current_price)
      if (!priceValidation.isValid) {
        console.warn(`Invalid current_price during sanitization: ${priceValidation.errors.join(', ')}`)
        sanitized.current_price = null
      }
    }
    
    return sanitized
  }
  
  /**
   * FIXED: Helper to sanitize JSON fields
   */
  static sanitizeJSONField(value: any): any {
    if (value === null || value === undefined) {
      return {}
    }
    
    if (typeof value === 'object') {
      try {
        // Test if it's serializable
        JSON.stringify(value)
        return value
      } catch (error) {
        console.warn('sanitizeJSONField: Object not serializable, using empty object')
        return {}
      }
    }
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch (error) {
        console.warn('sanitizeJSONField: Invalid JSON string, using empty object')
        return {}
      }
    }
    
    console.warn('sanitizeJSONField: Unexpected value type, using empty object')
    return {}
  }
}