'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  updatePromotionProducts,
  updatePromotionModifierGroups,
  deletePromotion,
  uploadImage,
  getAdminCategories,
  getModifierGroups,
  type PromotionAdmin,
  type ModifierGroupAdmin,
} from '@/lib/admin-api'
import { formatPrice } from '@/lib/utils'

type PromotionForm = {
  name: string
  description: string
  discountPercent: number
  emoji: string
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  limitMode: 'none' | 'limited'
  maxPerUser: number | null
}

type ConfirmDeleteDialog = {
  open: boolean
  id: string | null
  name: string
}

const EMPTY_FORM: PromotionForm = {
  name: '',
  description: '',
  discountPercent: 0,
  emoji: '🎁',
  imageUrl: null,
  sortOrder: 0,
  isActive: true,
  limitMode: 'none',
  maxPerUser: null,
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionAdmin[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; products: Array<{ id: string; name: string; price: number }> }>>([])
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupAdmin[]>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; editing: PromotionAdmin | null }>({ open: false, editing: null })
  const [form, setForm] = useState<PromotionForm>(EMPTY_FORM)
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({})
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteDialog>({ open: false, id: null, name: '' })

  const load = useCallback(async () => {
    try {
      setError(null)
      const [promos, cats, groups] = await Promise.all([
        getPromotions(),
        getAdminCategories(),
        getModifierGroups(),
      ])
      setPromotions(promos)
      setCategories(cats as any)
      setModifierGroups(groups)
      const flatProducts = cats.flatMap(c => c.products.map(p => ({ id: p.id, name: p.name, price: p.price })))
      setProducts(flatProducts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando promociones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const originalPrice = useMemo(() => {
    return Object.entries(selectedProducts).reduce((sum, [productId, qty]) => {
      const product = products.find(p => p.id === productId)
      return sum + (product?.price || 0) * qty
    }, 0)
  }, [products, selectedProducts])

  const finalPrice = useMemo(() => {
    if (originalPrice === 0) return 0
    return Math.round(originalPrice * (1 - form.discountPercent / 100))
  }, [originalPrice, form.discountPercent])

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return products
    const category = categories.find(c => c.id === selectedCategoryId)
    return category?.products || []
  }, [selectedCategoryId, categories, products])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setSelectedProducts({})
    setSelectedModifierGroupIds([])
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null)
    setModal({ open: true, editing: null })
  }

  const openEdit = (promo: PromotionAdmin) => {
    setForm({
      name: promo.name,
      description: promo.description || '',
      discountPercent: promo.discountPercent,
      emoji: promo.emoji,
      imageUrl: promo.imageUrl,
      sortOrder: promo.sortOrder,
      isActive: promo.isActive,
      limitMode: promo.maxPerUser ? 'limited' : 'none',
      maxPerUser: promo.maxPerUser,
    })
    const productCounts = promo.productIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {} as {[key: string]: number})
    setSelectedProducts(productCounts)
    setSelectedModifierGroupIds(promo.modifierGroupIds)
    setSelectedCategoryId(categories.length > 0 ? categories[0].id : null)
    setModal({ open: true, editing: promo })
  }

  const save = useCallback(async () => {
    if (!form.name.trim()) return

    setSaving(true)
    try {
      const productIds = Object.entries(selectedProducts).flatMap(([id, qty]) => Array(qty).fill(id))
      const body = {
        name: form.name,
        description: form.description || null,
        discountPercent: form.discountPercent,
        emoji: form.emoji || '🎁',
        imageUrl: form.imageUrl,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        maxPerUser: form.limitMode === 'limited' ? form.maxPerUser : null,
        productIds,
        modifierGroupIds: selectedModifierGroupIds,
      }

      if (modal.editing) {
        await updatePromotion(modal.editing.id, {
          name: body.name,
          description: body.description,
          discountPercent: body.discountPercent,
          emoji: body.emoji,
          imageUrl: body.imageUrl,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          maxPerUser: body.maxPerUser,
        })
        await updatePromotionProducts(modal.editing.id, body.productIds)
        await updatePromotionModifierGroups(modal.editing.id, body.modifierGroupIds)
      } else {
        await createPromotion(body)
      }

      setModal({ open: false, editing: null })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }, [form, selectedProducts, selectedModifierGroupIds, modal, load])

  const openDeleteDialog = (id: string, name: string) => {
    setConfirmDelete({ open: true, id, name })
  }

  const confirmRemove = useCallback(async () => {
    if (!confirmDelete.id) return
    try {
      await deletePromotion(confirmDelete.id)
      setConfirmDelete({ open: false, id: null, name: '' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error eliminando')
    }
  }, [confirmDelete.id, load])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB')
      e.currentTarget.value = ''
      return
    }
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, imageUrl: url }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-sm text-gray-600 mt-1">Crea bundles de productos con descuentos especiales</p>
        </div>
        <button
          onClick={openNew}
          className="text-sm px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
        >
          + Nueva promo
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎁</p>
          <p className="font-medium">Sin promociones aún</p>
          <p className="text-sm mt-1">Crea una para empezar a ofrecer descuentos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promotions.map(promo => (
            <div key={promo.id} className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{promo.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 truncate">{promo.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatPrice(promo.originalPrice)} → {formatPrice(promo.originalPrice - (promo.originalPrice * promo.discountPercent / 100))} ({promo.discountPercent}% desc)
                    </p>
                  </div>
                  {!promo.isActive && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">inactiva</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(promo)}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => openDeleteDialog(promo.id, promo.name)}
                    className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="px-4 py-2 text-xs text-gray-500">
                {promo.productIds.length} productos • {promo.modifierGroupIds.length} opciones
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-xl max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.editing ? '✏️ Editar promoción' : '✨ Nueva promoción'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Completa todos los campos para guardar</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Combo especial"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea
                  placeholder="Descripción opcional"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm h-16 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Emoji</label>
                  <input
                    type="text"
                    placeholder="🎁"
                    maxLength={2}
                    value={form.emoji}
                    onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-center text-2xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">% de descuento *</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.discountPercent}
                    onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) }))}
                    className="w-full accent-orange-600"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.discountPercent}
                      onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) || 0 }))}
                      className="w-16 border border-gray-300 px-2 py-1 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-600">% de descuento</span>
                  </div>
                </div>
              </div>

              {Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-gray-600">
                    Precio original: <strong className="text-gray-900">{formatPrice(originalPrice)}</strong>
                  </p>
                  <p className="text-sm font-bold text-orange-700">
                    💰 Precio final: {formatPrice(finalPrice)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Límite por usuario</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['none', 'limited'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({
                        ...f,
                        limitMode: mode,
                        maxPerUser: mode === 'none' ? null : f.maxPerUser ?? 1,
                      }))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        form.limitMode === mode
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode === 'none' ? 'Sin límite' : 'Con límite'}
                    </button>
                  ))}
                </div>
              </div>

              {form.limitMode === 'limited' && (
                <input
                  type="number"
                  placeholder="Máximo por usuario"
                  min="1"
                  value={form.maxPerUser || 1}
                  onChange={e => setForm(f => ({ ...f, maxPerUser: parseInt(e.target.value) || 1 }))}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Imagen</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-300 transition">
                  {form.imageUrl ? (
                    <div className="space-y-2">
                      <img src={form.imageUrl} alt="promo" className="w-16 h-16 mx-auto rounded-lg" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="text-orange-600 text-xs cursor-pointer font-medium">
                        {uploading ? 'Subiendo...' : 'Cambiar imagen'}
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="image-upload" className="cursor-pointer block">
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500">
                        {uploading ? 'Subiendo...' : '📸 Arrastra o haz click para subir'}
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Filtrar por categoría</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className={`px-3 py-2 text-xs rounded-lg whitespace-nowrap font-medium transition-colors ${
                        selectedCategoryId === null
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Todas
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-3 py-2 text-xs rounded-lg whitespace-nowrap font-medium transition-colors ${
                          selectedCategoryId === cat.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Productos * ({Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0)})
                </label>
                <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-lg">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-gray-500 p-3">No hay productos en esta categoría</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredProducts.map(prod => (
                        <div key={prod.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{prod.name}</p>
                            <p className="text-xs text-gray-500">{formatPrice(prod.price)}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <button
                              onClick={() => setSelectedProducts(sp => ({
                                ...sp,
                                [prod.id]: Math.max(0, (sp[prod.id] || 0) - 1)
                              }))}
                              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 text-gray-600 text-sm"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-gray-900">{selectedProducts[prod.id] || 0}</span>
                            <button
                              onClick={() => setSelectedProducts(sp => ({
                                ...sp,
                                [prod.id]: (sp[prod.id] || 0) + 1
                              }))}
                              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-orange-100 text-orange-600 text-sm font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Opciones Adicionales ({selectedModifierGroupIds.length})</label>
                {modifierGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    No hay opciones adicionales disponibles. Crea algunos en la sección de modificadores.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100">
                    {modifierGroups.map(group => (
                      <label key={group.id} className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedModifierGroupIds.includes(group.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedModifierGroupIds(ids => [...ids, group.id])
                            } else {
                              setSelectedModifierGroupIds(ids => ids.filter(id => id !== group.id))
                            }
                          }}
                          className="accent-orange-600"
                        />
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="accent-orange-600"
                />
                <span className="font-medium text-gray-700">Promoción activa</span>
              </label>

              <div className="border-t border-gray-200 pt-4 mt-4 flex gap-2">
                <button
                  onClick={() => setModal({ open: false, editing: null })}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name.trim() || Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0) === 0}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '⏳ Guardando...' : '✓ Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">⚠️ ¿Eliminar promoción?</h3>
            <p className="text-gray-600 text-sm">
              Estás a punto de eliminar <strong className="text-gray-900">{confirmDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete({ open: false, id: null, name: '' })}
                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
