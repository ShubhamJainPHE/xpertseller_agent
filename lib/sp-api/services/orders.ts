import { SPAPIClient, SPAPIResponse } from '../client'

export interface Order {
  AmazonOrderId: string
  SellerOrderId?: string
  PurchaseDate: string
  LastUpdateDate: string
  OrderStatus: OrderStatus
  FulfillmentChannel: 'MFN' | 'AFN'
  SalesChannel?: string
  OrderChannel?: string
  ShipServiceLevel?: string
  OrderTotal?: Money
  NumberOfItemsShipped?: number
  NumberOfItemsUnshipped?: number
  PaymentExecutionDetail?: PaymentExecutionDetailItem[]
  PaymentMethod?: PaymentMethod
  PaymentMethodDetails?: string[]
  MarketplaceId: string
  ShipmentServiceLevelCategory?: string
  EasyShipShipmentStatus?: EasyShipShipmentStatus
  CbaDisplayableShippingLabel?: string
  OrderType?: OrderType
  EarliestShipDate?: string
  LatestShipDate?: string
  EarliestDeliveryDate?: string
  LatestDeliveryDate?: string
  IsBusinessOrder?: boolean
  IsPrime?: boolean
  IsPremiumOrder?: boolean
  IsGlobalExpressEnabled?: boolean
  ReplaceOrderId?: string
  IsReplacementOrder?: boolean
  PromiseResponseDueDate?: string
  IsEstimatedShipDateSet?: boolean
  IsSoldByAB?: boolean
  AssignedShipFromLocationAddress?: Address
  FulfillmentInstruction?: FulfillmentInstruction
}

export interface OrderItem {
  ASIN: string
  SellerSKU?: string
  OrderItemId: string
  Title?: string
  QuantityOrdered: number
  QuantityShipped?: number
  ProductInfo?: ProductInfoDetail
  PointsGranted?: PointsGrantedDetail
  ItemPrice?: Money
  ShippingPrice?: Money
  ItemTax?: Money
  ShippingTax?: Money
  ShippingDiscount?: Money
  ShippingDiscountTax?: Money
  PromotionDiscount?: Money
  PromotionDiscountTax?: Money
  PromotionIds?: string[]
  CODFee?: Money
  CODFeeDiscount?: Money
  IsGift?: boolean
  ConditionNote?: string
  ConditionId?: string
  ConditionSubtypeId?: string
  ScheduledDeliveryStartDate?: string
  ScheduledDeliveryEndDate?: string
  PriceDesignation?: string
  TaxCollection?: TaxCollection
  SerialNumberRequired?: boolean
  IsTransparency?: boolean
  IossNumber?: string
  StoreChainStoreId?: string
  DeemedResellerCategory?: DeemedResellerCategory
  BuyerInfo?: BuyerInfo
}

export type OrderStatus = 
  | 'Pending' 
  | 'Unshipped' 
  | 'PartiallyShipped' 
  | 'Shipped' 
  | 'Canceled' 
  | 'Unfulfillable'
  | 'InvoiceUnconfirmed'
  | 'PendingAvailability'

export interface Money {
  CurrencyCode: string
  Amount: string
}

export interface GetOrdersParams {
  CreatedAfter?: string
  CreatedBefore?: string
  LastUpdatedAfter?: string
  LastUpdatedBefore?: string
  OrderStatuses?: OrderStatus[]
  MarketplaceIds: string[]
  FulfillmentChannels?: ('MFN' | 'AFN')[]
  PaymentMethods?: PaymentMethod[]
  BuyerEmail?: string
  SellerOrderId?: string
  MaxResultsPerPage?: number
  NextToken?: string
  AmazonOrderIds?: string[]
  ActualFulfillmentSupplySourceId?: string
  IsISPU?: boolean
  StoreChainStoreId?: string
}

export class OrdersService {
  constructor(private client: SPAPIClient) {}

  async getOrders(params: GetOrdersParams): Promise<SPAPIResponse<{
    Orders: Order[]
    NextToken?: string
    LastUpdatedBefore?: string
    CreatedBefore?: string
  }>> {
    // Convert array parameters to comma-separated strings
    const queryParams: any = { ...params }
    
    if (params.OrderStatuses) {
      queryParams.OrderStatuses = params.OrderStatuses.join(',')
    }
    if (params.MarketplaceIds) {
      queryParams.MarketplaceIds = params.MarketplaceIds.join(',')
    }
    if (params.FulfillmentChannels) {
      queryParams.FulfillmentChannels = params.FulfillmentChannels.join(',')
    }
    if (params.PaymentMethods) {
      queryParams.PaymentMethods = params.PaymentMethods.join(',')
    }
    if (params.AmazonOrderIds) {
      queryParams.AmazonOrderIds = params.AmazonOrderIds.join(',')
    }

    return this.client.get('/orders/v0/orders', queryParams)
  }

