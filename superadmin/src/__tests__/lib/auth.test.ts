import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
  getTenantFromToken,
  isSuperadmin,
} from '@/lib/auth'

const makeJwt = (payload: Record<string, unknown>) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${body}.fakesig`
}

describe('superadmin auth lib', () => {
  beforeEach(() => localStorage.clear())

  it('saveTokens almacena y recupera tokens', () => {
    saveTokens('acc-123', 'ref-456')
    expect(getAccessToken()).toBe('acc-123')
    expect(getRefreshToken()).toBe('ref-456')
  })

  it('clearTokens elimina todos los tokens', () => {
    saveTokens('acc', 'ref')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('isAuthenticated retorna false sin token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated retorna true con token guardado', () => {
    saveTokens('any-token', 'ref')
    expect(isAuthenticated()).toBe(true)
  })

  it('getTenantFromToken extrae tenant_slug', () => {
    saveTokens(makeJwt({ tenant_slug: 'burger-king' }), 'r')
    expect(getTenantFromToken()).toBe('burger-king')
  })

  it('getTenantFromToken retorna null sin token', () => {
    expect(getTenantFromToken()).toBeNull()
  })

  it('getTenantFromToken retorna null para JWT malformado', () => {
    saveTokens('bad-jwt', 'r')
    expect(getTenantFromToken()).toBeNull()
  })

  it('isSuperadmin retorna true con claim is_superadmin=true', () => {
    saveTokens(makeJwt({ is_superadmin: 'true' }), 'r')
    expect(isSuperadmin()).toBe(true)
  })

  it('isSuperadmin retorna true con boolean true', () => {
    saveTokens(makeJwt({ is_superadmin: true }), 'r')
    expect(isSuperadmin()).toBe(true)
  })

  it('isSuperadmin retorna false para usuario normal', () => {
    saveTokens(makeJwt({ is_superadmin: 'false' }), 'r')
    expect(isSuperadmin()).toBe(false)
  })

  it('isSuperadmin retorna false sin token', () => {
    expect(isSuperadmin()).toBe(false)
  })
})
