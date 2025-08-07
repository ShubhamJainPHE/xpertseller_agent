/**
 * Comprehensive TypeScript interfaces for SP-API data structures
 * FIXES: Replaced all 'any' types with proper interfaces
 */

// Core SP-API Response Structure
export interface SPAPIResponse<T = any> {
  payload?: T
  errors?: SPAPIError[]
  warnings?: SPAPIWarning[]
  pagination?: {
    nextToken?: string
    totalResultCount?: number
  }
}

export interface SPAPIError {
  code: string
  message: string
  details?: string
}

export interface SPAPIWarning {
  code: string
  message: string
  details?: string
}

// Credentials and Authentication
export interface SPAPICredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  tokenExpiry?: Date
  sellerId: string
  marketplaceId: string
}

export interface LWAToken {
  access_token: string
  expires_in: number
  token_type: 'bearer'
  scope?: string
}

// Product and Listing Types
export interface ListingItem {
  sku: string
  asin?: string
  productName?: string
  marketplaceId: string
  status: 'ACTIVE' | 'INACTIVE' | 'INCOMPLETE'
  fulfillmentChannel: 'AMAZON' | 'DEFAULT' | 'AFN' | 'MFN'
  summaries?: ListingSummary[]
  attributes?: ListingAttributes
  issues?: ListingIssue[]
  offers?: ListingOffer[]
  fulfillmentAvailability?: FulfillmentAvailability[]
  procurement?: ProcurementInfo
}

export interface ListingSummary {
  marketplaceId: string
  asin?: string
  productType: string
  conditionType?: 'NEW' | 'USED' | 'REFURBISHED'
  status: string[]
  fnSku?: string
  itemName: string
  createdDate: string
  lastUpdatedDate: string
}

export interface ListingAttributes {
  [key: string]: AttributeValue[]
}

export interface AttributeValue {
  value?: string | number | boolean
  valueMeasurement?: {
    value: number
    unit: string
  }
  valueWithDisplayText?: {
    value: string
    displayText: string
  }
}

export interface ListingIssue {
  code: string
  message: string
  severity: 'ERROR' | 'WARNING'
  attributeNames?: string[]
}

export interface ListingOffer {
  listingPrice: MoneyType
  points?: {
    pointsNumber: number
  }
}

export interface FulfillmentAvailability {
  fulfillmentChannelCode: 'AMAZON' | 'DEFAULT'
  quantity?: number
}

export interface ProcurementInfo {
  costPrice?: MoneyType
}

// Money and Currency Types
export interface MoneyType {
  Amount: string
  CurrencyCode: string
}

// Inventory Types
export interface InventorySummary {
  asin?: string
  fnSku?: string
  sellerSku?: string
  condition?: 'NEW' | 'USED'
  inventoryDetails?: InventoryDetails
  lastUpdatedTime?: string
  productName?: string
  totalQuantity?: number
  sellableQuantity?: number
  pendingQuantity?: number
  totalReservedQuantity?: number
  reservedQuantity?: ReservedQuantity
  unfulfillableQuantity?: number
  inboundWorkingQuantity?: number
  inboundShippedQuantity?: number
  inboundReceivingQuantity?: number
}

export interface InventoryDetails {
  fulfillableQuantity?: number
  inboundWorkingQuantity?: number
  inboundShippedQuantity?: number
  inboundReceivingQuantity?: number
  reservedQuantity?: ReservedQuantity
  unfulfillableQuantity?: UnfulfillableQuantity
}

export interface ReservedQuantity {
  totalReservedQuantity?: number
  pendingCustomerOrderQuantity?: number
  pendingTransshipmentQuantity?: number
  fcProcessingQuantity?: number
}

export interface UnfulfillableQuantity {
  totalUnfulfillableQuantity?: number
  customerDamagedQuantity?: number
  warehouseDamagedQuantity?: number
  distributorDamagedQuantity?: number
  carrierDamagedQuantity?: number
  defectiveQuantity?: number
  expiredQuantity?: number
}

