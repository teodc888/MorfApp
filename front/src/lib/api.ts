import type { TenantPublic, Category } from '@/types/store'

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
