import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSuperAdminTenants,
  createTenant,
  updateTenant,
  activateTenant,
  updateTenantStatus,
  getSettings,
  updateSettings,
  resetTenantPassword,
  getSuperAdminDashboard,
  buildWhatsAppNotificationUrl,
  type SuperAdminTenant,
  type CreateTenantPayload,
  type SuperAdminDashboardDto,
} from '@/lib/superadmin-api'
import * as authLib from '@/lib/auth'

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeResponse = (status: number, body: unknown) => {
  const hasBody = body !== null && status !== 204 && status !== 304
  return new Response(hasBody ? JSON.stringify(body) : null, {
    status,
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
  })
}

const mockFetch = (responses: Response[]) => {
  let idx = 0
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(responses[idx++] ?? makeResponse(500, {}))
  )
}

const fakeTenant: SuperAdminTenant = {
  id:               'tenant-1',
  slug:             'mi-burger',
  name:             'Mi Burger',
  ownerName:        'Dueño Test',
  ownerPhone:       '1155667788',
  ownerEmail:       'owner@burger.com',
  plan:             'Basico',
  status:           'Active',
  subscriptionEndsAt: null,
  createdAt:        '2024-01-01T00:00:00Z',
  adminCount:       1,
}

const fakeDashboard: SuperAdminDashboardDto = {
  activeTenants:    5,
  pendingTenants:   2,
  expiredTenants:   1,
  suspendedTenants: 0,
  ordersLast7Days: [
    { tenantId: 'tenant-1', tenantName: 'Mi Burger', orderCount: 34 },
  ],
  ordersLast30Days: [
    { tenantId: 'tenant-1', tenantName: 'Mi Burger', orderCount: 120 },
  ],
  tenantsWithoutRecentOrders: [
    { tenantId: 'tenant-2', tenantName: 'Pizza Ya', lastOrderAt: '2024-01-01T00:00:00Z' },
  ],
  upcomingExpirations: [
    { tenantId: 'tenant-3', tenantName: 'Sushi Go', subscriptionEndsAt: '2026-07-10T00:00:00Z', daysRemaining: 5 },
  ],
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('superadmin-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    authLib.saveTokens('super-token', 'super-refresh')
  })

  // ── getSuperAdminTenants ───────────────────────────────────────────────────

  it('getSuperAdminTenants retorna lista de tenants', async () => {
    mockFetch([makeResponse(200, [fakeTenant])])

    const result = await getSuperAdminTenants()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('mi-burger')
  })

  it('getSuperAdminTenants lanza error en 403', async () => {
    mockFetch([makeResponse(403, { message: 'Forbidden' })])

    await expect(getSuperAdminTenants()).rejects.toThrow('403')
  })

  it('getSuperAdminTenants lanza error en 500', async () => {
    mockFetch([makeResponse(500, { message: 'Server error' })])

    await expect(getSuperAdminTenants()).rejects.toThrow('500')
  })

  // ── createTenant ──────────────────────────────────────────────────────────

  it('createTenant retorna el tenant creado', async () => {
    mockFetch([makeResponse(201, fakeTenant)])

    const payload: CreateTenantPayload = {
      name:          'Mi Burger',
      slug:          'mi-burger',
      plan:          'Basico',
      subscriptionEndsAt: null,
      ownerName:     'Dueño',
      ownerPhone:    '123',
      adminEmail:    'admin@burger.com',
      adminPassword: 'Pass1234!',
    }

    const result = await createTenant(payload)
    expect(result.slug).toBe('mi-burger')
  })

  it('createTenant lanza error en slug duplicado (400)', async () => {
    mockFetch([makeResponse(400, { message: 'El slug ya está en uso' })])

    await expect(createTenant({
      name: 'X', slug: 'existente', plan: 'Basico',
      subscriptionEndsAt: null, ownerName: 'X',
      ownerPhone: '1', adminEmail: 'x@x.com', adminPassword: 'P1234!',
    })).rejects.toThrow('400')
  })

  // ── updateTenant ──────────────────────────────────────────────────────────

  it('updateTenant resuelve en 204', async () => {
    mockFetch([makeResponse(204, null)])

    await expect(updateTenant('tenant-1', {
      name: 'Actualizado', subscriptionEndsAt: null,
    })).resolves.toBeUndefined()
  })

  it('updateTenant lanza error en 400', async () => {
    mockFetch([makeResponse(400, { message: 'Slug inválido' })])

    await expect(updateTenant('tenant-1', { subscriptionEndsAt: null })).rejects.toThrow('400')
  })

  it('updateTenant lanza error en 404', async () => {
    mockFetch([makeResponse(404, { message: 'Not found' })])

    await expect(updateTenant('no-existe', { subscriptionEndsAt: null })).rejects.toThrow('404')
  })

  // ── activateTenant ────────────────────────────────────────────────────────

  it('activateTenant retorna setupUrl', async () => {
    mockFetch([makeResponse(200, { message: 'Activado', setupUrl: '/setup?token=abc' })])

    const result = await activateTenant('tenant-1')
    expect(result.setupUrl).toBe('/setup?token=abc')
  })

  it('activateTenant lanza error si tenant no está pendiente', async () => {
    mockFetch([makeResponse(400, { message: 'No está en estado pendiente' })])

    await expect(activateTenant('tenant-1')).rejects.toThrow('400')
  })

  // ── updateTenantStatus ────────────────────────────────────────────────────

  it('updateTenantStatus resuelve sin error en 204', async () => {
    mockFetch([makeResponse(204, null)])

    await expect(updateTenantStatus('tenant-1', 'Active')).resolves.toBeUndefined()
  })

  it('updateTenantStatus lanza error en 400', async () => {
    mockFetch([makeResponse(400, { message: 'Estado inválido' })])

    await expect(updateTenantStatus('tenant-1', 'Active')).rejects.toThrow()
  })

  // ── getSettings ───────────────────────────────────────────────────────────

  it('getSettings retorna settings del superadmin', async () => {
    mockFetch([makeResponse(200, { id: '1', notificationMessageTemplate: 'Hola!', updatedAt: '2024-01-01' })])

    const result = await getSettings()
    expect(result.notificationMessageTemplate).toBe('Hola!')
  })

  it('getSettings lanza error en 403', async () => {
    mockFetch([makeResponse(403, { message: 'Forbidden' })])

    await expect(getSettings()).rejects.toThrow('403')
  })

  // ── updateSettings ────────────────────────────────────────────────────────

  it('updateSettings resuelve sin error en 204', async () => {
    mockFetch([makeResponse(204, null)])

    await expect(updateSettings('Nuevo template')).resolves.toBeUndefined()
  })

  it('updateSettings lanza error en 400', async () => {
    mockFetch([makeResponse(400, {})])

    await expect(updateSettings('')).rejects.toThrow()
  })

  // ── resetTenantPassword ───────────────────────────────────────────────────

  it('resetTenantPassword retorna setupUrl', async () => {
    mockFetch([makeResponse(200, { setupUrl: '/activate?token=xyz' })])

    const result = await resetTenantPassword('tenant-1')
    expect(result.setupUrl).toBe('/activate?token=xyz')
  })

  it('resetTenantPassword lanza error en 404', async () => {
    mockFetch([makeResponse(404, { message: 'Tenant not found' })])

    await expect(resetTenantPassword('no-existe')).rejects.toThrow('404')
  })

  // ── getSuperAdminDashboard ────────────────────────────────────────────────

  it('getSuperAdminDashboard retorna los datos del dashboard', async () => {
    mockFetch([makeResponse(200, fakeDashboard)])

    const result = await getSuperAdminDashboard()
    expect(result.activeTenants).toBe(5)
    expect(result.ordersLast7Days).toHaveLength(1)
    expect(result.ordersLast7Days[0].tenantName).toBe('Mi Burger')
    expect(result.tenantsWithoutRecentOrders[0].lastOrderAt).toBe('2024-01-01T00:00:00Z')
    expect(result.upcomingExpirations[0].daysRemaining).toBe(5)
  })

  it('getSuperAdminDashboard lanza error en 403', async () => {
    mockFetch([makeResponse(403, { message: 'Forbidden' })])

    await expect(getSuperAdminDashboard()).rejects.toThrow('403')
  })

  // ── buildWhatsAppNotificationUrl ──────────────────────────────────────────

  describe('buildWhatsAppNotificationUrl', () => {
    it('construye URL con template por defecto', () => {
      const url = buildWhatsAppNotificationUrl(
        '5491155667788',
        'Mi Burger',
        'Pro',
        '2025-12-31T00:00:00Z',
      )

      expect(url).toContain('https://wa.me/5491155667788')
      expect(url).toContain('Mi%20Burger')
      expect(url).toContain('Pro')
    })

    it('usa template personalizado cuando se provee', () => {
      const url = buildWhatsAppNotificationUrl(
        '5491155667788',
        'Mi Burger',
        'Basico',
        null,
        'Hola {tenantName}! Tu plan {plan} expira pronto.',
      )

      expect(url).toContain('Mi%20Burger')
      expect(url).toContain('B%C3%A1sico') // "Básico" url-encoded
    })

    it('elimina caracteres no numéricos del teléfono', () => {
      const url = buildWhatsAppNotificationUrl(
        '+54 (011) 5566-7788',
        'Test',
        'Basico',
        null,
      )

      // El número debe estar limpio en la URL
      expect(url).toMatch(/wa\.me\/\d+/)
      expect(url).not.toContain('+')
      expect(url).not.toContain(' ')
      expect(url).not.toContain('-')
    })

    it('maneja fecha nula correctamente', () => {
      const url = buildWhatsAppNotificationUrl(
        '5491155667788',
        'Tienda',
        'Basico',
        null,
      )

      expect(url).toContain('fecha%20no%20definida')
    })
  })
})
