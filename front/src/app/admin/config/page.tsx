'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminMe, updateAdminMe, updateDelivery, updateHours, updateMarketing, changePassword } from '@/lib/admin-api'
import type { BusinessHour, MarketingConfig } from '@/types/store'

type DeliveryForm = {
  mode: 'delivery' | 'pickup' | 'both'
  deliveryCost: string
  freeDeliveryFrom: string
  minOrderAmount: string
  estimatedMinutes: string
  pickupAddress: string
}

const DEFAULT_DELIVERY: DeliveryForm = {
  mode: 'delivery',
  deliveryCost: '',
  freeDeliveryFrom: '',
  minOrderAmount: '',
  estimatedMinutes: '',
  pickupAddress: '',
}

const DEFAULT_HOURS: BusinessHour[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5,
  opensAt: '09:00',
  closesAt: '22:00',
}))

const DEFAULT_MARKETING: MarketingConfig = {
  metaPixelId: '',
  metaPixelEnabled: false,
  googleAnalyticsId: '',
  googleAnalyticsEnabled: false,
}

export default function ConfigPage() {
  const queryClient = useQueryClient()

  const [tenantName, setTenantName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')

  const [delivery, setDelivery] = useState<DeliveryForm>(DEFAULT_DELIVERY)

  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS)

  const [marketing, setMarketing] = useState<MarketingConfig>(DEFAULT_MARKETING)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: getAdminMe,
  })

  useEffect(() => {
    if (!tenant) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTenantName(tenant.name)
    setWhatsappNumber(tenant.whatsappNumber ?? '')

    const d = tenant.delivery
    if (d) {
      setDelivery({
        mode: (d.mode?.toLowerCase() ?? 'delivery') as 'delivery' | 'pickup' | 'both',
        deliveryCost: d.deliveryCost != null ? String(d.deliveryCost) : '',
        freeDeliveryFrom: d.freeDeliveryFrom != null ? String(d.freeDeliveryFrom) : '',
        minOrderAmount: d.minOrderAmount != null ? String(d.minOrderAmount) : '',
        estimatedMinutes: d.estimatedMinutes ?? '',
        pickupAddress: d.pickupAddress ?? '',
      })
    }

    if (tenant.hours?.length > 0) {
      const filled = Array.from({ length: 7 }, (_, i) => {
        const found = tenant.hours.find((h) => h.dayOfWeek === i)
        return found ?? { dayOfWeek: i, isOpen: false, opensAt: '09:00', closesAt: '22:00' }
      })
      setHours(filled)
    }

    if (tenant.marketing) {
      setMarketing({
        metaPixelId: tenant.marketing.metaPixelId ?? '',
        metaPixelEnabled: tenant.marketing.metaPixelEnabled,
        googleAnalyticsId: tenant.marketing.googleAnalyticsId ?? '',
        googleAnalyticsEnabled: tenant.marketing.googleAnalyticsEnabled,
      })
    }
  }, [tenant])

  const localMutation = useMutation({
    mutationFn: () => updateAdminMe({ name: tenantName, whatsappNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
      toast.success('Guardado correctamente')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const deliveryMutation = useMutation({
    mutationFn: () =>
      updateDelivery({
        mode: delivery.mode.charAt(0).toUpperCase() + delivery.mode.slice(1),
        deliveryCost: delivery.deliveryCost ? parseFloat(delivery.deliveryCost) : null,
        freeDeliveryFrom: delivery.freeDeliveryFrom ? parseFloat(delivery.freeDeliveryFrom) : null,
        minOrderAmount: delivery.minOrderAmount ? parseFloat(delivery.minOrderAmount) : null,
        estimatedMinutes: delivery.estimatedMinutes || null,
        pickupAddress: delivery.pickupAddress || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
      toast.success('Guardado correctamente')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const hoursMutation = useMutation({
    mutationFn: () => updateHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
      toast.success('Guardado correctamente')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const marketingMutation = useMutation({
    mutationFn: () =>
      updateMarketing({
        metaPixelId: marketing.metaPixelId?.trim() || null,
        metaPixelEnabled: marketing.metaPixelEnabled,
        googleAnalyticsId: marketing.googleAnalyticsId?.trim() || null,
        googleAnalyticsEnabled: marketing.googleAnalyticsEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
      toast.success('Guardado correctamente')
    },
    onError: () => toast.error('Error al guardar'),
  })

  function saveLocal() {
    localMutation.mutate()
  }

  function saveDelivery() {
    deliveryMutation.mutate()
  }

  function saveHours() {
    hoursMutation.mutate()
  }

  function saveMarketing() {
    if (marketing.metaPixelEnabled && !marketing.metaPixelId?.trim()) {
      toast.error('Ingresá el ID de Meta Pixel para poder activarlo')
      return
    }
    if (marketing.googleAnalyticsEnabled && !marketing.googleAnalyticsId?.trim()) {
      toast.error('Ingresá el ID de Google Analytics para poder activarlo')
      return
    }
    marketingMutation.mutate()
  }

  const localSaving = localMutation.isPending
  const deliverySaving = deliveryMutation.isPending
  const hoursSaving = hoursMutation.isPending
  const marketingSaving = marketingMutation.isPending

  async function savePassword() {
    if (!currentPassword) {
      toast.error('Ingresá tu contraseña actual')
      return
    }
    if (newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setPasswordSaving(false)
    }
  }

  function updateHour<K extends keyof BusinessHour>(index: number, key: K, value: BusinessHour[K]) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [key]: value } : h)))
  }

  function setDel<K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) {
    setDelivery((f) => ({ ...f, [key]: value }))
  }

  function setMkt<K extends keyof MarketingConfig>(key: K, value: MarketingConfig[K]) {
    setMarketing((f) => ({ ...f, [key]: value }))
  }

  if (isLoading) {
    return (
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const showPickup = delivery.mode === 'pickup' || delivery.mode === 'both'
  const showDeliveryCosts = delivery.mode === 'delivery' || delivery.mode === 'both'

  return (
    <div style={{ fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Ajustes</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', fontWeight: 700 }}>Configuración</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>Datos del local, modo de venta, horarios y zonas de envío.</p>
      </div>

      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mi local */}
        <Section title="Mi local">
          <div className="field">
            <label>Nombre del local</label>
            <input className="input" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <input className="input" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))} placeholder="5491155443322" style={{ fontFamily: 'ui-monospace, monospace' }} />
            <div className="text-xs muted">Código de país sin espacios ni guiones.</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={localSaving} onClick={saveLocal}>
            {localSaving ? 'Guardando...' : 'Guardar local'}
          </button>
        </Section>

        {/* Modo de venta */}
        <Section title="Modo de venta">
          <div className="field">
            <label>Modo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(['delivery', 'pickup', 'both'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDel('mode', m)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 80,
                    padding: '9px 13px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: delivery.mode === m ? 'var(--text)' : 'var(--surface-container)',
                    color: delivery.mode === m ? 'white' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m === 'delivery' ? 'Delivery' : m === 'pickup' ? 'Retiro' : 'Ambos'}
                </button>
              ))}
            </div>
          </div>

          {showDeliveryCosts && (
            <div className="grid-2col">
              <div className="field">
                <label>Costo de envío</label>
                <input className="input" type="number" value={delivery.deliveryCost} onChange={(e) => setDel('deliveryCost', e.target.value)} />
              </div>
              <div className="field">
                <label>Gratis desde</label>
                <input className="input" type="number" value={delivery.freeDeliveryFrom} onChange={(e) => setDel('freeDeliveryFrom', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid-2col">
            <div className="field">
              <label>Pedido mínimo</label>
              <input className="input" type="number" value={delivery.minOrderAmount} onChange={(e) => setDel('minOrderAmount', e.target.value)} />
            </div>
            <div className="field">
              <label>Tiempo estimado <span className="muted" style={{ fontWeight: 400 }}>· min</span></label>
              <input className="input" value={delivery.estimatedMinutes} onChange={(e) => setDel('estimatedMinutes', e.target.value)} placeholder="35-50" />
            </div>
          </div>

          {showPickup && (
            <div className="field">
              <label>Dirección de retiro</label>
              <input className="input" value={delivery.pickupAddress} onChange={(e) => setDel('pickupAddress', e.target.value)} />
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={deliverySaving} onClick={saveDelivery}>
            {deliverySaving ? 'Guardando...' : 'Guardar modo de venta'}
          </button>
        </Section>

        {/* Horarios */}
        <Section title="Horarios">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hours.map((h, i) => (
              <div key={h.dayOfWeek} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                background: !h.isOpen ? 'var(--surface-container)' : 'transparent',
                border: '1px solid var(--outline-soft)',
              }}>
                <div style={{
                  width: 38, height: 32, borderRadius: 8,
                  background: !h.isOpen ? 'transparent' : 'var(--surface-container)',
                  color: !h.isOpen ? 'var(--muted-soft)' : 'var(--primary-dark)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--serif)',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {h.dayOfWeek === 0 ? 'Do' : h.dayOfWeek === 1 ? 'Lu' : h.dayOfWeek === 2 ? 'Ma' : h.dayOfWeek === 3 ? 'Mi' : h.dayOfWeek === 4 ? 'Ju' : h.dayOfWeek === 5 ? 'Vi' : 'Sa'}
                </div>
                {!h.isOpen ? (
                  <div className="text-sm muted" style={{ flex: 1, fontStyle: 'italic' }}>Cerrado</div>
                ) : (
                  <>
                    <input className="input" style={{ flex: 1, padding: '8px 10px', fontVariantNumeric: 'tabular-nums', fontSize: 13 }} value={h.opensAt ?? '09:00'} onChange={(e) => updateHour(i, 'opensAt', e.target.value)} />
                    <span className="muted text-xs">a</span>
                    <input className="input" style={{ flex: 1, padding: '8px 10px', fontVariantNumeric: 'tabular-nums', fontSize: 13 }} value={h.closesAt ?? '22:00'} onChange={(e) => updateHour(i, 'closesAt', e.target.value)} />
                  </>
                )}
                <button style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: h.isOpen ? 'transparent' : 'var(--surface-container-high)',
                  color: 'var(--muted)',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                }} onClick={() => updateHour(i, 'isOpen', !h.isOpen)}>
                  {h.isOpen ? '✓' : '⊘'}
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block" disabled={hoursSaving} onClick={saveHours}>
            {hoursSaving ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </Section>

        {/* Marketing */}
        <Section title="Marketing">
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ margin: 0 }}>Meta Pixel (Facebook / Instagram)</label>
              <ToggleSwitch checked={marketing.metaPixelEnabled} onChange={(v) => setMkt('metaPixelEnabled', v)} />
            </div>
            <input
              className="input"
              value={marketing.metaPixelId ?? ''}
              onChange={(e) => setMkt('metaPixelId', e.target.value)}
              placeholder="123456789012345"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
            <div className="text-xs muted">El ID del píxel, disponible en el Administrador de eventos de Meta. Se carga en la tienda solo si está activado.</div>
          </div>

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ margin: 0 }}>Google Analytics (GA4)</label>
              <ToggleSwitch checked={marketing.googleAnalyticsEnabled} onChange={(v) => setMkt('googleAnalyticsEnabled', v)} />
            </div>
            <input
              className="input"
              value={marketing.googleAnalyticsId ?? ''}
              onChange={(e) => setMkt('googleAnalyticsId', e.target.value)}
              placeholder="G-XXXXXXXXXX"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
            <div className="text-xs muted">El ID de medición de tu propiedad GA4. Se carga en la tienda solo si está activado.</div>
          </div>

          <button className="btn btn-primary btn-block" disabled={marketingSaving} onClick={saveMarketing}>
            {marketingSaving ? 'Guardando...' : 'Guardar marketing'}
          </button>
        </Section>

        {/* Cuenta */}
        <Section title="Cuenta">
          <div className="field">
            <label>Contraseña actual</label>
            <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Nueva contraseña</label>
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="text-xs muted">Mínimo 8 caracteres. Al cambiarla, otras sesiones activas se cerrarán.</div>
          </div>
          <div className="field">
            <label>Confirmar nueva contraseña</label>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" disabled={passwordSaving} onClick={savePassword}>
            {passwordSaving ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </Section>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 3,
        background: checked ? 'var(--primary)' : 'var(--surface-container-high)',
        transition: 'background 0.2s ease',
      }}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'white',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}
