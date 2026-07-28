import type { TenantPublic, Category, Promotion, CartItem, OrderTracking } from '@/types/store'

export type CreateOrderPayload = {
  items: Array<{
    productId: string
    productName: string
    qty: number
    unitPrice: number
    extraPrice: number
    observations?: string
    modifiers: Array<{ optionId: string; name: string; extraPrice: number }>
  }>
  total: number
  customerName: string
  customerPhone: string
  deliveryMode: 'delivery' | 'pickup'
  address?: string
  notes?: string
  paymentMethod: string
}

function buildOrderItems(items: CartItem[]): CreateOrderPayload['items'] {
  return items.map((item) => {
    const modifiers = Object.values(item.selections).flatMap((val) =>
      Array.isArray(val) ? val : [val]
    )
    return {
      productId: item.product.id,
      productName: item.product.name,
      qty: item.qty,
      unitPrice: item.product.finalPrice ?? item.product.price,
      extraPrice: item.extraPrice,
      observations: item.observations,
      modifiers: modifiers.map((m) => ({
        optionId: m.optionId,
        name: m.name,
        extraPrice: m.extraPrice,
      })),
    }
  })
}

export { buildOrderItems }

// En el servidor (SSR) usar la URL interna para evitar el loop de red; en el browser usar la URL pública
const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500')
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500')

export async function getTenant(slug: string): Promise<TenantPublic> {
  const res = await fetch(`${API_URL}/api/store/${slug}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`getTenant failed: ${res.status}`)
  }
  return res.json() as Promise<TenantPublic>
}

export async function getMenu(slug: string): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/store/${slug}/menu`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`getMenu failed: ${res.status}`)
  }
  return res.json() as Promise<Category[]>
}

export async function getPromotions(slug: string): Promise<Promotion[]> {
  const res = await fetch(`${API_URL}/api/store/${slug}/promotions`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  return res.json()
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function createOrder(
  slug: string,
  payload: CreateOrderPayload
): Promise<{ orderId: string; whatsappNumber: string; whatsAppMessageTemplate: string | null }> {
  const res = await fetch(`${API_URL}/api/store/${slug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let body: { message?: string; code?: string } | undefined
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    throw new ApiError(body?.message ?? 'Error al guardar pedido', res.status, body?.code)
  }
  return res.json()
}

export async function getOrderTracking(slug: string, orderId: string): Promise<OrderTracking> {
  const res = await fetch(`${API_URL}/api/store/${slug}/orders/${orderId}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`getOrderTracking failed: ${res.status}`)
  }
  return res.json() as Promise<OrderTracking>
}
