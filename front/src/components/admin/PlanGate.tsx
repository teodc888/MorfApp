'use client'

import { usePlan } from '@/contexts/PlanContext'
import { planHasAccess, PLAN_LABEL, PLAN_PRICE, PLAN_LEVEL } from '@/lib/plan'
import type { TenantPlan } from '@/types/store'

type Props = {
  minPlan: TenantPlan
  feature: string
  children: React.ReactNode
}

export function PlanGate({ minPlan, feature, children }: Props) {
  const plan = usePlan()

  if (planHasAccess(plan, minPlan)) return <>{children}</>

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 320, padding: '40px 24px', textAlign: 'center',
      background: 'var(--surface)', borderRadius: 16,
      border: '2px dashed var(--outline-soft)',
    }}>
      <span className="mat fill" style={{ fontSize: 48, color: 'var(--muted)', marginBottom: 16 }}>lock</span>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Disponible en plan {PLAN_LABEL[minPlan]}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 360, margin: '0 0 24px', lineHeight: 1.5 }}>
        La funcionalidad <strong>{feature}</strong> requiere el plan {PLAN_LABEL[minPlan]} o superior.
        Tu plan actual es <strong>{PLAN_LABEL[plan]}</strong>.
      </p>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--surface-container)', borderRadius: 12, padding: '16px 24px',
        marginBottom: 24, minWidth: 220,
      }}>
        {(['Pro', 'Negocio'] as TenantPlan[]).filter(p => PLAN_LEVEL[p] >= PLAN_LEVEL[minPlan]).map(p => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{PLAN_LABEL[p]}</span>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{PLAN_PRICE[p]}</span>
          </div>
        ))}
      </div>
      <a
        href="mailto:hola@morfapp.app?subject=Quiero actualizar mi plan"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 10,
          background: 'var(--primary)', color: 'var(--on-primary)',
          fontWeight: 600, fontSize: 14, textDecoration: 'none',
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span className="mat fill" style={{ fontSize: 18 }}>upgrade</span>
        Actualizar plan
      </a>
    </div>
  )
}
