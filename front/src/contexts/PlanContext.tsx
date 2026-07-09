'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAdminMe } from '@/lib/admin-api'
import type { TenantPlan } from '@/types/store'

const PlanContext = createContext<TenantPlan>('Basico')

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<TenantPlan>('Basico')

  useEffect(() => {
    getAdminMe().then(me => setPlan(me.plan)).catch(() => {})
  }, [])

  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>
}

export function usePlan(): TenantPlan {
  return useContext(PlanContext)
}
