import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminFetch, login, forgotPassword, resetPassword, exportOrders, exportMetrics } from '@/lib/admin-api'
import * as auth from '@/lib/auth'

// Helper: response factory
const makeResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Helper: respuesta de tipo CSV, como la devolvería el backend
const makeCsvResponse = (status: number, filename?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'text/csv' }
  if (filename) headers['Content-Disposition'] = `attachment; filename=${filename}`
  return new Response(status === 200 ? 'col1;col2\nval1;val2' : JSON.stringify({ message: 'error' }), {
    status,
    headers,
  })
}

describe('adminFetch', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Resetear estado interno del módulo (isRefreshing, refreshQueue)
    // Se hace importando de nuevo el módulo en cada test
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('agrega Authorization header cuando hay token', async () => {
    auth.saveTokens('my-access-token', 'my-refresh-token')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, { ok: true })
    )

    await adminFetch('/api/test')

    const callArgs = fetchSpy.mock.calls[0]
    const options  = callArgs[1] as RequestInit
    const headers  = options.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-access-token')
  })

  it('no agrega Authorization header si no hay token', async () => {
    // Sin tokens
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, { ok: true })
    )

    await adminFetch('/api/test')

    const callArgs = fetchSpy.mock.calls[0]
    const options  = callArgs[1] as RequestInit
    const headers  = options.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  it('retorna la respuesta directamente si el status no es 401', async () => {
    auth.saveTokens('token', 'refresh')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, { data: 'ok' }))

    const res = await adminFetch('/api/test')
    expect(res.status).toBe(200)
  })

  it('retorna 404 sin intentar refresh', async () => {
    auth.saveTokens('token', 'refresh')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(404, { message: 'Not found' }))

    const res = await adminFetch('/api/test')
    expect(res.status).toBe(404)
  })

  it('en 401 intenta refresh y reintenta el request original con nuevo token', async () => {
    auth.saveTokens('old-token', 'refresh-token')

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(200, { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 900 }))
      .mockResolvedValueOnce(makeResponse(200, { data: 'retried' }))

    const res = await adminFetch('/api/protected')

    expect(fetchSpy).toHaveBeenCalledTimes(3) // 401 + refresh + retry
    expect(res.status).toBe(200)
  })

  it('en 401 con refresh fallido retorna la respuesta 401 original', async () => {
    auth.saveTokens('old-token', 'refresh-token')

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(makeResponse(401, { message: 'Refresh invalid' }))

    const res = await adminFetch('/api/protected')

    expect(res.status).toBe(401)
    // Los tokens deben haberse limpiado
    expect(auth.getAccessToken()).toBeNull()
  })

  it('en 401 sin refresh token no intenta refresh', async () => {
    // Sin tokens en localStorage
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeResponse(401, { message: 'Unauthorized' }))

    await adminFetch('/api/protected')

    // Solo 1 llamada — no se intentó refresh
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna tokens en respuesta exitosa', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, { accessToken: 'acc', refreshToken: 'ref', expiresIn: 900 })
    )

    const result = await login('admin@test.com', 'password123')
    expect(result.accessToken).toBe('acc')
    expect(result.refreshToken).toBe('ref')
    expect(result.expiresIn).toBe(900)
  })

  it('lanza error en respuesta 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(401, { message: 'Credenciales inválidas' })
    )

    await expect(login('bad@test.com', 'wrong')).rejects.toThrow('401')
  })

  it('lanza error en respuesta 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(500, { message: 'Internal server error' })
    )

    await expect(login('a@a.com', 'p')).rejects.toThrow('500')
  })

  it('envía email y password en el body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(200, { accessToken: 'a', refreshToken: 'r', expiresIn: 900 })
    )

    await login('user@test.com', 'mypassword')

    const callArgs = fetchSpy.mock.calls[0]
    const options  = callArgs[1] as RequestInit
    const body     = JSON.parse(options.body as string)
    expect(body.email).toBe('user@test.com')
    expect(body.password).toBe('mypassword')
  })
})

describe('forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resuelve sin error en respuesta 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, {}))

    await expect(forgotPassword('user@test.com')).resolves.toBeUndefined()
  })

  it('lanza error en respuesta 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(500, { message: 'Internal server error' })
    )

    await expect(forgotPassword('user@test.com')).rejects.toThrow('500')
  })

  it('envía email en el body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, {}))

    await forgotPassword('user@test.com')

    const callArgs = fetchSpy.mock.calls[0]
    const options  = callArgs[1] as RequestInit
    const body     = JSON.parse(options.body as string)
    expect(body.email).toBe('user@test.com')
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resuelve sin error en respuesta 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, {}))

    await expect(resetPassword('valid-token', 'newpassword123')).resolves.toBeUndefined()
  })

  it('lanza error en respuesta 400 (token inválido/vencido)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeResponse(400, { message: 'Token inválido o vencido' })
    )

    await expect(resetPassword('bad-token', 'newpassword123')).rejects.toThrow('400')
  })

  it('envía token y newPassword en el body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(200, {}))

    await resetPassword('my-token', 'mynewpassword')

    const callArgs = fetchSpy.mock.calls[0]
    const options  = callArgs[1] as RequestInit
    const body     = JSON.parse(options.body as string)
    expect(body.token).toBe('my-token')
    expect(body.newPassword).toBe('mynewpassword')
  })
})

describe('exportOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // jsdom no implementa createObjectURL/revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('llama al endpoint sin query params cuando no se pasan filtros', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeCsvResponse(200, 'pedidos.csv')
    )

    await exportOrders()

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/admin/orders/export')
    expect(calledUrl.endsWith('/api/admin/orders/export')).toBe(true)
  })

  it('arma la query string con status, from y to', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeCsvResponse(200, 'pedidos.csv')
    )

    await exportOrders({ status: 'confirmed', from: '2026-01-01', to: '2026-01-31' })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('status=confirmed')
    expect(calledUrl).toContain('from=2026-01-01')
    expect(calledUrl).toContain('to=2026-01-31')
  })

  it('arma la query string solo con los params presentes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeCsvResponse(200, 'pedidos.csv')
    )

    await exportOrders({ status: 'pending' })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('status=pending')
    expect(calledUrl).not.toContain('from=')
    expect(calledUrl).not.toContain('to=')
  })

  it('tira error si la respuesta no es ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeCsvResponse(500))

    await expect(exportOrders()).rejects.toThrow('500')
  })

  it('dispara la descarga del blob sin tirar excepción', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeCsvResponse(200, 'pedidos.csv'))

    await expect(exportOrders()).resolves.toBeUndefined()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
  })
})

describe('exportMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('llama al endpoint sin query params cuando no se pasan filtros', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeCsvResponse(200, 'metricas.csv')
    )

    await exportMetrics()

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl.endsWith('/api/admin/metrics/export')).toBe(true)
  })

  it('arma la query string con from y to', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeCsvResponse(200, 'metricas.csv')
    )

    await exportMetrics({ from: '2026-01-01', to: '2026-01-31' })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('from=2026-01-01')
    expect(calledUrl).toContain('to=2026-01-31')
  })

  it('tira error si la respuesta no es ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeCsvResponse(404))

    await expect(exportMetrics()).rejects.toThrow('404')
  })
})
