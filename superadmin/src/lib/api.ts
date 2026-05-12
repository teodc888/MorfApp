import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500'

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
  let newToken: string | null = null
  try {
    newToken = await attemptRefresh()
  } catch {
    clearTokens()
  } finally {
    isRefreshing = false
    refreshQueue.forEach((cb) => cb(newToken))
    refreshQueue = []
  }

  if (!newToken) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
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
