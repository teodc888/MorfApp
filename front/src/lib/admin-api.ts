import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/auth'
import type { TenantAdmin, TenantBranding, DeliveryConfig, PaymentConfig, BusinessHour, Category, Product } from '@/types/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500'

type CategoryWithProducts = Category & { isActive: boolean }

type ProductAdmin = Product & {
  categoryId: string
  sortOrder: number
  isActive: boolean
  discountPercent?: number | null
}

type CreateCategoryBody = {
  name: string
  emoji: string
  sortOrder: number
}

type UpdateCategoryBody = CreateCategoryBody & { isActive: boolean }

type CreateProductBody = {
  categoryId: string
  name: string
  description: string
  price: number
  emoji: string
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  tags: string[]
}

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return null
  }

  const data = await res.json() as { accessToken: string; refreshToken: string; expiresIn: number }
  saveTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

export async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()

  const makeRequest = (t: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    })

  let res = await makeRequest(token)

  if (res.status !== 401) return res

  if (isRefreshing) {
    const newToken = await new Promise<string | null>((resolve) => {
      refreshQueue.push(resolve)
    })
    return makeRequest(newToken)
  }

  isRefreshing = true
  const newToken = await attemptRefresh()
  isRefreshing = false
  refreshQueue.forEach((cb) => cb(newToken))
  refreshQueue = []

  if (!newToken) {
    if (typeof window !== 'undefined') {
      window.location.href = './login'
    }
    return res
  }

  res = await makeRequest(newToken)
  return res
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseJson<{ accessToken: string; refreshToken: string; expiresIn: number }>(res)
}

export async function getAdminMe(): Promise<TenantAdmin> {
  const res = await adminFetch('/api/admin/me')
  return parseJson<TenantAdmin>(res)
}

