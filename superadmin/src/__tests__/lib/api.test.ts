import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminFetch } from '@/lib/api'
import * as authLib from '@/lib/auth'

const makeResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('superadmin adminFetch', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('agrega Authorization header cuando hay token', async () => {
    authLib.saveTokens('super-token-123', 'ref')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, { ok: true })
    )

    await adminFetch('/api/superadmin/tenants')

    const options = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = options.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer super-token-123')
  })

  it('retorna respuesta 200 directamente', async () => {
    authLib.saveTokens('token', 'ref')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, []))

    const res = await adminFetch('/api/superadmin/tenants')
    expect(res.status).toBe(200)
  })

  it('incluye Content-Type json', async () => {
    authLib.saveTokens('token', 'ref')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, {})
    )

    await adminFetch('/api/test')

    const options = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = options.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('en 401 intenta refresh y reintenta', async () => {
    authLib.saveTokens('old-token', 'refresh-token')

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeResponse(401, {}))
      .mockResolvedValueOnce(makeResponse(200, { accessToken: 'new', refreshToken: 'new-ref', expiresIn: 900 }))
      .mockResolvedValueOnce(makeResponse(200, { data: 'ok' }))

    const res = await adminFetch('/api/protected')
    expect(res.status).toBe(200)
  })

  it('en 401 con refresh fallido limpia tokens', async () => {
    authLib.saveTokens('old', 'old-ref')

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeResponse(401, {}))
      .mockResolvedValueOnce(makeResponse(401, {}))

    await adminFetch('/api/protected')

    expect(authLib.getAccessToken()).toBeNull()
  })
})
