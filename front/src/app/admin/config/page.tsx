'use client'

import { useState, useEffect } from 'react'
import { getAdminMe, updateAdminMe, updateDelivery, updateHours, updatePayment } from '@/lib/admin-api'
import type { BusinessHour, PaymentConfig } from '@/types/store'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

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

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tenantName, setTenantName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [localSaving, setLocalSaving] = useState(false)
  const [localSaved, setLocalSaved] = useState(false)

  const [delivery, setDelivery] = useState<DeliveryForm>(DEFAULT_DELIVERY)
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [deliverySaved, setDeliverySaved] = useState(false)

  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS)
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  const [payment, setPayment] = useState<PaymentConfig>({
    deliveryCash: true,
    deliveryTransfer: true,
    deliveryCard: true,
    pickupCash: true,
    pickupTransfer: true,
    pickupCard: true,
  })
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentSaved, setPaymentSaved] = useState(false)

  useEffect(() => {
    getAdminMe()
      .then((tenant) => {
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

        if (tenant.payment) {
          setPayment(tenant.payment)
        }
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [])

  async function saveLocal() {
    setLocalSaving(true)
    setError(null)
    try {
      await updateAdminMe({ name: tenantName, whatsappNumber })
      setLocalSaved(true)
    } catch {
      setError('Error al guardar los datos del local')
    } finally {
      setLocalSaving(false)
    }
  }

  async function saveDelivery() {
    setDeliverySaving(true)
    setError(null)
    try {
      await updateDelivery({
        mode: delivery.mode.charAt(0).toUpperCase() + delivery.mode.slice(1),
        deliveryCost: delivery.deliveryCost ? parseFloat(delivery.deliveryCost) : null,
        freeDeliveryFrom: delivery.freeDeliveryFrom ? parseFloat(delivery.freeDeliveryFrom) : null,
        minOrderAmount: delivery.minOrderAmount ? parseFloat(delivery.minOrderAmount) : null,
        estimatedMinutes: delivery.estimatedMinutes || null,
        pickupAddress: delivery.pickupAddress || null,
      })
      setDeliverySaved(true)
    } catch {
      setError('Error al guardar delivery')
    } finally {
      setDeliverySaving(false)
    }
  }

  async function saveHours() {
    setHoursSaving(true)
    setError(null)
    try {
      await updateHours(hours)
      setHoursSaved(true)
    } catch {
      setError('Error al guardar horarios')
    } finally {
      setHoursSaving(false)
    }
  }

  async function savePayment() {
    setPaymentSaving(true)
    setError(null)
    try {
      await updatePayment(payment)
      setPaymentSaved(true)
    } catch {
      setError('Error al guardar medios de pago')
    } finally {
      setPaymentSaving(false)
    }
  }

  function updateHour<K extends keyof BusinessHour>(index: number, key: K, value: BusinessHour[K]) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [key]: value } : h)))
    setHoursSaved(false)
  }

  function setDel<K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) {
    setDelivery((f) => ({ ...f, [key]: value }))
    setDeliverySaved(false)
  }

  function togglePayment<K extends keyof PaymentConfig>(key: K) {
    setPayment((p) => ({ ...p, [key]: !p[key] }))
    setPaymentSaved(false)
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const showPickup = delivery.mode === 'pickup' || delivery.mode === 'both'
  const showDeliveryCosts = delivery.mode === 'delivery' || delivery.mode === 'both'

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Ajustes</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', fontWeight: 700 }}>Configuración</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>Datos del local, modo de venta, horarios y zonas de envío.</p>
      </div>

      {error && (
        <div style={{ padding: '0 22px 12px' }}>
          <div className="card" style={{ padding: 10, background: 'rgba(186,26,26,0.06)', border: '1px solid var(--error)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>{error}</div>
        </div>
      )}

      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mi local */}
        <Section title="Mi local">
          <div className="field">
            <label>Nombre del local</label>
            <input className="input" value={tenantName} onChange={(e) => { setTenantName(e.target.value); setLocalSaved(false) }} />
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <input className="input" value={whatsappNumber} onChange={(e) => { setWhatsappNumber(e.target.value.replace(/\D/g, '')); setLocalSaved(false) }} placeholder="5491155443322" style={{ fontFamily: 'ui-monospace, monospace' }} />
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
            <div style={{ display: 'flex', gap: 6 }}>
              {(['delivery', 'pickup', 'both'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDel('mode', m)}
                  style={{
                    flex: 1,
                    padding: '7px 13px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: delivery.mode === m ? 'var(--text)' : 'var(--surface-container)',
                    color: delivery.mode === m ? 'white' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {m === 'delivery' ? 'Delivery' : m === 'pickup' ? 'Retiro' : 'Ambos'}
                </button>
              ))}
            </div>
          </div>

          {showDeliveryCosts && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

        <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 0', background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
          <button className="btn btn-primary btn-block" disabled={localSaving && deliverySaving && hoursSaving} onClick={() => { saveLocal(); saveDelivery(); saveHours() }}>
            Guardar configuración
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
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
