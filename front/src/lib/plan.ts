import type { TenantPlan } from '@/types/store'

export const PLAN_LEVEL: Record<TenantPlan, number> = {
  Basico: 1,
  Pro: 2,
  Negocio: 3,
}

export const PLAN_LABEL: Record<TenantPlan, string> = {
  Basico: 'Básico',
  Pro: 'Pro',
  Negocio: 'Negocio',
}

export const PLAN_PRICE: Record<TenantPlan, string> = {
  Basico: '$25.000 / mes',
  Pro: '$45.000 / mes',
  Negocio: '$60.000 / mes',
}

export function planHasAccess(current: TenantPlan, required: TenantPlan): boolean {
  return PLAN_LEVEL[current] >= PLAN_LEVEL[required]
}

// Feature → plan mínimo requerido
export const FEATURE_PLAN: Record<string, TenantPlan> = {
  metrics: 'Pro',
  insumos: 'Pro',
  proveedores: 'Pro',
  empleados: 'Negocio',
}
