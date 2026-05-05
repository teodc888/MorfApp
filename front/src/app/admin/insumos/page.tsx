'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getSupplies,
  getSuppliers,
  getSupplyPurchases,
  getSupplyMovements,
  createSupply,
  updateSupply,
  deleteSupply,
  resetSupplyStock,
  createSupplyPurchase,
} from '@/lib/admin-api'
import type { SupplyDto, SupplierDto, SupplyPurchaseDto, InventoryMovementDto } from '@/types/store'

type Tab = 'insumos' | 'compras' | 'movimientos'

type SupplyForm = {
  name: string
  unit: string
  supplierId: string
}

const EMPTY_SUPPLY_FORM: SupplyForm = { name: '', unit: '', supplierId: '' }

const UNIT_OPTIONS = ['kg', 'g', 'litros', 'ml', 'unidades', 'porciones']
const CUSTOM_UNIT_VALUE = '__custom__'

type ConfirmDialog = { open: boolean; type: 'delete' | 'reset'; id: string; name: string }

type PurchaseForm = {
  supplyId: string
  supplierId: string
  quantity: string
  totalPrice: string
  notes: string
}

const EMPTY_PURCHASE_FORM: PurchaseForm = { supplyId: '', supplierId: '', quantity: '', totalPrice: '', notes: '' }

const REASON_LABELS: Record<string, string> = {
  Purchase: 'Compra',
  OrderDeducted: 'Pedido confirmado',
  ManualReset: 'Vaciado manual',
  ManualAdjust: 'Ajuste manual',
}

