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
    if (status === 'paid') return 'bg-green-50 text-green-700 border-green-200'
    if (status === 'partial') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  function statusLabel(status: SupplierDebtPurchaseDto['status']) {
    if (status === 'paid') return 'Pagado'
    if (status === 'partial') return 'Parcial'
    return 'Pendiente'
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
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Proveedores</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">+ Añadir proveedor</button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {suppliers.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">🏭</p><p>No hay proveedores todavía</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Dirección</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Deuda total</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.address ?? '—'}</td>
                  <td className="px-4 py-3"><span className={s.totalDebt > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{formatMoney(s.totalDebt)}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => openDebtDetail(s)} className="text-xs px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">👁️ Ver deuda</button>
                      <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">✏️ Editar</button>
                      <button onClick={() => setConfirmDialog({ open: true, id: s.id, name: s.name })} className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">{modal.editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre del proveedor" />
              <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Teléfono" />
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dirección" />
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Notas adicionales" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ open: false, editing: null })} className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {debtModal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Detalle de deuda</h2>
                {debtModal.detail && <p className="text-sm text-gray-500">{debtModal.detail.supplierName} · Deuda actual: <span className={debtModal.detail.totalDebt > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>{formatMoney(debtModal.detail.totalDebt)}</span></p>}
              </div>
              <button onClick={() => setDebtModal({ open: false, loading: false, detail: null })} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {debtModal.loading || !debtModal.detail ? (
              <div className="py-12 text-center text-gray-400">Cargando...</div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button onClick={payAllDebt} disabled={paying || debtModal.detail.totalDebt <= 0} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg">Pagar toda la deuda del proveedor</button>
                </div>
                <div className="space-y-3">
                  {debtModal.detail.purchases.map((purchase) => (
                    <div key={purchase.purchaseId} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{purchase.supplyName || 'Compra'}</p>
                          <p className="text-xs text-gray-500">{formatDate(purchase.purchaseDate)}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 border rounded-full ${statusClass(purchase.status)}`}>{statusLabel(purchase.status)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <p><span className="block text-gray-400">Total</span>{formatMoney(purchase.totalPrice)}</p>
                        <p><span className="block text-gray-400">Pagado</span>{formatMoney(purchase.paidAmount)}</p>
                        <p><span className="block text-gray-400">Pendiente</span>{formatMoney(purchase.pendingAmount)}</p>
                      </div>
                      {purchase.pendingAmount > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setPaymentForm({ purchase, amount: '', notes: '' })} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Pago parcial</button>
                          <button onClick={() => payPurchaseFull(purchase)} disabled={paying} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg">Pagar esta deuda completa</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {debtModal.detail.payments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Historial de pagos</h3>
                    <div className="space-y-2">
                      {debtModal.detail.payments.map((payment) => (
                        <div key={payment.id} className="text-sm border border-gray-100 rounded-lg px-3 py-2">
                          <p className="font-medium text-gray-800">{formatMoney(payment.amount)} · {formatDate(payment.paidAt)}</p>
                          {payment.notes && <p className="text-gray-500">{payment.notes}</p>}
                          <p className="text-xs text-gray-400">Aplicado a: {payment.allocations.map((a) => `${a.supplyName || 'compra'} (${formatMoney(a.amount)})`).join(', ')}</p>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Pago parcial</h2>
            <p className="text-sm text-gray-500">Pendiente de {paymentForm.purchase.supplyName}: {formatMoney(paymentForm.purchase.pendingAmount)}</p>
            <input type="number" min="0.01" max={paymentForm.purchase.pendingAmount} step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => f ? { ...f, amount: e.target.value } : f)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Monto" />
            {partialPaymentError && <p className="text-sm text-red-600">{partialPaymentError}</p>}
            <input type="text" value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => f ? { ...f, notes: e.target.value } : f)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Notas opcionales" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPaymentForm(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={submitPartialPayment} disabled={paying || !paymentForm.amount || !!partialPaymentError} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg">Pagar</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">¿Eliminar proveedor?</h2>
            <p className="text-gray-600">Estás a punto de eliminar el proveedor &quot;{confirmDialog.name}&quot;. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDialog({ open: false, id: '', name: '' })} className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