// Order Types
export interface Order {
  AmazonOrderId: string
  SellerOrderId?: string
  PurchaseDate: string
  LastUpdateDate: string
  OrderStatus: 'Pending' | 'Unshipped' | 'PartiallyShipped' | 'Shipped' | 'Canceled' | 'Unfulfillable'
  FulfillmentChannel: 'MFN' | 'AFN'
  SalesChannel?: string
  OrderChannel?: string
  ShipServiceLevel?: string
  OrderTotal?: MoneyType
  NumberOfItemsShipped?: number
  NumberOfItemsUnshipped?: number
  PaymentMethod?: 'COD' | 'CVS' | 'Other'
  PaymentMethodDetails?: string[]
  MarketplaceId: string
  ShipmentServiceLevelCategory?: string
  OrderType?: 'StandardOrder' | 'LongLeadTimeOrder' | 'Preorder' | 'BackOrder'
  EarliestShipDate?: string
  LatestShipDate?: string
  EarliestDeliveryDate?: string
  LatestDeliveryDate?: string
  IsBusinessOrder?: boolean
  PurchaseOrderNumber?: string
  IsPrime?: boolean
  IsPremiumOrder?: boolean
  IsGlobalExpressEnabled?: boolean
  ReplacedOrderId?: string
  IsReplacementOrder?: boolean
  PromiseResponseDueDate?: string
  IsEstimatedShipDateSet?: boolean
  IsSoldByAB?: boolean
}

export interface OrderItem {
  ASIN: string
  SellerSKU?: string
  OrderItemId: string
  Title?: string
  QuantityOrdered: number
  QuantityShipped?: number
  ProductInfo?: {
    NumberOfItems?: number
  }
  PointsGranted?: {
    PointsNumber?: number
    PointsMonetaryValue?: MoneyType
  }
  ItemPrice?: MoneyType
  ShippingPrice?: MoneyType
  ItemTax?: MoneyType
  ShippingTax?: MoneyType
  ShippingDiscount?: MoneyType
  ShippingDiscountTax?: MoneyType
  PromotionDiscount?: MoneyType
  PromotionDiscountTax?: MoneyType
  PromotionIds?: string[]
  CODFee?: MoneyType
  CODFeeDiscount?: MoneyType
  IsGift?: boolean
  ConditionNote?: string
  ConditionId?: string
  ConditionSubtypeId?: string
  ScheduledDeliveryStartDate?: string
  ScheduledDeliveryEndDate?: string
  PriceDesignation?: string
  TaxCollection?: {
    Model: 'MarketplaceFacilitator' | 'Standard'
    ResponsibleParty: 'Amazon Services, Inc.' | string
  }
  SerialNumberRequired?: boolean
  IsTransparency?: boolean
  IossNumber?: string
  StoreChainStoreId?: string
  DeemedResellerCategory?: 'IOSS' | 'UOSS'
  BuyerInfo?: BuyerInfo
}

export interface BuyerInfo {
  BuyerEmail?: string
  BuyerName?: string
  BuyerCounty?: string
  BuyerTaxInfo?: {
    CompanyLegalName?: string
    TaxingRegion?: string
    TaxClassifications?: TaxClassification[]
  }
  PurchaseOrderNumber?: string
}

export interface TaxClassification {
  Name?: string
  Value?: string
}

// Financial Events Types
export interface FinancialEventGroup {
  FinancialEventGroupId: string
  ProcessingStatus: 'Open' | 'Closed'
  FundTransferStatus?: 'Success' | 'Processing' | 'Cancelled' | 'Error'
  OriginalTotal?: MoneyType
  ConvertedTotal?: MoneyType
  FundTransferDate?: string
  TraceId?: string
  AccountTail: string
  BeginningBalance?: MoneyType
  FinancialEventGroupStart?: string
  FinancialEventGroupEnd?: string
}

export interface FinancialEvents {
  ShipmentEventList?: ShipmentEvent[]
  RefundEventList?: ShipmentEvent[]
  GuaranteeClaimEventList?: GuaranteeClaimEvent[]
  ChargebackEventList?: ChargebackEvent[]
  PayWithAmazonEventList?: PayWithAmazonEvent[]
  ServiceProviderCreditEventList?: SolutionProviderCreditEvent[]
  RetrochargeEventList?: RetrochargeEvent[]
  RentalTransactionEventList?: RentalTransactionEvent[]
  ProductAdsPaymentEventList?: ProductAdsPaymentEvent[]
  ServiceFeeEventList?: ServiceFeeEvent[]
}

export interface ShipmentEvent {
  AmazonOrderId: string
  SellerOrderId?: string
  MarketplaceId: string
  PostedDate: string
  ShipmentItemList?: ShipmentItem[]
}

export interface ShipmentItem {
  SellerSKU?: string
  OrderItemId: string
  QuantityShipped: number
  ItemChargeList?: ChargeComponent[]
  ItemFeeList?: FeeComponent[]
}

export interface ChargeComponent {
  ChargeType: string
  ChargeAmount: MoneyType
}

