'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  getModifierGroups,
  updateProductModifierGroups,
  updateProductDiscount,
  getSupplies,
  getProductSupplies,
  updateProductSupplies,
  type ModifierGroupAdmin,
} from '@/lib/admin-api'
import type { Category, Product, SupplyDto, ProductSupplyDto } from '@/types/store'

type CategoryAdmin = Category & { isActive: boolean }
type ProductAdmin = Product & { categoryId: string; sortOrder: number; isActive: boolean; discountPercent?: number | null }

type CategoryForm = { name: string; emoji: string; sortOrder: number; isActive?: boolean }
type ProductForm = {
  categoryId: string
  name: string
  description: string
  price: string
  emoji: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
  isOutOfStock: boolean
}

type ConfirmDialog = { open: boolean; type: 'category' | 'product' | null; id: string; name: string }

const EMOJI_OPTIONS = [
  // Platos principales
  '🍽️','🍔','🍕','🌮','🌯','🫔','🍜','🍝','🍛','🍲',
  '🥘','🍱','🥗','🥙','🍣','🍤','🍗','🍖','🥩','🥪',
  // Bebidas
  '☕','🍵','🧋','🫖','🥤','🧃','🍺','🍻','🍷','🍸',
  '🍹','🥛',
  // Postres & snacks
  '🍰','🎂','🧁','🍩','🍪','🍫','🍦','🍮','🥞','🧇',
  // Frutas & verduras
  '🥑','🍓','🍇','🍊','🍋','🍎','🥝','🥦','🥕','🌽',
  // Extras
  '🧀','🥚','🥓','🌭','🌶️','🧆','🥨','🫕','🧄','🥬',
]

const EMPTY_CAT: CategoryForm = { name: '', emoji: '🍽️', sortOrder: 0, isActive: true }
const EMPTY_PROD: ProductForm = {
  categoryId: '', name: '', description: '', price: '',
  emoji: '🍔', imageUrl: '', sortOrder: 0, isActive: true, isOutOfStock: false,
}

