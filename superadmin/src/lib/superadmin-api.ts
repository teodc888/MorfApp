import { adminFetch } from '@/lib/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export type SuperAdminTenant = {
  id: string
  slug: string
  name: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string | null
  plan: string
  status: string
  subscriptionEndsAt: string | null
  createdAt: string
  adminCount: number
}

export type CreateTenantPayload = {
  name: string
  slug: string
  plan: string
  subscriptionEndsAt: string | null
  ownerName: string
  ownerPhone: string
  adminEmail: string
  adminPassword: string
}

export type UpdateTenantPayload = {
  name?: string
  slug?: string
  ownerName?: string
  ownerPhone?: string
  subscriptionEndsAt: string | null
  plan?: string
}

export type SuperAdminSettings = {
  id: string
  notificationMessageTemplate: string
  updatedAt: string
}

export async function getSuperAdminTenants(): Promise<SuperAdminTenant[]> {
  return json<SuperAdminTenant[]>(await adminFetch('/api/superadmin/tenants'))
}

export async function createTenant(payload: CreateTenantPayload): Promise<SuperAdminTenant> {
  return json<SuperAdminTenant>(await adminFetch('/api/superadmin/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  }))
}

export async function updateTenant(id: string, payload: UpdateTenantPayload): Promise<void> {
  const res = await adminFetch(`/api/superadmin/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
}

export async function activateTenant(id: string): Promise<{ message: string; setupUrl?: string }> {
  return json<{ message: string; setupUrl?: string }>(
    await adminFetch(`/api/superadmin/tenants/${id}/activate`, { method: 'POST' })
  )
}

export async function updateTenantStatus(id: string, status: 'Active' | 'Inactive'): Promise<void> {
  const res = await adminFetch(`/api/superadmin/tenants/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
}

export async function getSettings(): Promise<SuperAdminSettings> {
  return json<SuperAdminSettings>(await adminFetch('/api/superadmin/settings'))
}

export async function resetTenantPassword(id: string): Promise<{ setupUrl: string }> {
  const res = await adminFetch(`/api/superadmin/tenants/${id}/reset-password`, {
    method: 'POST',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function updateSettings(template: string): Promise<void> {
  const res = await adminFetch('/api/superadmin/settings', {
    method: 'PUT',
    body: JSON.stringify({ notificationMessageTemplate: template }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
}

export function buildWhatsAppNotificationUrl(phone: string, tenantName: string, plan: string, endsAt: string | null, template?: string): string {
  const fecha = endsAt
    ? new Date(endsAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'fecha no definida'

  const planLabel: Record<string, string> = { Basico: 'Básico', Pro: 'Pro', Negocio: 'Negocio' }

  const defaultMessage = `Hola! 👋 Te escribimos desde MorfApp. Tu plan *{plan}* para *{tenantName}* vence el *{expirationDate}*. Para renovar o consultar precios, respondé este mensaje. ¡Gracias!`
  const messageTemplate = template || defaultMessage

  const message = messageTemplate
    .replace('{plan}', planLabel[plan] ?? plan)
    .replace('{tenantName}', tenantName)
    .replace('{expirationDate}', fecha)

  const number = phone.replace(/\D/g, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
