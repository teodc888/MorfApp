'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierDebtDetail,
  paySupplierPurchasePartial,
  paySupplierPurchaseFull,
  paySupplierAllDebt,
} from '@/lib/admin-api'
import type { SupplierDebtDetailDto, SupplierDebtPurchaseDto, SupplierDto } from '@/types/store'
import { STITCH } from '@/lib/stitch-theme'

type SupplierForm = { name: string; phone: string; address: string; notes: string }
type ConfirmDialog = { open: boolean; id: string; name: string }
type PaymentForm = { purchase: SupplierDebtPurchaseDto; amount: string; notes: string }

const EMPTY_FORM: SupplierForm = { name: '', phone: '', address: '', notes: '' }

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; editing: SupplierDto | null }>({ open: false, editing: null })
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, id: '', name: '' })
  const [debtModal, setDebtModal] = useState<{ open: boolean; loading: boolean; detail: SupplierDebtDetailDto | null }>({ open: false, loading: false, detail: null })
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setSuppliers(await getSuppliers())
    } catch {
      setError('No se pudieron cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openNew() {
    setForm(EMPTY_FORM)
    setModal({ open: true, editing: null })
  }

  function openEdit(s: SupplierDto) {
    setForm({ name: s.name, phone: s.phone ?? '', address: s.address ?? '', notes: s.notes ?? '' })
    setModal({ open: true, editing: s })
  }

  async function save() {
    setSaving(true)
    try {
      const data = { name: form.name, phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined }
      if (modal.editing) await updateSupplier(modal.editing.id, data)
      else await createSupplier(data)
      setModal({ open: false, editing: null })
      await load()
    } catch {
      setError('Error al guardar proveedor')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    try {
      await deleteSupplier(confirmDialog.id)
      setConfirmDialog({ open: false, id: '', name: '' })
      await load()
    } catch {
      setError('Error al eliminar proveedor')
    }
  }

  async function openDebtDetail(supplier: SupplierDto) {
    setDebtModal({ open: true, loading: true, detail: null })
    try {
      setDebtModal({ open: true, loading: false, detail: await getSupplierDebtDetail(supplier.id) })
    } catch {
      setDebtModal({ open: false, loading: false, detail: null })
      setError('No se pudo cargar el detalle de deuda')
    }
  }

  async function refreshDebtDetail(detail: SupplierDebtDetailDto) {
    setDebtModal({ open: true, loading: false, detail: await getSupplierDebtDetail(detail.supplierId) })
    await load()
  }

  async function payPurchaseFull(purchase: SupplierDebtPurchaseDto) {
    if (!debtModal.detail) return
    setPaying(true)
    try {
      await paySupplierPurchaseFull(debtModal.detail.supplierId, purchase.purchaseId)
      await refreshDebtDetail(debtModal.detail)
    } catch {
      setError('Error al pagar la compra')
    } finally {
      setPaying(false)
    }
  }

  async function payAllDebt() {
    if (!debtModal.detail) return
    setPaying(true)
    try {
      await paySupplierAllDebt(debtModal.detail.supplierId)
      await refreshDebtDetail(debtModal.detail)
    } catch {
      setError('Error al pagar toda la deuda')
    } finally {
      setPaying(false)
    }
  }

  async function submitPartialPayment() {
    if (!debtModal.detail || !paymentForm) return
    const amount = Number(paymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > paymentForm.purchase.pendingAmount) return

    setPaying(true)
    try {
      await paySupplierPurchasePartial(debtModal.detail.supplierId, paymentForm.purchase.purchaseId, { amount, notes: paymentForm.notes || undefined })
      setPaymentForm(null)
      await refreshDebtDetail(debtModal.detail)
    } catch {
      setError('Error al registrar el pago parcial')
    } finally {
      setPaying(false)
    }
  }

  function formatMoney(amount: number) {
    return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function statusClass(status: SupplierDebtPurchaseDto['status']) {
    if (status === 'paid') return '#22C55E'
    if (status === 'partial') return '#F97316'
    return '#EF4444'
  }

  function statusLabel(status: SupplierDebtPurchaseDto['status']) {
    if (status === 'paid') return 'Pagado'
    if (status === 'partial') return 'Parcial'
    return 'Pendiente'
  }

  const DS = { bg: STITCH.bg, surface: STITCH.surface, primary: STITCH.primary, secondary: STITCH.secondary, tertiary: STITCH.tertiary, text: STITCH.text, textMuted: STITCH.muted, border: STITCH.border, radius: STITCH.radius }

  const partialPaymentAmount = paymentForm ? Number(paymentForm.amount) : 0
  const partialPaymentError = paymentForm && paymentForm.amount
    ? !Number.isFinite(partialPaymentAmount)
      ? 'Ingresá un monto válido.'
      : partialPaymentAmount <= 0
      ? 'El monto debe ser mayor a $0.'
      : partialPaymentAmount > paymentForm.purchase.pendingAmount
        ? `El monto no puede superar la deuda pendiente (${formatMoney(paymentForm.purchase.pendingAmount)}).`
        : null
    : null

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: DS.primary, borderTopColor: 'transparent' }} /></div>
  }

  return (
    <div className="max-w-5xl mx-auto" style={{ backgroundColor: DS.bg, minHeight: '100vh', padding: '24px' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: DS.text }}>Proveedores</h1>
        <button onClick={openNew} className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: DS.primary, borderRadius: DS.radius }}>+ Añadir proveedor</button>
      </div>

      {error && <p className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

      {suppliers.length === 0 ? (
        <div className="text-center py-16" style={{ color: DS.textMuted }}><p className="text-4xl mb-3">🏭</p><p>No hay proveedores todavía</p></div>
      ) : (
        <div className="overflow-hidden" style={{ backgroundColor: DS.surface, border: `1px solid ${DS.border}`, borderRadius: DS.radius, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FAFAFA' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: DS.text }}>Nombre</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: DS.text }}>Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: DS.text }}>Dirección</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: DS.text }}>Deuda total</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: DS.text }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="transition-colors" style={{ borderTop: `1px solid ${DS.border}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: DS.text }}>{s.name}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMuted }}>{s.phone ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: DS.textMuted }}>{s.address ?? '—'}</td>
                  <td className="px-4 py-3"><span style={{ color: s.totalDebt > 0 ? DS.primary : DS.secondary, fontWeight: 500 }}>{formatMoney(s.totalDebt)}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => openDebtDetail(s)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: DS.primary, border: `1px solid ${DS.primary}`, backgroundColor: 'transparent' }}>👁️ Ver deuda</button>
                      <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: DS.textMuted, border: '1px solid #D1D5DB', backgroundColor: 'transparent' }}>✏️ Editar</button>
                      <button onClick={() => setConfirmDialog({ open: true, id: s.id, name: s.name })} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: DS.primary, backgroundColor: '#FEE2E2' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md p-6 space-y-4" style={{ backgroundColor: DS.surface, borderRadius: DS.radius, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-bold" style={{ color: DS.text }}>{modal.editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Nombre del proveedor" />
              <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Teléfono" />
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Dirección" />
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Notas adicionales" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ open: false, editing: null })} className="flex-1 py-2.5 text-sm font-medium transition-colors" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.textMuted }}>Cancelar</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 text-white text-sm font-medium transition-colors" style={{ backgroundColor: DS.primary, borderRadius: '12px', opacity: saving || !form.name.trim() ? 0.5 : 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {debtModal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pb-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5" style={{ backgroundColor: DS.surface, borderRadius: DS.radius, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg" style={{ color: DS.text }}>Detalle de deuda</h2>
                {debtModal.detail && <p className="text-sm" style={{ color: DS.textMuted }}>{debtModal.detail.supplierName} · Deuda actual: <span style={{ color: debtModal.detail.totalDebt > 0 ? DS.primary : DS.secondary, fontWeight: 600 }}>{formatMoney(debtModal.detail.totalDebt)}</span></p>}
              </div>
              <button onClick={() => setDebtModal({ open: false, loading: false, detail: null })} style={{ color: DS.textMuted }}>✕</button>
            </div>

            {debtModal.loading || !debtModal.detail ? (
              <div className="py-12 text-center" style={{ color: DS.textMuted }}>Cargando...</div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button onClick={payAllDebt} disabled={paying || debtModal.detail.totalDebt <= 0} className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: DS.secondary, borderRadius: DS.radius, opacity: paying || debtModal.detail.totalDebt <= 0 ? 0.5 : 1 }}>Pagar toda la deuda del proveedor</button>
                </div>
                <div className="space-y-3">
                  {debtModal.detail.purchases.map((purchase) => (
                    <div key={purchase.purchaseId} className="p-4 space-y-3" style={{ border: `1px solid ${DS.border}`, borderRadius: DS.radius }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium" style={{ color: DS.text }}>{purchase.supplyName || 'Compra'}</p>
                          <p className="text-xs" style={{ color: DS.textMuted }}>{formatDate(purchase.purchaseDate)}</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full" style={{ border: `1px solid ${statusClass(purchase.status)}`, color: statusClass(purchase.status) }}>{statusLabel(purchase.status)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <p><span className="block" style={{ color: DS.textMuted }}>Total</span>{formatMoney(purchase.totalPrice)}</p>
                        <p><span className="block" style={{ color: DS.textMuted }}>Pagado</span>{formatMoney(purchase.paidAmount)}</p>
                        <p><span className="block" style={{ color: DS.textMuted }}>Pendiente</span>{formatMoney(purchase.pendingAmount)}</p>
                      </div>
                      {purchase.pendingAmount > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setPaymentForm({ purchase, amount: '', notes: '' })} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: DS.primary, backgroundColor: '#FEE2E2' }}>Pago parcial</button>
                          <button onClick={() => payPurchaseFull(purchase)} disabled={paying} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: DS.secondary, backgroundColor: '#DCFCE7' }}>Pagar esta deuda completa</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {debtModal.detail.payments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: DS.text }}>Historial de pagos</h3>
                    <div className="space-y-2">
                      {debtModal.detail.payments.map((payment) => (
                        <div key={payment.id} className="text-sm px-3 py-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px' }}>
                          <p className="font-medium" style={{ color: DS.text }}>{formatMoney(payment.amount)} · {formatDate(payment.paidAt)}</p>
                          {payment.notes && <p style={{ color: DS.textMuted }}>{payment.notes}</p>}
                          <p className="text-xs" style={{ color: DS.textMuted }}>Aplicado a: {payment.allocations.map((a) => `${a.supplyName || 'compra'} (${formatMoney(a.amount)})`).join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {paymentForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: DS.surface, borderRadius: DS.radius, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-bold" style={{ color: DS.text }}>Pago parcial</h2>
            <p className="text-sm" style={{ color: DS.textMuted }}>Pendiente de {paymentForm.purchase.supplyName}: {formatMoney(paymentForm.purchase.pendingAmount)}</p>
            <input type="number" min="0.01" max={paymentForm.purchase.pendingAmount} step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => f ? { ...f, amount: e.target.value } : f)} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Monto" />
            {partialPaymentError && <p className="text-sm" style={{ color: DS.primary }}>{partialPaymentError}</p>}
            <input type="text" value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => f ? { ...f, notes: e.target.value } : f)} className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.text }} placeholder="Notas opcionales" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPaymentForm(null)} className="flex-1 py-2.5 text-sm font-medium" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.textMuted }}>Cancelar</button>
              <button onClick={submitPartialPayment} disabled={paying || !paymentForm.amount || !!partialPaymentError} className="flex-1 py-2.5 text-white text-sm font-medium" style={{ backgroundColor: DS.primary, borderRadius: '12px', opacity: paying || !paymentForm.amount || !!partialPaymentError ? 0.5 : 1 }}>Pagar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: DS.surface, borderRadius: DS.radius, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-bold text-lg" style={{ color: DS.text }}>¿Eliminar proveedor?</h2>
            <p style={{ color: DS.textMuted }}>Estás a punto de eliminar el proveedor &quot;{confirmDialog.name}&quot;. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDialog({ open: false, id: '', name: '' })} className="flex-1 py-2.5 text-sm font-medium" style={{ border: `1px solid ${DS.border}`, borderRadius: '12px', color: DS.textMuted }}>Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: DS.primary, borderRadius: '12px' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
