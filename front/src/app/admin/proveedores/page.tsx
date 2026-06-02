'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlanGate } from '@/components/admin/PlanGate'
import {
  getSuppliers,
  getInactiveSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  getSupplierDebtDetail,
  paySupplierPurchasePartial,
  paySupplierPurchaseFull,
  paySupplierAllDebt,
} from '@/lib/admin-api'
import type { SupplierDebtDetailDto, SupplierDebtPurchaseDto, SupplierDto } from '@/types/store'

type SupplierForm = { name: string; phone: string; address: string; notes: string }
type ConfirmDialog = { open: boolean; id: string; name: string; totalDebt: number }
type PaymentForm = { purchase: SupplierDebtPurchaseDto; amount: string; notes: string }

const EMPTY_FORM: SupplierForm = { name: '', phone: '', address: '', notes: '' }

function ProveedoresPageInner() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; editing: SupplierDto | null }>({ open: false, editing: null })
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, id: '', name: '', totalDebt: 0 })
  const [debtModal, setDebtModal] = useState<{ open: boolean; loading: boolean; detail: SupplierDebtDetailDto | null }>({ open: false, loading: false, detail: null })
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null)
  const [paying, setPaying] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [inactiveSuppliers, setInactiveSuppliers] = useState<SupplierDto[]>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [active, inactive] = await Promise.all([getSuppliers(), getInactiveSuppliers()])
      setSuppliers(active)
      setInactiveSuppliers(inactive)
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
      setConfirmDialog({ open: false, id: '', name: '', totalDebt: 0 })
      await load()
    } catch {
      setError('Error al eliminar proveedor')
    }
  }

  async function handleRestore(id: string) {
    setRestoringId(id)
    try {
      await restoreSupplier(id)
      await load()
    } catch {
      setError('Error al reactivar proveedor')
    } finally {
      setRestoringId(null)
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
    return (
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const totalDebt = suppliers.reduce((sum, s) => sum + s.totalDebt, 0)
  const withDebt = suppliers.filter(s => s.totalDebt > 0).length

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          RED DE COMPRAS
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Proveedores
          </h1>
          <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginTop: 4 }}>
            <span className="mat sm">add</span> Nuevo
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          Contactos, deudas y registros de compra.
        </p>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Deuda total
            </div>
            <div className="serif" style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--primary-dark)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
              marginTop: 6,
            }}>
              {formatMoney(totalDebt)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {withDebt} {withDebt === 1 ? 'proveedor' : 'proveedores'} con saldo
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--outline-soft)', paddingLeft: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Activos
            </div>
            <div className="serif" style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginTop: 6,
            }}>
              {suppliers.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>contactos cargados</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error && (
          <div style={{ padding: '12px 14px', background: 'var(--error-bg)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 22px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No hay proveedores todavía</div>
            <p style={{ fontSize: 13, margin: 0 }}>Crea uno para empezar a registrar compras</p>
          </div>
        ) : (
          suppliers.map((s) => (
            <button
              key={s.id}
              className="card tap"
              onClick={() => openDebtDetail(s)}
              style={{
                padding: 14,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: 'none',
                background: 'var(--surface)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: 'var(--surface-container-high)',
                  color: 'var(--primary-dark)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--serif)',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {s.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  {s.name}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>
                  {s.phone || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="serif" style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: s.totalDebt > 0 ? 'var(--error)' : 'var(--success)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMoney(s.totalDebt)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {s.totalDebt > 0 ? 'deuda' : 'al día'}
                </div>
              </div>
            </button>
          ))
        )}

        {/* Toggle dados de baja */}
        {inactiveSuppliers.length > 0 && (
          <button
            onClick={() => setShowInactive((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 4px',
              fontSize: 13,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 16 }}>{showInactive ? '▲' : '▼'}</span>
            {showInactive ? 'Ocultar' : `Ver dados de baja (${inactiveSuppliers.length})`}
          </button>
        )}

        {/* Lista de inactivos */}
        {showInactive && inactiveSuppliers.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: 0.6,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: 'var(--surface-container)',
                color: 'var(--muted)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--serif)',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {s.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)', textDecoration: 'line-through' }}>
                {s.name}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>Dado de baja</div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              disabled={restoringId === s.id}
              onClick={() => handleRestore(s.id)}
            >
              {restoringId === s.id ? '...' : 'Reactivar'}
            </button>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {modal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setModal({ open: false, editing: null })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                {modal.editing ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nombre del proveedor <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: La Huerta Orgánica"
                  disabled={!modal.editing}
                />
              </div>
              <div className="field">
                <label>Teléfono / WhatsApp</label>
                <input
                  className="input"
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+54 911 ..."
                />
              </div>
              <div className="field">
                <label>Dirección</label>
                <input
                  className="input"
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Calle, número, ciudad"
                />
              </div>
              <div className="field">
                <label>Notas</label>
                <textarea
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas adicionales"
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--outline-soft)' }}>
              <button
                className="btn btn-outline"
                onClick={() => setModal({ open: false, editing: null })}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !form.name.trim()}
                style={{
                  flex: 1,
                  opacity: saving || !form.name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? 'Guardando...' : modal.editing ? 'Guardar cambios' : 'Crear proveedor'}
              </button>
            </div>

            {modal.editing && (
              <button
                className="btn btn-danger btn-block"
                onClick={() => {
                  setConfirmDialog({ open: true, id: modal.editing!.id, name: modal.editing!.name, totalDebt: modal.editing!.totalDebt })
                  setModal({ open: false, editing: null })
                }}
                style={{ marginTop: 12 }}
              >
                <span className="mat sm">delete</span> Dar de baja proveedor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Debt Detail Modal */}
      {debtModal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setDebtModal({ open: false, loading: false, detail: null })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <h2 className="serif" style={{ margin: 0, fontSize: 22, color: 'var(--primary-dark)', marginBottom: 4 }}>
                  Detalle de deuda
                </h2>
                {debtModal.detail && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    {debtModal.detail.supplierName} · Deuda actual:{' '}
                    <span style={{ color: debtModal.detail.totalDebt > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                      {formatMoney(debtModal.detail.totalDebt)}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setDebtModal({ open: false, loading: false, detail: null })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 20,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {debtModal.loading || !debtModal.detail ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>Cargando...</div>
            ) : (
              <>
                {debtModal.detail.totalDebt > 0 && (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={payAllDebt}
                    disabled={paying}
                    style={{ marginBottom: 16, opacity: paying ? 0.5 : 1 }}
                  >
                    Pagar toda la deuda
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {debtModal.detail.purchases.map((purchase) => (
                    <div key={purchase.purchaseId} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{purchase.supplyName || 'Compra'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatDate(purchase.purchaseDate)}</div>
                        </div>
                        <span
                          className="chip"
                          style={{
                            background:
                              purchase.status === 'paid'
                                ? 'var(--success)'
                                : purchase.status === 'partial'
                                ? 'var(--warning)'
                                : 'var(--error)',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {purchase.status === 'paid' ? 'Pagado' : purchase.status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Total</div>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{formatMoney(purchase.totalPrice)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Pagado</div>
                          <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatMoney(purchase.paidAmount)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Pendiente</div>
                          <div style={{ fontWeight: 600, color: purchase.pendingAmount > 0 ? 'var(--error)' : 'var(--success)' }}>
                            {formatMoney(purchase.pendingAmount)}
                          </div>
                        </div>
                      </div>

                      {purchase.pendingAmount > 0 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setPaymentForm({ purchase, amount: '', notes: '' })}
                            style={{ flex: 1 }}
                          >
                            Pago parcial
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => payPurchaseFull(purchase)}
                            disabled={paying}
                            style={{ flex: 1, opacity: paying ? 0.5 : 1 }}
                          >
                            Pagar completo
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {debtModal.detail.payments.length > 0 && (
                  <div>
                    <h3 className="serif" style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text)', fontWeight: 600 }}>
                      Historial de pagos
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {debtModal.detail.payments.map((payment) => (
                        <div key={payment.id} className="card" style={{ padding: 12, background: 'var(--surface-container)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 4 }}>
                            {formatMoney(payment.amount)} · {formatDate(payment.paidAt)}
                          </div>
                          {payment.notes && <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--muted)' }}>{payment.notes}</p>}
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                            Aplicado a: {payment.allocations.map((a) => `${a.supplyName || 'compra'} (${formatMoney(a.amount)})`).join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--outline-soft)' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDebtModal({ open: false, loading: false, detail: null })
                  if (debtModal.detail) openEdit(suppliers.find((s) => s.id === debtModal.detail!.supplierId)!)
                }}
                style={{ flex: 1 }}
              >
                <span className="mat sm">edit</span> Editar
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setDebtModal({ open: false, loading: false, detail: null })}
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      {paymentForm && (
        <div className="modal-backdrop modal-center" onClick={() => setPaymentForm(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                Pago parcial
              </h2>
              <button onClick={() => setPaymentForm(null)} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Pendiente de {paymentForm.purchase.supplyName}</div>
                <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                  {formatMoney(paymentForm.purchase.pendingAmount)}
                </div>
              </div>

              <div className="field">
                <label>Monto a pagar</label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  max={paymentForm.purchase.pendingAmount}
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => (f ? { ...f, amount: e.target.value } : f))}
                  placeholder="Monto"
                />
              </div>

              {partialPaymentError && (
                <div style={{ padding: '10px 12px', background: 'var(--error-bg)', borderRadius: 8, fontSize: 12, color: 'var(--error)' }}>
                  {partialPaymentError}
                </div>
              )}

              <div className="field">
                <label>Notas (opcional)</label>
                <textarea
                  className="input"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                  placeholder="Notas adicionales"
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--outline-soft)' }}>
              <button
                className="btn btn-outline"
                onClick={() => setPaymentForm(null)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={submitPartialPayment}
                disabled={paying || !paymentForm.amount || !!partialPaymentError}
                style={{
                  flex: 1,
                  opacity: paying || !paymentForm.amount || !!partialPaymentError ? 0.5 : 1,
                }}
              >
                Pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDialog.open && (
        <div className="modal-backdrop modal-center" onClick={() => setConfirmDialog({ open: false, id: '', name: '', totalDebt: 0 })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <h2 className="serif" style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--error)' }}>
              ⚠️ ¿Dar de baja proveedor?
            </h2>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text)' }}>&quot;{confirmDialog.name}&quot;</strong> y todos sus insumos asociados dejarán de aparecer en pantalla.
            </p>
            {confirmDialog.totalDebt > 0 && (
              <div style={{
                background: 'rgba(186,26,26,0.07)',
                border: '1px solid var(--error)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--error)',
                marginBottom: 10,
                lineHeight: 1.4,
              }}>
                Este proveedor tiene deuda pendiente de <strong>{formatMoney(confirmDialog.totalDebt)}</strong>. Podés reactivarlo luego para saldarla.
              </div>
            )}
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted)' }}>
              Podés reactivarlo en cualquier momento desde la lista.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline"
                onClick={() => setConfirmDialog({ open: false, id: '', name: '', totalDebt: 0 })}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                style={{ flex: 1 }}
              >
                Dar de baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProveedoresPage() {
  return (
    <PlanGate minPlan="Pro" feature="Proveedores">
      <ProveedoresPageInner />
    </PlanGate>
  )
}