export async function updateAdminMe(body: { name: string; whatsappNumber: string }): Promise<void> {
  const res = await adminFetch('/api/admin/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function updateBranding(body: Partial<TenantBranding>): Promise<void> {
  const res = await adminFetch('/api/admin/branding', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

type UpdateDeliveryBody = {
  mode: string
  deliveryCost?: number | null
  freeDeliveryFrom?: number | null
  minOrderAmount?: number | null
  estimatedMinutes?: string | null
  pickupAddress?: string | null
}

export async function updateDelivery(body: UpdateDeliveryBody): Promise<void> {
  const res = await adminFetch('/api/admin/delivery', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function updateHours(body: BusinessHour[]): Promise<void> {
  const res = await adminFetch('/api/admin/hours', {
    method: 'PUT',
    body: JSON.stringify({ hours: body }),
  })
  return assertOk(res)
}

export async function updateWhatsAppTemplate(template: string | null): Promise<void> {
  const res = await adminFetch('/api/admin/whatsapp-template', {
    method: 'PUT',
    body: JSON.stringify({ template }),
  })
  return assertOk(res)
}

export async function updatePayment(body: PaymentConfig): Promise<void> {
  const res = await adminFetch('/api/admin/payment', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function getAdminCategories(): Promise<CategoryWithProducts[]> {
  const res = await adminFetch('/api/admin/categories')
  return parseJson<CategoryWithProducts[]>(res)
}

export async function createCategory(body: CreateCategoryBody): Promise<Category> {
  const res = await adminFetch('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parseJson<Category>(res)
}

export async function updateCategory(id: string, body: UpdateCategoryBody): Promise<void> {
  const res = await adminFetch(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Delete category failed ${res.status}: ${text}`)
  }
}

export async function getAdminProducts(): Promise<ProductAdmin[]> {
  const res = await adminFetch('/api/admin/products')
  return parseJson<ProductAdmin[]>(res)
}

export async function createProduct(body: CreateProductBody): Promise<ProductAdmin> {
  const res = await adminFetch('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parseJson<ProductAdmin>(res)
}

export async function updateProduct(id: string, body: Partial<CreateProductBody>): Promise<void> {
  const res = await adminFetch(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Delete product failed ${res.status}: ${text}`)
  }
}

export async function updateProductDiscount(id: string, discountPercent: number | null): Promise<void> {
  const res = await adminFetch(`/api/admin/products/${id}/discount`, {
    method: 'PUT',
    body: JSON.stringify({ discountPercent }),
  })
  return assertOk(res)
}

// ── Modifier Groups ──────────────────────────────────────────────────────────

export type ModifierOptionForm = {
  id?: string
  name: string
  emoji: string
  extraPrice: number
  sortOrder: number
}

export type ModifierGroupAdmin = {
  id: string
  name: string
  type: 'Single' | 'Multiple'
  isRequired: boolean
  maxSelect: number | null
  sortOrder: number
  options: Array<{
    id: string
    name: string
    emoji: string
    extraPrice: number
    sortOrder: number
    isActive: boolean
  }>
}

type ModifierGroupBody = {
  name: string
  type: string
  isRequired: boolean
  maxSelect: number | null
  sortOrder: number
  options: ModifierOptionForm[]
}

export async function getModifierGroups(): Promise<ModifierGroupAdmin[]> {
  const res = await adminFetch('/api/admin/modifier-groups')
  return parseJson<ModifierGroupAdmin[]>(res)
}

export async function createModifierGroup(body: ModifierGroupBody): Promise<ModifierGroupAdmin> {
  const res = await adminFetch('/api/admin/modifier-groups', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parseJson<ModifierGroupAdmin>(res)
}

export async function updateModifierGroup(id: string, body: ModifierGroupBody): Promise<void> {
  const res = await adminFetch(`/api/admin/modifier-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function deleteModifierGroup(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/modifier-groups/${id}`, { method: 'DELETE' })
  return assertOk(res)
}

export async function updateProductModifierGroups(productId: string, modifierGroupIds: string[]): Promise<void> {
  const res = await adminFetch(`/api/admin/products/${productId}/modifier-groups`, {
    method: 'PUT',
    body: JSON.stringify({ modifierGroupIds }),
  })
  return assertOk(res)
}

export async function uploadImage(file: File): Promise<string> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/api/admin/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed ${res.status}: ${text}`)
  }
  const data = await res.json() as { url: string }
  return data.url
}

// ── Promotions ──────────────────────────────────────────────────────────

export type PromotionAdmin = {
  id: string
  name: string
  description: string | null
  discountPercent: number
  emoji: string
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  maxPerUser: number | null
  originalPrice: number
  productIds: string[]
  modifierGroupIds: string[]
}

export async function getPromotions(): Promise<PromotionAdmin[]> {
  const res = await adminFetch('/api/admin/promotions')
  return parseJson<PromotionAdmin[]>(res)
}

export async function createPromotion(body: {
  name: string
  description: string | null
  discountPercent: number
  emoji: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  maxPerUser: number | null
  productIds: string[]
  modifierGroupIds?: string[]
}): Promise<PromotionAdmin> {
  const res = await adminFetch('/api/admin/promotions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parseJson<PromotionAdmin>(res)
}

export async function updatePromotion(
  id: string,
  body: {
    name: string
    description: string | null
    discountPercent: number
    emoji: string | null
    imageUrl: string | null
    sortOrder: number
    isActive: boolean
    maxPerUser: number | null
  }
): Promise<void> {
  const res = await adminFetch(`/api/admin/promotions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return assertOk(res)
}

export async function updatePromotionProducts(id: string, productIds: string[]): Promise<void> {
  const res = await adminFetch(`/api/admin/promotions/${id}/products`, {
    method: 'PUT',
    body: JSON.stringify({ productIds }),
  })
  return assertOk(res)
}

export async function updatePromotionModifierGroups(id: string, modifierGroupIds: string[]): Promise<void> {
  const res = await adminFetch(`/api/admin/promotions/${id}/modifier-groups`, {
    method: 'PUT',
    body: JSON.stringify({ modifierGroupIds }),
  })
  return assertOk(res)
}

export async function deletePromotion(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
  return assertOk(res)
}

// ── Orders ──────────────────────────────────────────────────────────

export type OrderItemJson = {
  productId: string
  productName: string
  qty: number
  unitPrice: number
  extraPrice: number
  observations?: string | null
}

export type OrderItemFromApi = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  modifiers: Array<{
    optionId: string
    optionName: string
    extraPrice: number
  }>
}

export type OrderAdmin = {
  id: string
  customerName: string | null
  customerPhone: string
  items: OrderItemFromApi[]
  totalPrice: number
  deliveryMode: string | null
  address: string | null
  notes: string | null
  paymentMethod: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
  confirmedAt: string | null
}

export async function getOrders(
  status?: string,
  search?: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ items: OrderAdmin[], total: number, limit: number, offset: number }> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (search) params.append('q', search)
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())
  const query = params.toString() ? `?${params.toString()}` : ''
  const res = await adminFetch(`/api/admin/orders${query}`)
  return parseJson<{ items: OrderAdmin[], total: number, limit: number, offset: number }>(res)
}

export async function confirmOrder(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/orders/${id}/confirm`, { method: 'POST' })
  return assertOk(res)
}

export async function cancelOrder(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' })
  return assertOk(res)
}

// ── Metrics ──────────────────────────────────────────────────────────

export type MetricsPeriod = 'today' | 'week' | 'month' | 'year'

export type TopProduct = {
  productId: string
  productName: string
  quantity: number
  revenue: number
}

export type RevenuePoint = {
  label: string
  revenue: number
  orders: number
}

export type HourlyPoint = {
  hour: number
  orders: number
}

export type MetricsData = {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  totalCustomers: number
  topProducts: TopProduct[]
  revenueOverTime: RevenuePoint[]
  ordersByHour: HourlyPoint[]
}

export async function getMetrics(period: MetricsPeriod): Promise<MetricsData> {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const dateStr = today.toISOString().split('T')[0]

  let url = ''
  switch (period) {
    case 'today':
      url = `/api/admin/metrics/daily?date=${dateStr}`
      break
    case 'week':
      url = `/api/admin/metrics/weekly?date=${dateStr}`
      break
    case 'month':
      url = `/api/admin/metrics/monthly?month=${month}&year=${year}`
      break
    case 'year':
      url = `/api/admin/metrics/yearly?year=${year}`
      break
  }

  const res = await adminFetch(url)
  return parseJson<MetricsData>(res)
}
