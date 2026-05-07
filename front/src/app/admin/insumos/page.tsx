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
import { STITCH } from '@/lib/stitch-theme'

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
    <div className="max-w-4xl mx-auto min-h-screen" style={{ backgroundColor: STITCH.bg }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: STITCH.text }}>Insumos</h1>
      </div>

      {error && (
        <p className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>{error}</p>
      )}

          <div className="flex gap-1 mb-6 p-1 w-fit" style={{ backgroundColor: STITCH.surface, borderRadius: STITCH.radius, border: `1px solid ${STITCH.border}` }}>
        {(['insumos', 'compras', 'movimientos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium rounded-full transition-colors capitalize"
            style={{
                backgroundColor: tab === t ? STITCH.primary : 'transparent',
                color: tab === t ? '#FFFFFF' : STITCH.muted,
              }}
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
              className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: '#EF4444', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}
            >
              + Añadir insumo
            </button>
          </div>

          {supplies.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#584237' }}>
              <p className="text-4xl mb-3">📦</p>
              <p>No hay insumos todavía</p>
            </div>
          ) : (
            <div className="overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#FAF9F6', borderBottom: '1px solid #E5E7EB' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Nombre</th>
                    {/* keep simple table cells */}
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Stock</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Proveedor</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                  {supplies.map((s) => (
                    <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#1A1B22' }}>{s.name}</td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{s.unit ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={stockColor(s.currentStock)}>{s.currentStock}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{s.supplierName ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditSupply(s)}
                            className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                            style={{ color: '#584237' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openResetDialog(s.id, s.name)}
                            className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                            style={{ color: '#EF4444' }}
                          >
                            🗑️ Vaciar
                          </button>
                          <button
                            onClick={() => openDeleteDialog(s.id, s.name)}
                            className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                            style={{ color: '#EF4444' }}
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
          <div className="p-6" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#1A1B22' }}>Registrar compra</h2>
            <form onSubmit={savePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Insumo *</label>
                  <select
                    value={purchaseForm.supplyId}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, supplyId: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                  >
                    <option value="">Seleccionar insumo</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Proveedor *</label>
                  <select
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierId: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Cantidad *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Precio total $</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={purchaseForm.totalPrice}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, totalPrice: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                    placeholder="0"
                  />
                </div>
              </div>

              {pricePerUnit && (
                <div className="px-3 py-2 text-sm rounded-lg" style={{ backgroundColor: '#FAF9F6', border: '1px solid #E5E7EB', color: '#1A1B22' }}>
                  Precio por unidad: <span className="font-semibold">${pricePerUnit}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Notas</label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                  placeholder="Notas opcionales"
                />
              </div>

              <button
                type="submit"
                disabled={purchaseSaving || !purchaseForm.supplyId || !purchaseForm.supplierId || !purchaseForm.quantity || !purchaseForm.totalPrice || !pricePerUnit}
                className="px-6 py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: '#EF4444' }}
              >
                {purchaseSaving ? 'Registrando...' : 'Registrar compra'}
              </button>
            </form>
          </div>

          {purchases.length > 0 && (
            <div className="overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
              <h2 className="font-semibold px-4 py-3 border-b" style={{ color: '#1A1B22', borderColor: '#E5E7EB' }}>Historial de compras</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#FAF9F6', borderBottom: '1px solid #E5E7EB' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Proveedor</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Cantidad</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Total</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Precio/u</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                  {purchases.map((p) => (
                    <tr key={p.id} className="transition-colors" style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#1A1B22' }}>{p.supplyName}</td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{p.supplierName ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#1A1B22' }}>{p.quantityPurchased}</td>
                      <td className="px-4 py-3" style={{ color: '#1A1B22' }}>${p.totalPrice.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>${p.pricePerUnit.toFixed(2)}</td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{formatDate(p.purchaseDate)}</td>
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
            <div className="text-center py-16" style={{ color: '#584237' }}>
              <p className="text-4xl mb-3">📊</p>
              <p>No hay movimientos todavía</p>
            </div>
          ) : (
            <div className="overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#FAF9F6', borderBottom: '1px solid #E5E7EB' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Insumo</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Cambio</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Motivo</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#1A1B22' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                  {movements.map((m) => (
                    <tr key={m.id} className="transition-colors" style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#1A1B22' }}>{m.supplyName}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: m.quantityChange >= 0 ? '#22C55E' : '#EF4444' }}>
                          {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{REASON_LABELS[m.reason] ?? m.reason}</td>
                      <td className="px-4 py-3" style={{ color: '#584237' }}>{formatDate(m.createdAt)}</td>
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
          <div className="w-full max-w-md p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-bold" style={{ color: '#1A1B22' }}>
              {supplyModal.editing ? 'Editar insumo' : 'Nuevo insumo'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Nombre *</label>
                <input
                  type="text"
                  value={supplyForm.name}
                  onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                  placeholder="Nombre del insumo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Unidad</label>
                <div className="space-y-2">
                  <select
                    value={supplyForm.unit}
                    onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
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
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
                    placeholder="Escribir unidad personalizada"
                  />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1B22' }}>Proveedor</label>
                <select
                  value={supplyForm.supplierId}
                  onChange={(e) => setSupplyForm((f) => ({ ...f, supplierId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ border: '1px solid #E5E7EB', color: '#1A1B22' }}
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
                className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ border: '1px solid #E5E7EB', color: '#584237' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveSupply}
                disabled={supplySaving || !supplyForm.name.trim()}
                className="flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: '#EF4444' }}
              >
                {supplySaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
            <h2 className="font-bold text-lg" style={{ color: '#1A1B22' }}>
              {confirmDialog.type === 'delete' ? '¿Eliminar insumo?' : '¿Vaciar stock?'}
            </h2>
            <p style={{ color: '#584237' }}>
              {confirmDialog.type === 'delete'
                ? `Estás a punto de eliminar el insumo "${confirmDialog.name}". Esta acción no se puede deshacer.`
                : `Estás a punto de vaciar el stock de "${confirmDialog.name}". El stock quedarán en 0.`}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog({ open: false, type: 'delete', id: '', name: '' })}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ border: '1px solid #E5E7EB', color: '#584237' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: '#EF4444' }}
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
