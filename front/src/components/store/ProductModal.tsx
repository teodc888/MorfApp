'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { Product, ModifierGroup, SelectedOption, CartItem } from '@/types/store'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { STITCH } from '@/lib/stitch-theme'

function generateId(): string {
  return crypto.randomUUID()
}

type Selections = Record<string, SelectedOption | SelectedOption[]>

type Props = {
  product: Product
  categoryEmoji: string
  onClose: () => void
}

function ModifierGroupSection({
  group,
  selections,
  onChange,
}: {
  group: ModifierGroup
  selections: Selections
  onChange: (groupId: string, value: SelectedOption | SelectedOption[]) => void
}) {
  const current = selections[group.id]

  if (group.type === 'single') {
    const selected = current as SelectedOption | undefined
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-sm" style={{ color: STITCH.text }}>{group.name}</h3>
          {group.isRequired && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: STITCH.primary }}>
              Obligatorio
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {group.options.map((opt) => {
            const isSelected = selected?.optionId === opt.id
            return (
              <label
                key={opt.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors border ${
                  isSelected ? 'bg-primary-muted border-primary' : 'bg-zinc-50 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-primary bg-primary' : 'border-zinc-300'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-zinc-800">
                    {opt.emoji} {opt.name}
                  </span>
                </div>
                {opt.extraPrice > 0 && (
                  <span className="text-xs text-zinc-500">+ {formatPrice(opt.extraPrice)}</span>
                )}
                <input
                  type="radio"
                  name={group.id}
                  value={opt.id}
                  checked={isSelected}
                  onChange={() =>
                    onChange(group.id, {
                      optionId: opt.id,
                      name: opt.name,
                      extraPrice: opt.extraPrice,
                    })
                  }
                  className="sr-only"
                />
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  // multiple
  const selectedArr = (current as SelectedOption[] | undefined) ?? []
  const maxSelect = group.maxSelect

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-zinc-800 text-sm">{group.name}</h3>
        {group.isRequired && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: STITCH.primary }}>
            Obligatorio
          </span>
        )}
        {maxSelect && (
          <span className="text-[10px] text-zinc-400">máx. {maxSelect}</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {group.options.map((opt) => {
          const isChecked = selectedArr.some((s) => s.optionId === opt.id)
          const atMax = !isChecked && maxSelect !== null && selectedArr.length >= maxSelect

          return (
            <label
              key={opt.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors border ${
                atMax ? 'opacity-40 cursor-not-allowed' : ''
              } ${
                isChecked
                  ? 'bg-primary-muted border-primary'
                  : 'bg-zinc-50 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isChecked ? 'border-primary bg-primary' : 'border-zinc-300'
                  }`}
                >
                  {isChecked && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-sm text-zinc-800">
                  {opt.emoji} {opt.name}
                </span>
              </div>
              {opt.extraPrice > 0 && (
                <span className="text-xs text-zinc-500">+ {formatPrice(opt.extraPrice)}</span>
              )}
              <input
                type="checkbox"
                checked={isChecked}
                disabled={atMax}
                onChange={(e) => {
                  let next: SelectedOption[]
                  if (e.target.checked) {
                    next = [
                      ...selectedArr,
                      { optionId: opt.id, name: opt.name, extraPrice: opt.extraPrice },
                    ]
                  } else {
                    next = selectedArr.filter((s) => s.optionId !== opt.id)
                  }
                  onChange(group.id, next)
                }}
                className="sr-only"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function ProductModal({ product, categoryEmoji, onClose }: Props) {
  const [qty, setQty] = useState(1)
  const [selections, setSelections] = useState<Selections>({})
  const [observations, setObservations] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const dragStartY = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const addItem = useCartStore((s) => s.addItem)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY
    setIsDragging(true)
  }

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return
    const diff = clientY - dragStartY.current
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    if (dragY > 100) {
      handleClose()
    } else {
      setDragY(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientY)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    handleDragMove(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    handleDragEnd()
  }

  const handleSelectionChange = (
    groupId: string,
    value: SelectedOption | SelectedOption[],
  ) => {
    setSelections((prev) => ({ ...prev, [groupId]: value }))
  }

  const isValid = useMemo(() => {
    return product.modifierGroups.every((group) => {
      if (!group.isRequired) return true
      const sel = selections[group.id]
      if (group.type === 'single') {
        return !!sel && !Array.isArray(sel)
      }
      return Array.isArray(sel) && sel.length > 0
    })
  }, [product.modifierGroups, selections])

  const extraPrice = useMemo(() => {
    return Object.values(selections).reduce((sum, val) => {
      if (Array.isArray(val)) {
        return sum + (val as SelectedOption[]).reduce((s, v) => s + v.extraPrice, 0)
      }
      return sum + (val as SelectedOption).extraPrice
    }, 0)
  }, [selections])

  const basePrice = product.finalPrice ?? product.price
  const subtotal = (basePrice + extraPrice) * qty

  const handleAdd = () => {
    if (!isValid) return
    const item: CartItem = {
      cartId: generateId(),
      product,
      qty,
      selections,
      extraPrice,
      observations: observations.trim() || undefined,
    }
    addItem(item)
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        tabIndex={-1}
        className={`relative max-h-[90dvh] flex flex-col max-w-[520px] mx-auto w-full overflow-hidden transition-opacity duration-300 outline-none ${isClosing ? 'animate-slide-down opacity-0' : 'animate-slide-up opacity-100'}`}
        style={{
          backgroundColor: STITCH.surface,
          borderTopLeftRadius: STITCH.radiusLg,
          borderTopRightRadius: STITCH.radiusLg,
          boxShadow: STITCH.shadowElev,
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drag pill — solo el handle arrastra el modal */}
        <div
          className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: STITCH.border }} />
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-2 min-h-0">
          <div className="flex flex-col items-center mb-4">
            {product.imageUrls.length > 0 ? (
              <div className="relative" style={{ width: 140, height: 140 }}>
                <Image
                  src={product.imageUrls[photoIndex]}
                  alt={product.name}
                  width={140}
                  height={140}
                  className="rounded-xl object-cover"
                  style={{ width: 140, height: 140 }}
                />
                {product.imageUrls.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex((i) => (i - 1 + product.imageUrls.length) % product.imageUrls.length)}
                      aria-label="Foto anterior"
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setPhotoIndex((i) => (i + 1) % product.imageUrls.length)}
                      aria-label="Foto siguiente"
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            ) : (
              <span className="text-7xl">{categoryEmoji}</span>
            )}
            {product.imageUrls.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {product.imageUrls.map((url, i) => (
                  <button
                    key={url + i}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: i === photoIndex ? STITCH.primary : STITCH.border }}
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold" style={{ color: STITCH.text }}>{product.name}</h2>
          {product.description && <p className="text-sm mt-1 mb-3" style={{ color: STITCH.muted }}>{product.description}</p>}
          <div className="flex items-center gap-2 mb-4">
            {product.discountPercent && product.finalPrice ? (
              <>
                <span className="line-through text-sm" style={{ color: '#9CA3AF' }}>
                  {formatPrice(product.price)}
                </span>
                <p className="font-bold text-lg" style={{ color: STITCH.primary }}>
                  {formatPrice(product.finalPrice)}
                </p>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#FED7AA', color: STITCH.tertiary }}>
                  -{product.discountPercent}%
                </span>
              </>
            ) : (
                <p className="font-bold text-lg" style={{ color: STITCH.primary }}>
                {formatPrice(product.price)}
              </p>
            )}
            {product.isOutOfStock && (
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: STITCH.errorBg, color: STITCH.error }}>
                Sin stock
              </span>
            )}
          </div>

          {product.modifierGroups.map((group: ModifierGroup) => (
            <ModifierGroupSection
              key={group.id}
              group={group}
              selections={selections}
              onChange={handleSelectionChange}
            />
          ))}

          <div className="mt-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-semibold text-sm" style={{ color: STITCH.text }}>Observaciones</h3>
              <span className="text-xs" style={{ color: STITCH.muted }}>{observations.length} / 150</span>
            </div>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value.slice(0, 150))}
              rows={2}
              placeholder="Si querés, agregá una aclaración para tu pedido..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border outline-none focus:bg-white resize-none transition-colors"
              style={{ borderColor: STITCH.border, backgroundColor: '#FAF9F6', color: STITCH.text }}
            />
          </div>
        </div>

        <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderTop: `1px solid ${STITCH.border}` }}>
          <div className="flex items-center gap-2 rounded-full px-2 py-1" style={{ backgroundColor: '#F4F2FD' }}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Disminuir cantidad"
              className="w-7 h-7 rounded-full shadow-sm font-bold text-lg flex items-center justify-center"
              style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              aria-label="Aumentar cantidad"
              className="w-7 h-7 rounded-full shadow-sm font-bold text-lg flex items-center justify-center"
              style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isValid || product.isOutOfStock}
            className={`flex-1 py-3 rounded-full font-bold text-sm text-white transition-opacity ${
              isValid && !product.isOutOfStock ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ backgroundColor: STITCH.primary }}
          >
            {product.isOutOfStock ? 'Sin stock' : `Agregar · ${formatPrice(subtotal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
