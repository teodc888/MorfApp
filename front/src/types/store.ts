export type TenantBranding = {
  colorPrimary: string
  colorAccent: string
  logoUrl: string | null
  bannerUrl: string | null
  emojiIcon: string
  tagline: string | null
}

export type TenantPlan = 'Basico' | 'Pro' | 'Negocio'

export type PlanCatalogEntry = {
  plan: TenantPlan
  displayName: string
  monthlyPriceArs: number
  features: string[]
}

export type MarketingConfig = {
  metaPixelId: string | null
  metaPixelEnabled: boolean
  googleAnalyticsId: string | null
  googleAnalyticsEnabled: boolean
}

export type TenantAdmin = {
  id: string
  slug: string
  name: string
  whatsappNumber: string
  whatsAppMessageTemplate: string | null
  plan: TenantPlan
  branding: TenantBranding
  delivery: DeliveryConfig | null
  payment: PaymentConfig | null
  hours: BusinessHour[]
  isPaused: boolean
  marketing: MarketingConfig
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
  status: string
  branding: TenantBranding
  deliveryConfig: DeliveryConfig
  paymentConfig: PaymentConfig
  businessHours: BusinessHour[]
  metaPixelId: string | null
  googleAnalyticsId: string | null
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
  imageUrls: string[]
  tags: string[]
  modifierGroups: ModifierGroup[]
  isOutOfStock: boolean
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

export type OrderTrackingModifier = {
  optionName: string
  extraPrice: number
}

export type OrderTrackingItem = {
  productName: string
  quantity: number
  unitPrice: number
  modifiers: OrderTrackingModifier[]
  observations?: string | null
}

export type OrderTracking = {
  id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  items: OrderTrackingItem[]
  totalPrice: number
  deliveryMode: string
  address: string | null
  estimatedMinutes: string | null
  customerName: string
  customerPhoneMasked: string
  createdAt: string
  confirmedAt: string | null
}

// ── Employees ──

export interface EmployeeDto {
  id: string
  name: string
  phone?: string
  email?: string
  position?: string
  remunerationType: 'fixed' | 'hourly' | 'mixed'
  baseSalary: number
  hourlyRate: number
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly'
  paymentDay: number
  hireDate: string
  isActive: boolean
  hasAdminLogin: boolean
  permissions: string[]
  pendingAdvances: number
  createdAt: string
}

export interface CreateEmployeeBody {
  name: string
  phone?: string
  email?: string
  position?: string
  remunerationType: 'fixed' | 'hourly' | 'mixed'
  baseSalary: number
  hourlyRate: number
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly'
  paymentDay: number
  hireDate: string
}

export type UpdateEmployeeBody = CreateEmployeeBody

export interface SalaryPaymentDto {
  id: string
  employeeId: string
  employeeName: string
  periodStart: string
  periodEnd: string
  basePaid: number
  hoursWorked?: number
  hoursAmount: number
  advancesDeducted: number
  bonus: number
  totalPaid: number
  isAguinaldo: boolean
  notes?: string
  paidAt: string
  createdAt: string
}

export interface RegisterPaymentBody {
  periodStart: string
  periodEnd: string
  basePaid: number
  hoursWorked?: number
  hoursAmount: number
  bonus: number
  isAguinaldo: boolean
  notes?: string
  paidAt: string
}

export interface EmployeeAdvanceDto {
  id: string
  employeeId: string
  amount: number
  reason?: string
  date: string
  isApplied: boolean
  salaryPaymentId?: string
  createdAt: string
}

export interface RegisterAdvanceBody {
  amount: number
  reason?: string
  date: string
}

export interface EmployeePendingDto {
  employeeId: string
  employeeName: string
  position?: string
  remunerationType: 'fixed' | 'hourly' | 'mixed'
  baseSalary: number
  hourlyRate: number
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly'
  nextPaymentDate: string
  daysUntilPayment: number
  pendingAdvances: number
  aguinaldoDue: boolean
  aguinaldoEstimate: number
}