  async getOrder(orderId: string): Promise<SPAPIResponse<Order>> {
    return this.client.get(`/orders/v0/orders/${orderId}`)
  }

  async getOrderItems(orderId: string, nextToken?: string): Promise<SPAPIResponse<{
    OrderItems: OrderItem[]
    NextToken?: string
    AmazonOrderId: string
  }>> {
    const params = nextToken ? { NextToken: nextToken } : {}
    return this.client.get(`/orders/v0/orders/${orderId}/orderItems`, params)
  }

  async getOrderBuyerInfo(orderId: string): Promise<SPAPIResponse<{
    AmazonOrderId: string
    BuyerEmail?: string
    BuyerName?: string
    BuyerCounty?: string
    BuyerTaxInfo?: BuyerTaxInfo
    PurchaseOrderNumber?: string
  }>> {
    return this.client.get(`/orders/v0/orders/${orderId}/buyerInfo`)
  }

  async getOrderAddress(orderId: string): Promise<SPAPIResponse<{
    AmazonOrderId: string
    ShippingAddress?: Address
  }>> {
    return this.client.get(`/orders/v0/orders/${orderId}/address`)
  }

  async updateShipmentStatus(orderId: string, payload: {
    MarketplaceId: string
    ShipmentStatus: 'ReadyToShip' | 'Shipped' | 'RefusedPickup'
    OrderItems?: {
      OrderItemId: string
      Quantity: number
    }[]
  }): Promise<SPAPIResponse<any>> {
    return this.client.post(`/orders/v0/orders/${orderId}/shipment`, payload)
  }

  async getOrderRegulatedInfo(orderId: string): Promise<SPAPIResponse<{
    AmazonOrderId: string
    RegulatedInformation: RegulatedInformation
    RequiresDosageLabel: boolean
    RegulatedOrderVerificationStatus: RegulatedOrderVerificationStatus
  }>> {
    return this.client.get(`/orders/v0/orders/${orderId}/regulatedInfo`)
  }
}

// Supporting interfaces
export interface PaymentExecutionDetailItem {
  Payment: Money
  PaymentMethod: PaymentMethod
}

export type PaymentMethod = 'COD' | 'CVS' | 'Other'

export type EasyShipShipmentStatus = 
  | 'PendingSchedule' 
  | 'PendingPickUp' 
  | 'PendingDropOff' 
  | 'LabelCanceled' 
  | 'PickedUp' 
  | 'DroppedOff' 
  | 'AtOriginFC' 
  | 'AtDestinationFC' 
  | 'Delivered' 
  | 'RejectedByBuyer' 
  | 'Undeliverable' 
  | 'ReturningToSeller' 
  | 'ReturnedToSeller' 
  | 'Lost' 
  | 'OutForDelivery' 
  | 'Damaged'

export type OrderType = 'StandardOrder' | 'LongLeadTimeOrder' | 'Preorder' | 'BackOrder'

export interface Address {
  Name: string
  AddressLine1?: string
  AddressLine2?: string
  AddressLine3?: string
  City?: string
  County?: string
  District?: string
  StateOrRegion?: string
  Municipality?: string
  PostalCode?: string
  CountryCode?: string
  Phone?: string
  AddressType?: AddressType
}

export type AddressType = 'Residential' | 'Commercial'

export interface FulfillmentInstruction {
  FulfillmentSupplySourceId?: string
}

export interface ProductInfoDetail {
  NumberOfItems?: number
}

export interface PointsGrantedDetail {
  PointsNumber?: number
  PointsMonetaryValue?: Money
}

export interface TaxCollection {
  Model?: TaxCollectionModel
  ResponsibleParty?: TaxCollectionResponsibleParty
}

export type TaxCollectionModel = 'MarketplaceFacilitator' | 'Standard'
export type TaxCollectionResponsibleParty = 'Amazon Services, Inc.' | 'Amazon Services, Inc.' | 'Amazon.com Services, Inc.'

export type DeemedResellerCategory = 'IOSS' | 'UOSS'

export interface BuyerInfo {
  BuyerEmail?: string
  BuyerName?: string
  BuyerCounty?: string
  BuyerTaxInfo?: BuyerTaxInfo
  PurchaseOrderNumber?: string
}

export interface BuyerTaxInfo {
  CompanyLegalName?: string
  TaxingRegion?: string
  TaxClassifications?: TaxClassification[]
}

export interface TaxClassification {
  Name?: string
  Value?: string
}

export interface RegulatedInformation {
  Fields: RegulatedInformationField[]
}

export interface RegulatedInformationField {
  FieldId: string
  FieldLabel: string
  FieldType: 'Text' | 'FileAttachment'
  FieldValue: string
}

export type RegulatedOrderVerificationStatus = 
  | 'NotRequired' 
  | 'Required' 
  | 'Rejected' 
  | 'Pending' 
  | 'Expired' 
  | 'Approved'