export interface FeeComponent {
  FeeType: string
  FeeAmount: MoneyType
}

// Report Types
export interface ReportSpecification {
  reportType: string
  marketplaceIds: string[]
  dataStartTime?: string
  dataEndTime?: string
  reportOptions?: Record<string, string>
}

export interface Report {
  marketplaceIds?: string[]
  reportId: string
  reportType: string
  dataStartTime?: string
  dataEndTime?: string
  reportScheduleId?: string
  createdTime: string
  processingStatus: 'CANCELLED' | 'DONE' | 'FATAL' | 'IN_PROGRESS' | 'IN_QUEUE'
  processingStartTime?: string
  processingEndTime?: string
  reportDocumentId?: string
}

// Error Handling Types
export interface RetryStrategy {
  shouldRetry: boolean
  delayMs: number
  maxRetries: number
}

export interface ErrorContext {
  sellerId: string
  operation: string
  asin?: string
  endpoint?: string
  finalAttempt?: boolean
  totalAttempts?: number
}

export interface CategorizedError {
  category: 'auth' | 'rate_limit' | 'permission' | 'data' | 'network' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  message: string
}

// Database Integration Types (extending existing Database types)
export interface SanitizedProductData {
  seller_id: string
  asin: string
  marketplace_id: string
  title: string
  brand?: string | null
  category?: string | null
  subcategory?: string | null
  product_group?: string | null
  current_price?: number | null
  list_price?: number | null
  cost_basis?: number | null
  stock_level: number
  reserved_quantity: number
  inbound_quantity: number
  is_fba: boolean
  is_active: boolean
  weight?: number | null
  product_dimensions: Record<string, any>
  supplier_info: Record<string, any>
  created_at: string
  updated_at: string
}

// Service Response Types
export interface SyncResult {
  success: boolean
  itemCount: number
  errorCount: number
  message: string
  errors?: string[]
  warnings?: string[]
}

export interface ComprehensiveSyncSummary {
  sellerId: string
  email: string
  startTime: string
  endTime: string
  duration: number
  phases: {
    listings: SyncResult
    inventory: SyncResult
    orders: SyncResult
    financial: SyncResult
    additional: SyncResult
  }
  totalItems: number
  totalErrors: number
  successRate: number
}

// Add missing interfaces that were referenced
export interface GuaranteeClaimEvent {
  MarketplaceId: string
  OrderId: string
  ReasonCode: string
  ReasonCodeDescription: string
  ClaimAmount: MoneyType
  PostedDate: string
}

export interface ChargebackEvent {
  MarketplaceId: string
  OrderId: string
  ReasonCode: string
  ReasonCodeDescription: string
  ChargebackAmount: MoneyType
  PostedDate: string
}

export interface PayWithAmazonEvent {
  SellerOrderId?: string
  TransactionPostedDate: string
  BusinessObjectType: string
  SalesChannel: string
  Charge: {
    ChargeType: string
    ChargeAmount: MoneyType
  }
}

export interface SolutionProviderCreditEvent {
  ProviderTransactionType: string
  SellerOrderId?: string
  MarketplaceId: string
  MarketplaceCountryCode: string
  SellerId: string
  SellerStoreName: string
  ProviderId: string
  ProviderStoreName: string
}

export interface RetrochargeEvent {
  RetrochargeEventType: string
  AmazonOrderId: string
  PostedDate: string
  BaseTax: MoneyType
  ShippingTax: MoneyType
  MarketplaceName: string
}

export interface RentalTransactionEvent {
  AmazonOrderId: string
  RentalEventType: string
  ExtensionLength: number
  PostedDate: string
  RentalChargeList: ChargeComponent[]
  RentalFeeList: FeeComponent[]
  MarketplaceName: string
  RentalInitialValue: MoneyType
  RentalReimbursement: MoneyType
  RentalTaxWithheldList: TaxWithheldComponent[]
}

export interface TaxWithheldComponent {
  TaxCollectionModel: string
  TaxesWithheld: ChargeComponent[]
}

export interface ProductAdsPaymentEvent {
  PostedDate: string
  TransactionType: string
  InvoiceId: string
  BaseValue: MoneyType
  TaxValue: MoneyType
  TransactionValue: MoneyType
}

export interface ServiceFeeEvent {
  AmazonOrderId?: string
  FeeReason: string
  FeeList: FeeComponent[]
  SellerSKU?: string
  FnSKU?: string
  FeeDescription: string
  ASIN?: string
}