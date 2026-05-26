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
import Image from 'next/image'
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
      setCategories(cats as unknown as Array<{ id: string; name: string; products: Array<{ id: string; name: string; price: number }> }>)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const promoFormValid = form.name.trim() !== '' && form.discountPercent > 0 && Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0) > 0

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
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const activeCount = promotions.filter(p => p.isActive).length

  return (
    <div style={{ fontFamily: 'var(--sans)' }}>
      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          DESCUENTOS Y CÓDIGOS
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Promos
          </h1>
          <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginTop: 4 }}>
            <span className="mat sm">add</span> Nueva
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          {activeCount} promos activas · Crea bundles de productos con descuentos especiales
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ padding: '12px 14px', background: 'var(--error-bg)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {promotions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 22px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Sin promociones aún</div>
            <p style={{ fontSize: 13, margin: 0 }}>Crea una para empezar a ofrecer descuentos</p>
          </div>
        ) : (
          promotions.map(promo => (
            <div key={promo.id} className="card" style={{ overflow: 'hidden', opacity: promo.isActive ? 1 : 0.7 }}>
              <button
                className="tap"
                onClick={() => openEdit(promo)}
                style={{
                  width: '100%',
                  padding: 16,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: promo.isActive ? 'var(--primary)' : 'var(--surface-container)',
                    color: promo.isActive ? 'var(--on-primary)' : 'var(--muted)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    boxShadow: promo.isActive ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
                  }}
                >
                  <span className="serif" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                    {promo.discountPercent}%
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    {promo.name}
                  </div>
                  <div style={{ marginTop: 2, lineHeight: 1.4, fontSize: 12, color: 'var(--muted)' }}>
                    {promo.description || formatPrice(promo.originalPrice) + ' → ' + formatPrice(finalPrice)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="chip primary">{promo.productIds.length} productos</span>
                    <span className="chip">{promo.modifierGroupIds.length} opciones</span>
                  </div>
                </div>
              </button>

              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--outline-soft)',
                background: 'rgba(240,238,248,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <button
                    onClick={() => openEdit(promo)}
                    className="btn btn-ghost btn-sm"
                    style={{ marginRight: 8 }}
                  >
                    <span className="mat sm">edit</span> Editar
                  </button>
                  <button
                    onClick={() => openDeleteDialog(promo.id, promo.name)}
                    className="btn btn-danger btn-sm"
                  >
                    <span className="mat sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="modal-backdrop modal-center" onClick={() => setModal({ open: false, editing: null })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, color: 'var(--primary-dark)', fontWeight: 700 }}>
                {modal.editing ? 'Editar promo' : 'Nueva promo'}
              </h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="tap" style={{ width: 32, height: 32, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 20 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nombre <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <input
                  className="input"
                  type="text"
                  placeholder="Ej: Combo especial"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Descripción</label>
                <textarea
                  className="input"
                  placeholder="Descripción opcional"
                  style={{ minHeight: 60 }}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Emoji</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="🎁"
                    maxLength={2}
                    style={{ textAlign: 'center', fontSize: 24 }}
                    value={form.emoji}
                    onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Orden</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="field">
                <label>% de descuento <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <input
                  className="input"
                  type="range"
                  min="0"
                  max="100"
                  value={form.discountPercent}
                  onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) }))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="100"
                    value={form.discountPercent}
                    onChange={e => setForm(f => ({ ...f, discountPercent: parseInt(e.target.value) || 0 }))}
                    style={{ width: 60 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>% de descuento</span>
                </div>
              </div>

              {Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0) > 0 && (
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--primary)',
                  borderRadius: 8,
                  color: 'var(--on-primary)',
                }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    Precio original: <strong>{formatPrice(originalPrice)}</strong>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Precio final: {formatPrice(finalPrice)}
                  </div>
                </div>
              )}

              <div className="field">
                <label>Límite por usuario</label>
                <div className="seg">
                  {(['none', 'limited'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({
                        ...f,
                        limitMode: mode,
                        maxPerUser: mode === 'none' ? null : f.maxPerUser ?? 1,
                      }))}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: form.limitMode === mode ? 'var(--primary)' : 'var(--surface-container)',
                        color: form.limitMode === mode ? 'var(--on-primary)' : 'var(--text)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {mode === 'none' ? 'Sin límite' : 'Con límite'}
                    </button>
                  ))}
                </div>
              </div>

              {form.limitMode === 'limited' && (
                <div className="field">
                  <label>Máximo por usuario</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.maxPerUser || 1}
                    onChange={e => setForm(f => ({ ...f, maxPerUser: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div className="field">
                <label>Imagen</label>
                <div
                  style={{
                    border: '2px dashed var(--outline)',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  {form.imageUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                      <Image src={form.imageUrl} alt="promo" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} unoptimized />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="btn btn-outline btn-sm" style={{ cursor: 'pointer', width: '100%' }}>
                        <span className="mat sm">image</span> {uploading ? 'Subiendo...' : 'Cambiar'}
                      </label>
                    </div>
                  ) : (
                    <label htmlFor="image-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                        {uploading ? 'Subiendo...' : '📸 Haz click para subir'}
                      </p>
                    </label>
                  )}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="field">
                  <label>Filtrar por categoría</label>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        borderRadius: 8,
                        border: 'none',
                        background: selectedCategoryId === null ? 'var(--primary)' : 'var(--surface-container)',
                        color: selectedCategoryId === null ? 'var(--on-primary)' : 'var(--text)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Todas
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          borderRadius: 8,
                          border: 'none',
                          background: selectedCategoryId === cat.id ? 'var(--primary)' : 'var(--surface-container)',
                          color: selectedCategoryId === cat.id ? 'var(--on-primary)' : 'var(--text)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="field">
                <label>Productos ({Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0)}) <span style={{ color: 'var(--error)', fontSize: 12, fontWeight: 600 }}>(Obligatorio)</span></label>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--outline)', borderRadius: 10 }}>
                  {filteredProducts.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--muted)', padding: 12, margin: 0 }}>No hay productos</p>
                  ) : (
                    filteredProducts.map(prod => (
                      <div
                        key={prod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--outline-soft)',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{prod.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatPrice(prod.price)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 12 }}>
                          <button
                            onClick={() => setSelectedProducts(sp => ({
                              ...sp,
                              [prod.id]: Math.max(0, (sp[prod.id] || 0) - 1)
                            }))}
                            className="tap"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              border: '1px solid var(--outline)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            −
                          </button>
                          <span style={{ width: 20, textAlign: 'center', fontWeight: 600 }}>
                            {selectedProducts[prod.id] || 0}
                          </span>
                          <button
                            onClick={() => setSelectedProducts(sp => ({
                              ...sp,
                              [prod.id]: (sp[prod.id] || 0) + 1
                            }))}
                            className="tap"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              border: 'none',
                              background: 'var(--primary)',
                              color: 'var(--on-primary)',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="field">
                <label>Opciones Adicionales ({selectedModifierGroupIds.length})</label>
                {modifierGroups.length === 0 ? (
                  <p style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    padding: 12,
                    margin: 0,
                    background: 'var(--surface-container)',
                    borderRadius: 8,
                  }}>
                    No hay opciones. Crea algunas en Opciones.
                  </p>
                ) : (
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--outline)', borderRadius: 10 }}>
                    {modifierGroups.map(group => (
                      <label
                        key={group.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--outline-soft)',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
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
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: 'var(--primary)',
                            cursor: 'pointer',
                          }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{group.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label
                className="tap"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'var(--surface-container)',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Promoción activa</div>
                </div>
              </label>
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
                disabled={saving || !promoFormValid}
                style={{
                  flex: 1,
                  opacity: saving || !promoFormValid ? 0.5 : 1,
                }}
              >
                {saving ? 'Guardando...' : modal.editing ? 'Guardar cambios' : 'Crear promo'}
              </button>
            </div>

            {modal.editing && (
              <button
                className="btn btn-danger btn-block"
                onClick={() => {
                  openDeleteDialog(modal.editing!.id, modal.editing!.name)
                  setModal({ open: false, editing: null })
                }}
                style={{ marginTop: 12 }}
              >
                <span className="mat sm">delete</span> Eliminar promo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete.open && (
        <div className="modal-backdrop modal-center" onClick={() => setConfirmDelete({ open: false, id: null, name: '' })}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <h2 className="serif" style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--error)' }}>
              ⚠️ ¿Eliminar promo?
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
              Estás a punto de eliminar <strong style={{ color: 'var(--text)' }}>{confirmDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline"
                onClick={() => setConfirmDelete({ open: false, id: null, name: '' })}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmRemove}
                style={{ flex: 1 }}
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
