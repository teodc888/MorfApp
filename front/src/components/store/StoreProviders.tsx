'use client'

import { createContext, useContext, useEffect } from 'react'
import type { TenantPublic } from '@/types/store'
import { applyTenantTheme } from '@/lib/utils'

const TenantContext = createContext<TenantPublic | null>(null)

export function useTenant(): TenantPublic {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside StoreProviders')
  return ctx
}

export function StoreProviders({
  tenant,
  children,
}: {
  tenant: TenantPublic
  children: React.ReactNode
}) {
  useEffect(() => {
    applyTenantTheme(tenant.branding)
  }, [tenant.branding])

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}
