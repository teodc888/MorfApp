export type TenantBranding = {
  colorPrimary: string
  colorAccent: string
  logoUrl: string | null
  bannerUrl: string | null
  emojiIcon: string
  tagline: string | null
}

export type TenantAdmin = {
  id: string
  slug: string
  name: string
  whatsappNumber: string
  whatsAppMessageTemplate: string | null
  branding: TenantBranding
  delivery: DeliveryConfig | null
  payment: PaymentConfig | null
  hours: BusinessHour[]
}

export type DeliveryConfig = {
  mode: 'delivery' | 'pickup' | 'both'
  deliveryCost: number | null
  freeDeliveryFrom: number | null
  minOrderAmount: number | null
  estimatedMinutes: string | null
  pickupAddress: string | null
}

export type PaymentConfig = {
  deliveryCash: boolean
  deliveryTransfer: boolean
  deliveryCard: boolean
  pickupCash: boolean
  pickupTransfer: boolean
  pickupCard: boolean
}

export type BusinessHour = {
  dayOfWeek: number
  isOpen: boolean
  opensAt: string | null
  closesAt: string | null
}

export type TenantPublic = {
  id: string
  slug: string
  name: string
  whatsappNumber: string
  whatsAppMessageTemplate: string | null
  isOpen: boolean
  branding: TenantBranding
  deliveryConfig: DeliveryConfig
  paymentConfig: PaymentConfig
  businessHours: BusinessHour[]
}

export type ModifierOption = {
  id: string
  name: string
  emoji: string
  extraPrice: number
}

export type ModifierGroup = {
  id: string
  name: string
  type: 'single' | 'multiple'
  isRequired: boolean
  maxSelect: number | null
  options: ModifierOption[]
}

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  finalPrice?: number | null
  discountPercent?: number | null
  emoji: string
  imageUrl: string | null
  tags: string[]
  modifierGroups: ModifierGroup[]
}

export type Category = {
  id: string
  name: string
  emoji: string
  sortOrder: number
  products: Product[]
}

export type SelectedOption = {
  optionId: string
  name: string
  extraPrice: number
}

export type CartItem = {
  cartId: string
  product: Product
  qty: number
  selections: Record<string, SelectedOption | SelectedOption[]>
  extraPrice: number
  observations?: string
}

export type Promotion = {
  id: string
  name: string
  description: string | null
  price: number
  emoji: string
  imageUrl: string | null
  sortOrder: number
  maxPerUser: number | null
  originalPrice: number
  discountPercent: number
  products: Product[]
  modifierGroups: ModifierGroup[]
}

export interface SupplierDto {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  totalDebt: number
  isActive: boolean
  createdAt: string
}

export interface SupplierDebtDetailDto {
  supplierId: string
  supplierName: string
  totalDebt: number
  purchases: SupplierDebtPurchaseDto[]
  payments: SupplierPaymentDto[]
}

export interface SupplierDebtPurchaseDto {
  purchaseId: string
  supplyId: string
  supplyName: string
  totalPrice: number
  paidAmount: number
  pendingAmount: number
  status: 'pending' | 'partial' | 'paid'
  purchaseDate: string
  allocations: SupplierPaymentAllocationDto[]
}

export interface SupplierPaymentDto {
  id: string
  supplierId: string
  supplierName: string
  amount: number
  notes?: string
  paidAt: string
  allocations: SupplierPaymentAllocationDto[]
}

export interface SupplierPaymentAllocationDto {
  paymentId: string
  purchaseId: string
  supplyName: string
  amount: number
}

export interface SupplyDto {
  id: string
  name: string
  unit?: string
  currentStock: number
  supplierId?: string
  supplierName?: string
  isActive: boolean
  createdAt: string
}

export interface SupplyPurchaseDto {
  id: string
  supplyId: string
  supplyName: string
  supplierId?: string
  supplierName?: string
  quantityPurchased: number
  totalPrice: number
  pricePerUnit: number
  notes?: string
  purchaseDate: string
}

export interface ProductSupplyDto {
  supplyId: string
  supplyName: string
  unit?: string
  quantityRequired: number
  isUnknownQuantity: boolean
}

export interface InventoryMovementDto {
  id: string
  supplyId: string
  supplyName: string
  quantityChange: number
  reason: 'Purchase' | 'OrderDeducted' | 'ManualReset' | 'ManualAdjust'
  referenceId?: string
  createdAt: string
}