export default function InsumosPage() {
  const [tab, setTab] = useState<Tab>('insumos')

  const [supplies, setSupplies] = useState<SupplyDto[]>([])
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([])
  const [purchases, setPurchases] = useState<SupplyPurchaseDto[]>([])
  const [movements, setMovements] = useState<InventoryMovementDto[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [supplyModal, setSupplyModal] = useState<{ open: boolean; editing: SupplyDto | null }>({ open: false, editing: null })
  const [supplyForm, setSupplyForm] = useState<SupplyForm>(EMPTY_SUPPLY_FORM)
  const [customUnit, setCustomUnit] = useState('')
  const [supplySaving, setSupplySaving] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, type: 'delete', id: '', name: '' })

  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(EMPTY_PURCHASE_FORM)
  const [purchaseSaving, setPurchaseSaving] = useState(false)

  const [movementsLoading, setMovementsLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [suppliesData, suppliersData, purchasesData] = await Promise.all([
        getSupplies(),
        getSuppliers(),
        getSupplyPurchases(),
      ])
      setSupplies(suppliesData)
      setSuppliers(suppliersData)
      setPurchases(purchasesData)
    } catch {
      setError('No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const loadMovements = useCallback(async () => {
    if (tab !== 'movimientos') return
    setMovementsLoading(true)
    try {
      const allMovements: InventoryMovementDto[] = []
      for (const supply of supplies) {
        const m = await getSupplyMovements(supply.id)
        allMovements.push(...m)
      }
      allMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setMovements(allMovements)
    } catch {
      setError('Error al cargar movimientos')
    } finally {
      setMovementsLoading(false)
    }
  }, [tab, supplies])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovements()
  }, [loadMovements])

  function openNewSupply() {
    setSupplyForm(EMPTY_SUPPLY_FORM)
    setCustomUnit('')
    setSupplyModal({ open: true, editing: null })
  }

  function openEditSupply(s: SupplyDto) {
    const isCustomUnit = !!s.unit && !UNIT_OPTIONS.includes(s.unit)
    setSupplyForm({ name: s.name, unit: isCustomUnit ? CUSTOM_UNIT_VALUE : (s.unit ?? ''), supplierId: s.supplierId ?? '' })
    setCustomUnit(isCustomUnit ? s.unit ?? '' : '')
    setSupplyModal({ open: true, editing: s })
  }

  async function saveSupply() {
    setSupplySaving(true)
    try {
      const data = {
        name: supplyForm.name,
        unit: supplyForm.unit === CUSTOM_UNIT_VALUE ? (customUnit.trim() || undefined) : (supplyForm.unit || undefined),
        supplierId: supplyForm.supplierId || undefined,
      }
      if (supplyModal.editing) {
        await updateSupply(supplyModal.editing.id, data)
      } else {
        await createSupply(data)
      }
      setSupplyModal({ open: false, editing: null })
      await load()
    } catch {
      setError('Error al guardar insumo')
    } finally {
      setSupplySaving(false)
    }
  }

  function openDeleteDialog(id: string, name: string) {
    setConfirmDialog({ open: true, type: 'delete', id, name })
  }

  function openResetDialog(id: string, name: string) {
    setConfirmDialog({ open: true, type: 'reset', id, name })
  }

  async function confirmAction() {
    try {
      if (confirmDialog.type === 'delete') {
        await deleteSupply(confirmDialog.id)
      } else {
        await resetSupplyStock(confirmDialog.id)
      }
      setConfirmDialog({ open: false, type: 'delete', id: '', name: '' })
      await load()
    } catch {
      setError(confirmDialog.type === 'delete' ? 'Error al eliminar insumo' : 'Error al vaciar stock')
    }
  }

  async function savePurchase(e: React.FormEvent) {
    e.preventDefault()
    const quantityPurchased = parseFloat(purchaseForm.quantity)
    const totalPrice = parseFloat(purchaseForm.totalPrice)

    if (!Number.isFinite(quantityPurchased) || quantityPurchased <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      setError('El precio total debe ser mayor a 0')
      return
    }

    setPurchaseSaving(true)
    try {
      await createSupplyPurchase({
        supplyId: purchaseForm.supplyId,
        supplierId: purchaseForm.supplierId,
        quantityPurchased,
        totalPrice,
        notes: purchaseForm.notes || undefined,
      })
      setPurchaseForm(EMPTY_PURCHASE_FORM)
      await load()
    } catch {
      setError('Error al registrar compra')
    } finally {
      setPurchaseSaving(false)
    }
  }

  const purchaseQuantity = parseFloat(purchaseForm.quantity)
  const purchaseTotalPrice = parseFloat(purchaseForm.totalPrice)
  const pricePerUnit =
    Number.isFinite(purchaseQuantity) && purchaseQuantity > 0 && Number.isFinite(purchaseTotalPrice) && purchaseTotalPrice > 0
      ? (purchaseTotalPrice / purchaseQuantity).toFixed(2)
      : null

  function stockColor(stock: number) {
    if (stock <= 0) return 'text-red-600 font-semibold'
    if (stock < 5) return 'text-yellow-600 font-semibold'
    return 'text-green-600 font-semibold'
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Insumos</h1>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['insumos', 'compras', 'movimientos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'insumos' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={openNewSupply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Añadir insumo
            </button>
          </div>

          {supplies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p>No hay insumos todavía</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Unidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Stock</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Proveedor</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplies.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{s.unit ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={stockColor(s.currentStock)}>{s.currentStock}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.supplierName ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditSupply(s)}
                            className="text-xs px-2 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openResetDialog(s.id, s.name)}
                            className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            🗑️ Vaciar
                          </button>
                          <button
                            onClick={() => openDeleteDialog(s.id, s.name)}
                            className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'compras' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Registrar compra</h2>
            <form onSubmit={savePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insumo *</label>
                  <select
                    value={purchaseForm.supplyId}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, supplyId: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar insumo</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierId: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio total $</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchaseForm.totalPrice}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, totalPrice: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {pricePerUnit && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                  Precio por unidad: <span className="font-semibold">${pricePerUnit}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas opcionales"
                />
              </div>

              <button
                type="submit"
                disabled={purchaseSaving || !purchaseForm.supplyId || !purchaseForm.supplierId || !purchaseForm.quantity || !purchaseForm.totalPrice || !pricePerUnit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {purchaseSaving ? 'Registrando...' : 'Registrar compra'}
              </button>
            </form>
          </div>

          {purchases.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <h2 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-200">Historial de compras</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Insumo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Proveedor</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Cantidad</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Precio/u</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.supplyName}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.supplierName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{p.quantityPurchased}</td>
                      <td className="px-4 py-3 text-gray-700">${p.totalPrice.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">${p.pricePerUnit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(p.purchaseDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'movimientos' && (
        <>
          {movementsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📊</p>
              <p>No hay movimientos todavía</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Insumo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Cambio</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Motivo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{m.supplyName}</td>
                      <td className="px-4 py-3">
                        <span className={m.quantityChange >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{REASON_LABELS[m.reason] ?? m.reason}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {supplyModal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">
              {supplyModal.editing ? 'Editar insumo' : 'Nuevo insumo'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={supplyForm.name}
                  onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del insumo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <div className="space-y-2">
                  <select
                    value={supplyForm.unit}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin unidad</option>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                    <option value={CUSTOM_UNIT_VALUE}>Otro</option>
                  </select>
                  {supplyForm.unit === CUSTOM_UNIT_VALUE && (
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribir unidad personalizada"
                  />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select
                  value={supplyForm.supplierId}
                  onChange={(e) => setSupplyForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSupplyModal({ open: false, editing: null })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveSupply}
                disabled={supplySaving || !supplyForm.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {supplySaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">
              {confirmDialog.type === 'delete' ? '¿Eliminar insumo?' : '¿Vaciar stock?'}
            </h2>
            <p className="text-gray-600">
              {confirmDialog.type === 'delete'
                ? `Estás a punto de eliminar el insumo "${confirmDialog.name}". Esta acción no se puede deshacer.`
                : `Estás a punto de vaciar el stock de "${confirmDialog.name}". El stock quedará en 0.`}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog({ open: false, type: 'delete', id: '', name: '' })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {confirmDialog.type === 'delete' ? 'Eliminar' : 'Vaciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
