import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
  getTenantFromToken,
  isSuperadmin,
  getPlanFromToken,
  isPlanPro,
} from '@/lib/auth'

// JWT mínimo: header.payload.signature — el payload es base64url de un JSON
const makeJwt = (payload: Record<string, unknown>) => {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${body}.fakesig`
}

describe('auth lib', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── saveTokens / getAccessToken / getRefreshToken ──────────────────────────

  it('saveTokens almacena ambos tokens', () => {
    saveTokens('access-abc', 'refresh-xyz')
    expect(getAccessToken()).toBe('access-abc')
    expect(getRefreshToken()).toBe('refresh-xyz')
  })

  it('getAccessToken retorna null si no hay token', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('getRefreshToken retorna null si no hay token', () => {
    expect(getRefreshToken()).toBeNull()
  })

  // ── clearTokens ────────────────────────────────────────────────────────────

  it('clearTokens elimina ambos tokens', () => {
    saveTokens('access-abc', 'refresh-xyz')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  // ── isAuthenticated ────────────────────────────────────────────────────────

  it('isAuthenticated retorna false sin token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated retorna true con token', () => {
    saveTokens('any-token', 'any-refresh')
    expect(isAuthenticated()).toBe(true)
  })

  // ── getTenantFromToken ─────────────────────────────────────────────────────

  it('getTenantFromToken extrae tenant_slug del JWT', () => {
    const token = makeJwt({ tenant_slug: 'mi-burger', sub: 'user-1' })
    saveTokens(token, 'r')
    expect(getTenantFromToken()).toBe('mi-burger')
  })

  it('getTenantFromToken retorna null si no hay token', () => {
    expect(getTenantFromToken()).toBeNull()
  })

  it('getTenantFromToken retorna null si el payload no tiene tenant_slug', () => {
    const token = makeJwt({ sub: 'user-1' })
    saveTokens(token, 'r')
    expect(getTenantFromToken()).toBeNull()
  })

  it('getTenantFromToken retorna null si el JWT es inválido', () => {
    saveTokens('not-a-jwt', 'r')
    expect(getTenantFromToken()).toBeNull()
  })

  // ── isSuperadmin ───────────────────────────────────────────────────────────

  it('isSuperadmin retorna true cuando is_superadmin es "true" string', () => {
    const token = makeJwt({ is_superadmin: 'true' })
    saveTokens(token, 'r')
    expect(isSuperadmin()).toBe(true)
  })

  it('isSuperadmin retorna true cuando is_superadmin es boolean true', () => {
    const token = makeJwt({ is_superadmin: true })
    saveTokens(token, 'r')
    expect(isSuperadmin()).toBe(true)
  })

  it('isSuperadmin retorna false cuando is_superadmin es "false"', () => {
    const token = makeJwt({ is_superadmin: 'false' })
    saveTokens(token, 'r')
    expect(isSuperadmin()).toBe(false)
  })

  it('isSuperadmin retorna false sin token', () => {
    expect(isSuperadmin()).toBe(false)
  })

  // ── getPlanFromToken ───────────────────────────────────────────────────────

  it('getPlanFromToken extrae tenant_plan del JWT', () => {
    const token = makeJwt({ tenant_plan: 'Pro' })
    saveTokens(token, 'r')
    expect(getPlanFromToken()).toBe('Pro')
  })

  it('getPlanFromToken retorna null si no hay plan', () => {
    const token = makeJwt({ sub: 'user-1' })
    saveTokens(token, 'r')
    expect(getPlanFromToken()).toBeNull()
  })

  it('getPlanFromToken retorna null sin token', () => {
    expect(getPlanFromToken()).toBeNull()
  })

  // ── isPlanPro ──────────────────────────────────────────────────────────────

  it('isPlanPro retorna true para plan Pro', () => {
    const token = makeJwt({ tenant_plan: 'Pro' })
    saveTokens(token, 'r')
    expect(isPlanPro()).toBe(true)
  })

  it('isPlanPro retorna true para plan Negocio', () => {
    const token = makeJwt({ tenant_plan: 'Negocio' })
    saveTokens(token, 'r')
    expect(isPlanPro()).toBe(true)
  })

  it('isPlanPro retorna false para plan Basico', () => {
    const token = makeJwt({ tenant_plan: 'Basico' })
    saveTokens(token, 'r')
    expect(isPlanPro()).toBe(false)
  })

  it('isPlanPro retorna false sin token', () => {
    expect(isPlanPro()).toBe(false)
  })
})
