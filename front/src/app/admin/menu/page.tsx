'use client'

import { useState, useEffect, useCallback } from 'react'
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
  type ModifierGroupAdmin,
} from '@/lib/admin-api'
import type { Category, Product } from '@/types/store'

type CategoryAdmin = Category & { isActive: boolean }
type ProductAdmin = Product & { categoryId: string; sortOrder: number; isActive: boolean; discountPercent?: number | null }

type CategoryForm = { name: string; emoji: string; sortOrder: number }
type ProductForm = {
  categoryId: string
  name: string
  description: string
  price: string
  emoji: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
}

type ConfirmDialog = { open: boolean; type: 'category' | 'product' | null; id: string; name: string }

const EMPTY_CAT: CategoryForm = { name: '', emoji: '🍽️', sortOrder: 0 }
const EMPTY_PROD: ProductForm = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  emoji: '🍔',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
}

export default function MenuPage() {
  const [categories, setCategories] = useState<CategoryAdmin[]>([])
  const [availableGroups, setAvailableGroups] = useState<ModifierGroupAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [catModal, setCatModal] = useState<{ open: boolean; editing: CategoryAdmin | null }>({
    open: false,
    editing: null,
  })
  const [catForm, setCatForm] = useState<CategoryForm>(EMPTY_CAT)
  const [catSaving, setCatSaving] = useState(false)

  const [prodModal, setProdModal] = useState<{ open: boolean; editing: ProductAdmin | null; defaultCategoryId: string }>({
    open: false,
    editing: null,
    defaultCategoryId: '',
  })
  const [prodForm, setProdForm] = useState<ProductForm>(EMPTY_PROD)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [prodSaving, setProdSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({ open: false, type: null, id: '', name: '' })

  const [discountModal, setDiscountModal] = useState<{ prodId: string; prodName: string; current: number | null } | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [discountSaving, setDiscountSaving] = useState(false)

  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-menu-trigger],[data-menu-dropdown]')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuId])

  const load = useCallback(async () => {
    try {
      setError(null)
      const [data, groups] = await Promise.all([getAdminCategories(), getModifierGroups()])
      setCategories(data as CategoryAdmin[])
      setAvailableGroups(groups)
    } catch {
      setError('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNewCat() {
    setCatForm({ ...EMPTY_CAT, sortOrder: categories.length })
    setCatModal({ open: true, editing: null })
  }

  function openEditCat(cat: CategoryAdmin) {
    setCatForm({ name: cat.name, emoji: cat.emoji, sortOrder: cat.sortOrder })
    setCatModal({ open: true, editing: cat })
  }

  async function saveCat() {
    setCatSaving(true)
    try {
      if (catModal.editing) {
        await updateCategory(catModal.editing.id, { ...catForm, isActive: catModal.editing.isActive })
      } else {
        await createCategory(catForm)
      }
      setCatModal({ open: false, editing: null })
      await load()
    } catch {
      setError('Error al guardar categoría')
    } finally {
      setCatSaving(false)
    }
  }

  function openRemoveCatDialog(id: string, name: string) {
    setConfirmDialog({ open: true, type: 'category', id, name })
  }

  async function confirmRemoveCat() {
    if (confirmDialog.type !== 'category') return
    try {
      await deleteCategory(confirmDialog.id)
      setConfirmDialog({ open: false, type: null, id: '', name: '' })
      await load()
    } catch {
      setError('Error al eliminar categoría')
    }
  }

  function openNewProd(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId)
    const nextOrder = cat ? cat.products.length : 0
    setProdForm({ ...EMPTY_PROD, categoryId, sortOrder: nextOrder })
    setSelectedGroupIds([])
    setProdModal({ open: true, editing: null, defaultCategoryId: categoryId })
  }

  function openEditProd(prod: ProductAdmin) {
    setProdForm({
      categoryId: prod.categoryId,
      name: prod.name,
      description: prod.description ?? '',
      price: String(prod.price),
      emoji: prod.emoji,
      imageUrl: prod.imageUrl ?? '',
      sortOrder: prod.sortOrder,
      isActive: prod.isActive,
    })
    setSelectedGroupIds((prod as ProductAdmin & { modifierGroupIds?: string[] }).modifierGroupIds ?? [])
    setProdModal({ open: true, editing: prod, defaultCategoryId: prod.categoryId })
  }

  async function saveProd() {
    setProdSaving(true)
    try {
      const body = {
        categoryId: prodForm.categoryId,
        name: prodForm.name,
        description: prodForm.description,
        price: parseFloat(prodForm.price) || 0,
        emoji: prodForm.emoji,
        imageUrl: prodForm.imageUrl || null,
        sortOrder: prodForm.sortOrder,
        isActive: prodForm.isActive,
        tags: [],
      }
      if (prodModal.editing) {
        await updateProduct(prodModal.editing.id, body)
        await updateProductModifierGroups(prodModal.editing.id, selectedGroupIds)
      } else {
        const created = await createProduct(body)
        await updateProductModifierGroups(created.id, selectedGroupIds)
      }
      setProdModal({ open: false, editing: null, defaultCategoryId: '' })
      await load()
    } catch {
      setError('Error al guardar producto')
    } finally {
      setProdSaving(false)
    }
  }

  function openRemoveProdDialog(id: string, name: string) {
    setConfirmDialog({ open: true, type: 'product', id, name })
  }

  async function confirmRemoveProd() {
    if (confirmDialog.type !== 'product') return
    try {
      await deleteProduct(confirmDialog.id)
      setConfirmDialog({ open: false, type: null, id: '', name: '' })
      await load()
    } catch {
      setError('Error al eliminar producto')
    }
  }

  function openDiscountModal(prod: ProductAdmin) {
    setDiscountModal({ prodId: prod.id, prodName: prod.name, current: prod.discountPercent ?? null })
    setDiscountInput(prod.discountPercent ? String(prod.discountPercent) : '')
  }

  async function saveDiscount() {
    if (!discountModal) return
    setDiscountSaving(true)
    try {
      const percent = discountInput.trim() === '' ? null : (parseInt(discountInput) || null)
      await updateProductDiscount(discountModal.prodId, percent)
      setDiscountModal(null)
      setDiscountInput('')
      await load()
    } catch {
      setError('Error al guardar descuento')
    } finally {
      setDiscountSaving(false)
    }
  }

  function removeDiscount() {
    if (!discountModal) return
    setDiscountInput('')
    setDiscountSaving(true)
    updateProductDiscount(discountModal.prodId, null)
      .then(() => {
        setDiscountModal(null)
        setDiscountInput('')
        return load()
      })
      .catch(() => setError('Error al quitar descuento'))
      .finally(() => setDiscountSaving(false))
  }

  const calculatedFinalPrice = discountInput.trim() !== '' && discountModal
    ? Math.round(((categories.find(c => c.products.some(p => p.id === discountModal.prodId))?.products.find(p => p.id === discountModal.prodId)?.price ?? 0) * (1 - parseInt(discountInput) / 100)))
    : null

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setProdForm((f) => ({ ...f, imageUrl: url }))
    } catch {
      setError('Error al subir la imagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Carta</h1>
        <button
          onClick={openNewCat}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Categoría
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {categories.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>No hay categorías todavía</p>
        </div>
      )}

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-200">
            <div className="relative flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
                {!cat.isActive && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">inactiva</span>
                )}
              </div>

              {/* Desktop: all three buttons */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openNewProd(cat.id)}
                  className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
                >
                  + Producto
                </button>
                <button
                  onClick={() => openEditCat(cat)}
                  className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => openRemoveCatDialog(cat.id, cat.name)}
                  className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              </div>

              {/* Mobile: + Producto + ⋯ menu */}
              <div className="flex md:hidden items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openNewProd(cat.id)}
                  className="text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors"
                >
                  + Producto
                </button>
                <button
                  data-menu-trigger
                  onClick={() => setOpenMenuId(openMenuId === cat.id ? null : cat.id)}
                  className="text-sm px-2 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-bold leading-none"
                >
                  ⋯
                </button>
              </div>

              {/* Dropdown */}
              {openMenuId === cat.id && (
                <div data-menu-dropdown className="absolute right-4 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button
                    onClick={() => { openEditCat(cat); setOpenMenuId(null) }}
                    className="w-full text-left text-sm px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { openRemoveCatDialog(cat.id, cat.name); setOpenMenuId(null) }}
                    className="w-full text-left text-sm px-4 py-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>

            {cat.products.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400">Sin productos</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {cat.products.map((prod) => {
                  const p = prod as unknown as ProductAdmin
                  return (
                    <li key={prod.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                          />
                        ) : (
                          <span className="text-lg flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                            {cat.emoji}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{prod.name}</p>
                          <p className="text-sm text-gray-500">
                            ${prod.price.toLocaleString('es-AR')}
                            {p.discountPercent && (
                              <span className="ml-2 text-xs font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                -{p.discountPercent}%
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button
                          onClick={() => openDiscountModal(p)}
                          className="text-xs px-3 py-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          Descuento
                        </button>
                        <button
                          onClick={() => openEditProd(p)}
                          className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => openRemoveProdDialog(prod.id, prod.name)}
                          className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Category modal */}
      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">
              {catModal.editing ? 'Editar categoría' : 'Nueva categoría'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Hamburguesas"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={catForm.emoji}
                    onChange={(e) => setCatForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="🍔"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCatModal({ open: false, editing: null })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCat}
                disabled={catSaving || !catForm.name}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {catSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product modal */}
      {prodModal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-0 overflow-y-auto">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 my-auto">
            <h2 className="font-bold text-gray-900">
              {prodModal.editing ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={prodForm.name}
                    onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Clásica"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={prodForm.emoji}
                    onChange={(e) => setProdForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={prodForm.description}
                  onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodForm.price}
                    onChange={(e) => setProdForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="1500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    value={prodForm.sortOrder}
                    onChange={(e) => setProdForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                {prodForm.imageUrl && (
                  <div className="relative mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prodForm.imageUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setProdForm((f) => ({ ...f, imageUrl: '' }))}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <span className="text-sm text-gray-500">Subiendo...</span>
                  ) : (
                    <>
                      <span>📷</span>
                      <span className="text-sm text-gray-600">
                        {prodForm.imageUrl ? 'Cambiar imagen' : 'Agregar imagen'}
                      </span>
                    </>
                  )}
                </label>
              </div>

              {availableGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupos de personalización
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {availableGroups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2.5 cursor-pointer px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={(e) => {
                            setSelectedGroupIds((prev) =>
                              e.target.checked
                                ? [...prev, g.id]
                                : prev.filter((id) => id !== g.id),
                            )
                          }}
                          className="w-4 h-4 accent-orange-600 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800">{g.name}</span>
                          <span className="ml-1.5 text-xs text-gray-400">
                            {g.options.length} opción{g.options.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodForm.isActive}
                  onChange={(e) => setProdForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-orange-600"
                />
                <span className="text-sm text-gray-700">Producto activo</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setProdModal({ open: false, editing: null, defaultCategoryId: '' })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveProd}
                disabled={prodSaving || !prodForm.name || !prodForm.price}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {prodSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">
              ¿Eliminar {confirmDialog.type === 'category' ? 'categoría' : 'producto'}?
            </h2>
            <p className="text-gray-600">
              {confirmDialog.type === 'category'
                ? `Estás a punto de eliminar la categoría "${confirmDialog.name}". Esta acción no se puede deshacer.`
                : `Estás a punto de eliminar el producto "${confirmDialog.name}". Esta acción no se puede deshacer.`}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog({ open: false, type: null, id: '', name: '' })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === 'category') {
                    confirmRemoveCat()
                  } else if (confirmDialog.type === 'product') {
                    confirmRemoveProd()
                  }
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Descuento - {discountModal.prodName}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de descuento (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="50"
                />
              </div>

              {discountInput.trim() !== '' && calculatedFinalPrice !== null && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Precio final: <span className="font-bold text-orange-600">${calculatedFinalPrice.toLocaleString('es-AR')}</span></p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDiscountModal(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              {discountModal.current !== null && (
                <button
                  onClick={removeDiscount}
                  disabled={discountSaving}
                  className="py-2.5 px-4 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {discountSaving ? 'Quitando...' : 'Quitar'}
                </button>
              )}
              <button
                onClick={saveDiscount}
                disabled={discountSaving || discountInput.trim() === ''}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {discountSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
