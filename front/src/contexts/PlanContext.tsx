'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAdminMe } from '@/lib/admin-api'
import { isAuthenticated } from '@/lib/auth'
import type { TenantPlan } from '@/types/store'

const PlanContext = createContext<TenantPlan>('Basico')

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<TenantPlan>('Basico')

  useEffect(() => {
    // Sin sesión (p. ej. en /admin/login) no pedimos el perfil: getAdminMe daría
    // 401 y adminFetch haría window.location.href = '/admin/login', provocando
    // un loop de recarga que impide loguearse.
    if (!isAuthenticated()) return
    getAdminMe().then(me => setPlan(me.plan)).catch(() => {})
  }, [])

  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>
}

export function usePlan(): TenantPlan {
  return useContext(PlanContext)
}
