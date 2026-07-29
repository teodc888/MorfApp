const ACCESS_TOKEN_KEY = 'morf_access_token'
const REFRESH_TOKEN_KEY = 'morf_refresh_token'

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

export function getTenantFromToken(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenant_slug || null
  } catch {
    return null
  }
}

export function isSuperadmin(): boolean {
  const token = getAccessToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_superadmin === 'true' || payload.is_superadmin === true
  } catch {
    return false
  }
}

/** Retorna el plan del tenant del token: 'Basico' | 'Pro' | 'Negocio' | null */
export function getPlanFromToken(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenant_plan || null
  } catch {
    return null
  }
}

/** Verifica si el plan permite acceso a features PRO (Pro o Negocio) */
export function isPlanPro(): boolean {
  const plan = getPlanFromToken()
  return plan === 'Pro' || plan === 'Negocio'
}

export function getRole(): 'owner' | 'employee' {
  const token = getAccessToken()
  if (!token) return 'employee'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role === 'owner' ? 'owner' : 'employee'
  } catch {
    return 'employee'
  }
}

export function isOwner(): boolean {
  return getRole() === 'owner'
}

export function getPermissions(): string[] {
  const token = getAccessToken()
  if (!token) return []
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.perm) return []
    return Array.isArray(payload.perm) ? payload.perm : [payload.perm]
  } catch {
    return []
  }
}

export function hasPermission(key: string): boolean {
  return isOwner() || getPermissions().includes(key)
}
