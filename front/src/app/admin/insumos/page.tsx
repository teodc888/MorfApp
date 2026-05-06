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
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const lowStockCount = supplies.filter(s => s.currentStock > 0 && s.currentStock < 5).length
  const outOfStockCount = supplies.filter(s => s.currentStock <= 0).length

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Stock & Compras</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>Insumos</h1>
          <button className="btn btn-primary btn-sm" onClick={openNewSupply} style={{ flexShrink: 0 }}>
            Nuevo
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0 22px 12px' }}>
          <div className="card" style={{ padding: 10, background: 'rgba(186,26,26,0.06)', border: '1px solid var(--error)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>{error}</div>
        </div>
      )}

      <div style={{ padding: '0 22px 16px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="text-xs muted" style={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Stock Total</div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginTop: 6, lineHeight: 1 }}>{supplies.length}</div>
          <div className="text-xs muted" style={{ marginTop: 6 }}>insumos activos</div>
        </div>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', fontSize: 18, fontWeight: 700 }}>⚠</div>
            <div>
              <div className="text-lg fw-700" style={{ color: 'var(--warning)', lineHeight: 1 }}>{lowStockCount}</div>
              <div className="text-xs muted">Stock bajo</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', fontSize: 18, fontWeight: 700 }}>✕</div>
            <div>
              <div className="text-lg fw-700" style={{ color: 'var(--error)', lineHeight: 1 }}>{outOfStockCount}</div>
              <div className="text-xs muted">Sin stock</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {(['insumos', 'compras', 'movimientos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 13px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: tab === t ? 'var(--text)' : 'var(--surface-container)',
                color: tab === t ? 'white' : 'var(--muted)',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'insumos' && (
        <>
          <div style={{ padding: '0 22px 12px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="Buscar insumo..."
              />
            </div>
          </div>

          <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {supplies.length === 0 ? (
              <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                <div className="text-sm">No hay insumos todavía</div>
              </div>
            ) : (
              supplies.map((s) => (
                <button
                  key={s.id}
                  className="card tap"
                  onClick={() => openEditSupply(s)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    border: 'none',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{s.name}</div>
                      <div className="text-xs muted" style={{ marginTop: 4 }}>{s.supplierName || '—'}</div>
                    </div>
                    <span className="chip" style={{
                      background: s.currentStock <= 0 ? 'var(--error-bg)' : s.currentStock < 5 ? 'var(--warning-bg)' : 'var(--success-bg)',
                      color: s.currentStock <= 0 ? 'var(--error)' : s.currentStock < 5 ? 'var(--warning)' : 'var(--success)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                    }}>
                      {s.currentStock <= 0 ? 'Sin stock' : s.currentStock < 5 ? 'Stock bajo' : 'OK'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <span className="serif" style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>{s.currentStock}</span>
                      <span className="text-xs muted" style={{ marginLeft: 4 }}>{s.unit}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (s.currentStock / (s.currentStock + 10)) * 100)}%`,
                      height: '100%',
                      background: s.currentStock <= 0 ? 'var(--error)' : s.currentStock < 5 ? 'var(--warning)' : 'var(--success)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'compras' && (
        <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: '16px' }}>
            <h2 className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px 0' }}>Registrar compra</h2>
            <form onSubmit={savePurchase} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Insumo</label>
                  <select className="select" value={purchaseForm.supplyId} onChange={(e) => setPurchaseForm((f) => ({ ...f, supplyId: e.target.value }))}>
                    <option value="">Seleccionar insumo</option>
                    {supplies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Proveedor</label>
                  <select className="select" value={purchaseForm.supplierId} onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Cantidad</label>
                  <input className="input" type="number" step="0.001" placeholder="0" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Precio total</label>
                  <input className="input" type="number" step="0.01" placeholder="0" value={purchaseForm.totalPrice} onChange={(e) => setPurchaseForm((f) => ({ ...f, totalPrice: e.target.value }))} />
                </div>
              </div>
              {pricePerUnit && (
                <div style={{ background: 'var(--surface-container)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                  <span className="muted">Precio por unidad: </span>
                  <span className="fw-700" style={{ color: 'var(--primary-dark)' }}>${pricePerUnit}</span>
                </div>
              )}
              <div className="field">
                <label>Notas</label>
                <input className="input" type="text" placeholder="Notas opcionales" value={purchaseForm.notes} onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={purchaseSaving || !purchaseForm.supplyId || !purchaseForm.supplierId || !purchaseForm.quantity || !purchaseForm.totalPrice || !pricePerUnit}>
                {purchaseSaving ? 'Registrando...' : 'Registrar compra'}
              </button>
            </form>
          </div>

          {purchases.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="text-xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Historial reciente</div>
              {purchases.map((p) => (
                <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{p.supplyName || '—'}</div>
                      <div className="text-xs muted" style={{ marginTop: 2 }}>{p.supplierName || '—'} · {formatDate(p.purchaseDate)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-dark)' }}>{p.totalPrice.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</div>
                      <div className="text-xs muted">{p.quantityPurchased} · {p.pricePerUnit.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}/u</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'movimientos' && (
        <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="text-xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 4px 8px' }}>Últimos movimientos</div>
          {movementsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : movements.length === 0 ? (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
              <div className="text-sm">No hay movimientos todavía</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {movements.map((m, i) => {
                const positive = m.quantityChange >= 0
                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderTop: i ? '1px solid var(--outline-soft)' : 'none',
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: positive ? 'rgba(46,125,50,0.1)' : 'rgba(186,26,26,0.1)',
                      color: positive ? 'var(--success)' : 'var(--error)',
                      fontSize: 18,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {positive ? '↑' : '↓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-sm fw-600" style={{ color: 'var(--text)' }}>Insumo</div>
                      <div className="text-xs muted">{REASON_LABELS[m.reason] || m.reason} · {formatDate(m.createdAt)}</div>
                    </div>
                    <div className="serif" style={{ fontWeight: 700, color: positive ? 'var(--success)' : 'var(--error)' }}>
                      {positive ? '+' : ''}{m.quantityChange}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {supplyModal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setSupplyModal({ open: false, editing: null })}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
                {supplyModal.editing ? 'Editar insumo' : 'Nuevo insumo'}
              </h2>
              <button onClick={() => setSupplyModal({ open: false, editing: null })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nombre</label>
                <input className="input" value={supplyForm.name} onChange={(e) => setSupplyForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre del insumo" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Unidad</label>
                  <select className="select" value={supplyForm.unit} onChange={(e) => setSupplyForm((f) => ({ ...f, unit: e.target.value }))}>
                    <option value="">Sin unidad</option>
                    {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                    <option value={CUSTOM_UNIT_VALUE}>Otro</option>
                  </select>
                  {supplyForm.unit === CUSTOM_UNIT_VALUE && (
                    <input className="input" style={{ marginTop: 8 }} type="text" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="Escribir unidad" />
                  )}
                </div>
                <div className="field">
                  <label>Proveedor</label>
                  <select className="select" value={supplyForm.supplierId} onChange={(e) => setSupplyForm((f) => ({ ...f, supplierId: e.target.value }))}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSupplyModal({ open: false, editing: null })}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={supplySaving || !supplyForm.name.trim()} onClick={saveSupply}>
                  {supplySaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="modal-backdrop modal-center" onClick={() => setConfirmDialog({ open: false, type: 'delete', id: '', name: '' })}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2 className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--error)', margin: '0 0 16px' }}>
              {confirmDialog.type === 'delete' ? '⚠️ ¿Eliminar insumo?' : '⚠️ ¿Vaciar stock?'}
            </h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px', fontSize: 14 }}>
              {confirmDialog.type === 'delete'
                ? `Estás a punto de eliminar "${confirmDialog.name}". Esta acción no se puede deshacer.`
                : `Se vaciará el stock de "${confirmDialog.name}" a 0 unidades.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDialog({ open: false, type: 'delete', id: '', name: '' })}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmAction}>
                {confirmDialog.type === 'delete' ? 'Eliminar' : 'Vaciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
