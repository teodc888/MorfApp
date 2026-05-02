import type { TenantPublic, Category, Promotion } from '@/types/store'

// En el servidor (SSR) usar la URL interna para evitar el loop de red; en el browser usar la URL pública
const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500')
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500')

export async function getTenant(slug: string): Promise<TenantPublic> {
  const res = await fetch(`${API_URL}/api/store/${slug}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`getTenant failed: ${res.status}`)
  }
  return res.json() as Promise<TenantPublic>
}

export async function getMenu(slug: string): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/store/${slug}/menu`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`getMenu failed: ${res.status}`)
  }
  return res.json() as Promise<Category[]>
}

export async function getPromotions(slug: string): Promise<Promotion[]> {
  const res = await fetch(`${API_URL}/api/store/${slug}/promotions`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export async function registerRedemption(
  slug: string,
  promoId: string,
  body: { phoneNumber: string; quantity: number }
): Promise<{ used: number; maxPerUser: number | null; canRedeem: boolean }> {
  const res = await fetch(`${API_URL}/api/store/${slug}/promotions/${promoId}/redemptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Redemption failed: ${res.status}`)
  return res.json()
}