export default function MenuPage() {
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: getAdminCategories })
  const groupsQuery = useQuery({ queryKey: ['modifier-groups'], queryFn: getModifierGroups })
  const suppliesQuery = useQuery({ queryKey: ['supplies'], queryFn: getSupplies })

  const categories = (categoriesQuery.data ?? []) as CategoryAdmin[]
  const availableGroups: ModifierGroupAdmin[] = groupsQuery.data ?? []
  const availableSupplies: SupplyDto[] = suppliesQuery.data ?? []
  const loading = categoriesQuery.isLoading || groupsQuery.isLoading || suppliesQuery.isLoading

  useEffect(() => {
    if (categoriesQuery.error || groupsQuery.error || suppliesQuery.error) {
      toast.error('No se pudieron cargar las categorías')
    }
  }, [categoriesQuery.error, groupsQuery.error, suppliesQuery.error])

  const [catModal, setCatModal] = useState<{ open: boolean; editing: CategoryAdmin | null }>({ open: false, editing: null })
  const [catForm, setCatForm] = useState<CategoryForm>(EMPTY_CAT)

  const [prodModal, setProdModal] = useState<{ open: boolean; editing: ProductAdmin | null; defaultCategoryId: string }>({ open: false, editing: null, defaultCategoryId: '' })
  const [prodForm, setProdForm] = useState<ProductForm>(EMPTY_PROD)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, type: null, id: '', name: '' })
  const [discountModal, setDiscountModal] = useState<{ prodId: string; prodName: string; current: number | null } | null>(null)
  const [discountInput, setDiscountInput] = useState('')

  const [, setProductSupplies] = useState<ProductSupplyDto[]>([])
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<string[]>([])
  const [supplyQuantities, setSupplyQuantities] = useState<Record<string, string>>({})
  const [supplyUnknownQty, setSupplyUnknownQty] = useState<Record<string, boolean>>({})

  function openNewCat() {
    setCatForm({ ...EMPTY_CAT, sortOrder: categories.length })
    setCatModal({ open: true, editing: null })
  }
  function openEditCat(cat: CategoryAdmin) {
    setCatForm({ name: cat.name, emoji: cat.emoji, sortOrder: cat.sortOrder, isActive: cat.isActive })
    setCatModal({ open: true, editing: cat })
  }

  const catMutation = useMutation({
    mutationFn: async () => {
      if (catModal.editing) {
        await updateCategory(catModal.editing.id, { ...catForm, isActive: catForm.isActive ?? true })
      } else {
        await createCategory({ name: catForm.name, emoji: catForm.emoji, sortOrder: catForm.sortOrder })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setCatModal({ open: false, editing: null })
      toast.success('Categoría guardada')
    },
    onError: () => toast.error('Error al guardar categoría'),
  })
  function saveCat() {
    catMutation.mutate()
  }

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setConfirmDialog({ open: false, type: null, id: '', name: '' })
      toast.success('Categoría eliminada')
    },
    onError: () => toast.error('Error al eliminar categoría'),
  })
  function confirmRemoveCat() {
    if (confirmDialog.type !== 'category') return
    deleteCatMutation.mutate(confirmDialog.id)
  }

  function openNewProd(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId)
    setProdForm({ ...EMPTY_PROD, categoryId, sortOrder: cat ? cat.products.length : 0 })
    setSelectedGroupIds([])
    setProductSupplies([])
    setSelectedSupplyIds([])
    setSupplyQuantities({})
    setSupplyUnknownQty({})
    setProdModal({ open: true, editing: null, defaultCategoryId: categoryId })
  }
  async function openEditProd(prod: ProductAdmin) {
    setProdForm({
      categoryId: prod.categoryId, name: prod.name,
      description: prod.description ?? '', price: String(prod.price),
      emoji: prod.emoji, imageUrl: prod.imageUrl ?? '',
      sortOrder: prod.sortOrder, isActive: prod.isActive,
      isOutOfStock: prod.isOutOfStock,
    })
    setSelectedGroupIds((prod as ProductAdmin & { modifierGroupIds?: string[] }).modifierGroupIds ?? [])
    setProductSupplies([])
    setSelectedSupplyIds([])
    setSupplyQuantities({})
    setSupplyUnknownQty({})
    setProdModal({ open: true, editing: prod, defaultCategoryId: prod.categoryId })
    try {
      const existingSupplies = await getProductSupplies(prod.id)
      setProductSupplies(existingSupplies)
      const ids = existingSupplies.map((s) => s.supplyId)
      const quantities: Record<string, string> = {}
      const unknownQty: Record<string, boolean> = {}
      for (const s of existingSupplies) {
        quantities[s.supplyId] = String(s.quantityRequired)
        unknownQty[s.supplyId] = s.isUnknownQuantity
      }
      setSelectedSupplyIds(ids)
      setSupplyQuantities(quantities)
      setSupplyUnknownQty(unknownQty)
    } catch { /* no bloqueamos */ }
  }

  const saveProdMutation = useMutation({
    mutationFn: async () => {
      const body = {
        categoryId: prodForm.categoryId, name: prodForm.name,
        description: prodForm.description, price: parseFloat(prodForm.price) || 0,
        emoji: prodForm.emoji, imageUrl: prodForm.imageUrl || null,
        sortOrder: prodForm.sortOrder, isActive: prodForm.isActive, tags: [],
        isOutOfStock: prodForm.isOutOfStock,
      }
      const suppliesPayload = selectedSupplyIds.map((id) => ({
        supplyId: id,
        quantityRequired: supplyUnknownQty[id] ? 0 : (parseFloat(supplyQuantities[id]) || 0),
        isUnknownQuantity: supplyUnknownQty[id] ?? false,
      }))
      if (prodModal.editing) {
        await updateProduct(prodModal.editing.id, body)
        await updateProductModifierGroups(prodModal.editing.id, selectedGroupIds)
        await updateProductSupplies(prodModal.editing.id, suppliesPayload)
      } else {
        const created = await createProduct(body)
        await updateProductModifierGroups(created.id, selectedGroupIds)
        await updateProductSupplies(created.id, suppliesPayload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setProdModal({ open: false, editing: null, defaultCategoryId: '' })
      toast.success('Producto guardado')
    },
    onError: () => toast.error('Error al guardar producto'),
  })
  function saveProd() {
    saveProdMutation.mutate()
  }

  const deleteProdMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setConfirmDialog({ open: false, type: null, id: '', name: '' })
      toast.success('Producto eliminado')
    },
    onError: () => toast.error('Error al eliminar producto'),
  })
  function confirmRemoveProd() {
    if (confirmDialog.type !== 'product') return
    deleteProdMutation.mutate(confirmDialog.id)
  }

  function openDiscountModal(prod: ProductAdmin) {
    setDiscountModal({ prodId: prod.id, prodName: prod.name, current: prod.discountPercent ?? null })
    setDiscountInput(prod.discountPercent ? String(prod.discountPercent) : '')
  }

  const discountMutation = useMutation({
    mutationFn: (percent: number | null) => updateProductDiscount(discountModal!.prodId, percent),
    onSuccess: (_data, percent) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      setDiscountModal(null)
      setDiscountInput('')
      toast.success(percent === null ? 'Descuento eliminado' : 'Descuento guardado')
    },
    onError: (_err, percent) => {
      toast.error(percent === null ? 'Error al quitar descuento' : 'Error al guardar descuento')
    },
  })
  function saveDiscount() {
    if (!discountModal) return
    const percent = discountInput.trim() === '' ? null : (parseInt(discountInput) || null)
    discountMutation.mutate(percent)
  }
  function removeDiscount() {
    if (!discountModal) return
    discountMutation.mutate(null)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar los 5 MB'); e.target.value = ''; return }
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setProdForm((f) => ({ ...f, imageUrl: url }))
      toast.success('Imagen subida')
    } catch {
      toast.error('Error al subir la imagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const totalProducts = categories.reduce((acc, c) => acc + c.products.length, 0)
  const activeCategories = categories.filter(c => c.isActive).length

  const catFormValid = catForm.name.trim() !== '' && catForm.emoji.trim() !== ''
  const prodFormValid = prodForm.name.trim() !== '' && prodForm.categoryId.trim() !== '' && prodForm.price.trim() !== '' && !isNaN(parseFloat(prodForm.price)) && parseFloat(prodForm.price) > 0

  const catSaving = catMutation.isPending
  const prodSaving = saveProdMutation.isPending
  const discountSaving = discountMutation.isPending

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <div style={{ width: 32, height: 32, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--sans)' }}>

      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Menú
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Carta
          </h1>
          <button onClick={openNewCat} className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>
            <span className="mat sm">add</span> Categoría
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          {activeCategories} categorías · {totalProducts} productos
        </p>
      </div>

      {categories.length === 0 && !loading && (
        <div style={{ padding: '0 22px' }}>
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            <span className="mat lg" style={{ color: 'var(--muted-soft)', display: 'block', marginBottom: 8 }}>restaurant_menu</span>
            <div style={{ fontSize: 14 }}>No hay categorías todavía</div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map(cat => (
          <div key={cat.id} className="card" style={{ overflow: 'hidden' }}>

            {/* Category header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: cat.isActive ? 'transparent' : 'var(--surface-container)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-container)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 20 }}>
                {cat.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {cat.products.length} {cat.products.length === 1 ? 'producto' : 'productos'} · {cat.products.filter(p => (p as unknown as ProductAdmin).isActive).length} activos
                </div>
              </div>
              {!cat.isActive && <span className="chip">Oculta</span>}
              <button onClick={() => openEditCat(cat)} className="tap" style={{ width: 34, height: 34, borderRadius: 17, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                <span className="mat">more_horiz</span>
              </button>
            </div>

            {/* Products */}
            {cat.products.map((prod) => {
              const p = prod as unknown as ProductAdmin
              return (
                <button
                  key={prod.id}
                  onClick={() => openEditProd(p)}
                  className="tap"
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--outline-soft)',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    opacity: p.isActive ? 1 : 0.55,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{prod.name}</span>
                      {!p.isActive && <span className="chip">Pausado</span>}
                      {p.isOutOfStock && <span className="chip error">Sin stock</span>}
                      {p.discountPercent && (
                        <span className="chip warning">-{p.discountPercent}%</span>
                      )}
                    </div>
                    {prod.description && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                        {prod.description}
                      </div>
                    )}
                  </div>
                  <div className="serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                    ${prod.price.toLocaleString('es-AR')}
                  </div>
                </button>
              )
            })}

            {/* Add product footer */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--outline-soft)', background: 'rgba(240,238,248,0.4)' }}>
              <button
                onClick={() => openNewProd(cat.id)}
                className="tap"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, color: 'var(--primary-dark)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <span className="mat sm">add</span> Agregar producto
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category modal (centered) ────────────────────────────────── */}
      {catModal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setCatModal({ open: false, editing: null })}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                {catModal.editing ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <button onClick={() => setCatModal({ open: false, editing: null })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Nombre */}
              <div className="field">
                <label>Nombre <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <input className="input" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Entradas" />
              </div>

              {/* Icono selector visual */}
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Icono <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto', padding: '2px 0' }}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <button key={emoji} onClick={() => setCatForm(f => ({ ...f, emoji }))} className="tap"
                      style={{
                        aspectRatio: '1',
                        borderRadius: 10,
                        background: catForm.emoji === emoji ? 'var(--primary)' : 'var(--surface-container)',
                        color: catForm.emoji === emoji ? 'var(--on-primary)' : 'var(--text)',
                        border: catForm.emoji === emoji ? '2px solid var(--primary)' : '2px solid transparent',
                        fontSize: 22,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visible en la carta */}
              <label className="tap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-container)', borderRadius: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={catForm.isActive ?? true} onChange={e => setCatForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Visible en la carta</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Los clientes pueden ver y pedir productos.</div>
                </div>
              </label>

              {/* Botones */}
              <button className="btn btn-primary btn-block" disabled={catSaving || !catFormValid} onClick={saveCat} style={{ marginTop: 8 }}>
                {catSaving ? 'Guardando...' : catModal.editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
              {catModal.editing && (
                <button className="btn btn-danger btn-block" onClick={() => {
                  setCatModal({ open: false, editing: null })
                  setConfirmDialog({ open: true, type: 'category', id: catModal.editing!.id, name: catModal.editing!.name })
                }}>
                  <span className="mat sm">delete</span> Eliminar categoría
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Product sheet ──────────────────────────────────────────── */}
      {prodModal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setProdModal({ open: false, editing: null, defaultCategoryId: '' })}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                {prodModal.editing ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button onClick={() => setProdModal({ open: false, editing: null, defaultCategoryId: '' })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nombre <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <input className="input" value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Risotto de hongos" />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea className="input" rows={2} value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} placeholder="Ingredientes y detalles" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Categoría <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                  <select className="select" value={prodForm.categoryId} onChange={e => setProdForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Precio <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                  <input className="input" type="number" min="0" step="0.01" value={prodForm.price} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
                </div>
              </div>

              {/* Image */}
              <div className="field">
                <label>Imagen</label>
                {prodForm.imageUrl && (
                  <div style={{ position: 'relative', marginBottom: 8, width: '100%', height: 140, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--outline-soft)' }}>
                    <Image src={prodForm.imageUrl} alt="Preview" fill style={{ objectFit: 'cover' }} unoptimized />
                    <button onClick={() => setProdForm(f => ({ ...f, imageUrl: '' }))} style={{ position: 'absolute', top: 8, right: 8, background: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}>
                      <span className="mat xs">close</span>
                    </button>
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', border: '2px dashed var(--outline)', borderRadius: 10, cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
                  <span className="mat sm">photo_camera</span>
                  {uploading ? 'Subiendo...' : prodForm.imageUrl ? 'Cambiar imagen' : 'Agregar imagen'}
                </label>
              </div>

              {/* Modifiers */}
              {availableGroups.length > 0 && (
                <div className="field">
                  <label>Grupos de personalización</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableGroups.map(g => {
                      const on = selectedGroupIds.includes(g.id)
                      return (
                        <button key={g.id} className="tap" onClick={() => setSelectedGroupIds(prev => on ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, textAlign: 'left', background: on ? 'rgba(249,115,22,0.08)' : 'var(--surface-container)', border: on ? '1px solid var(--primary)' : '1px solid transparent' }}>
                          <span className="mat sm fill" style={{ color: on ? 'var(--primary)' : 'var(--muted)' }}>{on ? 'check_box' : 'check_box_outline_blank'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.options.length} opciones · {g.isRequired ? 'obligatorio' : 'opcional'}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <label className="tap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-container)', borderRadius: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={prodForm.isActive} onChange={e => setProdForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Disponible</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Si lo apagás, no aparece en la carta.</div>
                </div>
              </label>

              {/* Out of stock toggle */}
              <label className="tap" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-container)', borderRadius: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={prodForm.isOutOfStock} onChange={e => setProdForm(f => ({ ...f, isOutOfStock: e.target.checked }))} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Agotado hoy</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>El producto sigue visible en la carta pero los clientes no podrán pedirlo hasta que lo reactives.</div>
                </div>
              </label>

              {/* Supplies */}
              {availableSupplies.length > 0 && (
                <div className="field">
                  <label>Ingredientes</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {availableSupplies.map(supply => {
                      const isSelected = selectedSupplyIds.includes(supply.id)
                      const isUnknown = supplyUnknownQty[supply.id] ?? false
                      return (
                        <div key={supply.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface-container)', borderRadius: 8 }}>
                          <input type="checkbox" checked={isSelected} onChange={e => setSelectedSupplyIds(prev => e.target.checked ? [...prev, supply.id] : prev.filter(id => id !== supply.id))} style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {supply.name}{supply.unit ? ` (${supply.unit})` : ''}
                          </span>
                          {isSelected && (
                            <>
                              <input type="number" step="0.001" min="0" value={isUnknown ? '' : (supplyQuantities[supply.id] ?? '')} onChange={e => setSupplyQuantities(prev => ({ ...prev, [supply.id]: e.target.value }))} disabled={isUnknown} style={{ width: 64, padding: '4px 8px', border: '1px solid var(--outline)', borderRadius: 6, fontSize: 12, background: isUnknown ? 'var(--surface-container)' : 'white', color: 'var(--text)' }} placeholder="Cant." />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                                <input type="checkbox" checked={isUnknown} onChange={e => setSupplyUnknownQty(prev => ({ ...prev, [supply.id]: e.target.checked }))} style={{ width: 14, height: 14, accentColor: 'var(--primary)' }} />
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>?</span>
                              </label>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-block" disabled={prodSaving || !prodFormValid} onClick={saveProd}>
                {prodSaving ? 'Guardando...' : prodModal.editing ? 'Guardar cambios' : 'Crear producto'}
              </button>
              {prodModal.editing && (
                <>
                  <button className="btn btn-outline btn-block btn-sm" onClick={() => {
                    setProdModal({ open: false, editing: null, defaultCategoryId: '' })
                    openDiscountModal(prodModal.editing!)
                  }}>
                    <span className="mat sm">local_offer</span> Descuento
                  </button>
                  <button className="btn btn-danger btn-block" onClick={() => {
                    setProdModal({ open: false, editing: null, defaultCategoryId: '' })
                    setConfirmDialog({ open: true, type: 'product', id: prodModal.editing!.id, name: prodModal.editing!.name })
                  }}>
                    <span className="mat sm">delete</span> Eliminar producto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete sheet ───────────────────────────────────── */}
      {confirmDialog.open && (
        <div className="modal-backdrop modal-center" onClick={() => setConfirmDialog({ open: false, type: null, id: '', name: '' })}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2 className="serif" style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--error)' }}>
              ⚠️ ¿Eliminar {confirmDialog.type === 'category' ? 'categoría' : 'producto'}?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Vas a eliminar <strong style={{ color: 'var(--text)' }}>{confirmDialog.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDialog({ open: false, type: null, id: '', name: '' })}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1.4 }} onClick={() => confirmDialog.type === 'category' ? confirmRemoveCat() : confirmRemoveProd()}>
                <span className="mat sm">delete</span> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discount sheet ─────────────────────────────────────────── */}
      {discountModal && (
        <div className="modal-backdrop modal-center" onClick={() => setDiscountModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>Descuento</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 0, marginTop: 4 }}>{discountModal.prodName}</p>
              </div>
              <button onClick={() => setDiscountModal(null)} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Porcentaje (%)</label>
              <input className="input" type="number" min="0" max="100" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="Ej: 20" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {discountModal.current !== null && (
                <button className="btn btn-danger" disabled={discountSaving} onClick={removeDiscount}>
                  Quitar
                </button>
              )}
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDiscountModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={discountSaving || discountInput.trim() === ''} onClick={saveDiscount}>
                {discountSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
