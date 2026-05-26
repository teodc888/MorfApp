'use client'

import { useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import type { Promotion, ModifierGroup, SelectedOption, CartItem } from '@/types/store'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'

function generateId(): string {
  return crypto.randomUUID()
}

type Selections = Record<string, SelectedOption | SelectedOption[]>

type Props = {
  promo: Promotion
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
          <h3 className="font-semibold text-zinc-800 text-sm">{group.name}</h3>
          {group.isRequired && (
            <span className="text-[10px] font-bold uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
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
          <span className="text-[10px] font-bold uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
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

export function PromoModal({ promo, onClose }: Props) {
  const [qty, setQty] = useState(1)
  const [selections, setSelections] = useState<Selections>({})
  const [observations, setObservations] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const addItem = useCartStore((s) => s.addItem)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

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
    return promo.modifierGroups.every((group) => {
      if (!group.isRequired) return true
      const sel = selections[group.id]
      if (group.type === 'single') {
        return !!sel && !Array.isArray(sel)
      }
      return Array.isArray(sel) && sel.length > 0
    })
  }, [promo.modifierGroups, selections])

  const extraPrice = useMemo(() => {
    return Object.values(selections).reduce((sum, val) => {
      if (Array.isArray(val)) {
        return sum + (val as SelectedOption[]).reduce((s, v) => s + v.extraPrice, 0)
      }
      return sum + (val as SelectedOption).extraPrice
    }, 0)
  }, [selections])

  const subtotal = (promo.price + extraPrice) * qty

  const handleAdd = () => {
    if (!isValid) return
    const item: CartItem = {
      cartId: generateId(),
      product: {
        id: `promo:${promo.id}`,
        name: promo.name,
        description: promo.description,
        price: promo.price,
        emoji: promo.emoji,
        imageUrl: promo.imageUrl,
        tags: [],
        modifierGroups: promo.modifierGroups,
      },
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
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      <div
        className={`relative bg-white rounded-t-2xl max-h-[90dvh] flex flex-col max-w-[520px] mx-auto w-full overflow-hidden transition-opacity duration-300 ${
          isClosing ? 'animate-slide-down opacity-0' : 'animate-slide-up opacity-100'
        }`}
        style={{
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
          <div className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-2">
          <div className="flex justify-center mb-4">
            {promo.imageUrl ? (
              <Image
                src={promo.imageUrl}
                alt={promo.name}
                width={140}
                height={140}
                className="rounded-xl object-cover"
              />
            ) : (
              <span className="text-7xl">{promo.emoji}</span>
            )}
          </div>

          <h2 className="text-xl font-bold text-zinc-900">{promo.name}</h2>
          {promo.description && (
            <p className="text-sm text-zinc-500 mt-1 mb-3">{promo.description}</p>
          )}

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-sm text-zinc-400 line-through">{formatPrice(promo.originalPrice)}</span>
            <span className="font-bold text-lg text-primary">
              {formatPrice(promo.price)}
            </span>
            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
              -{promo.discountPercent}%
            </span>
          </div>

          {promo.products.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-zinc-800 text-sm mb-2">Incluye:</h3>
              <div className="flex flex-col gap-1">
                {Object.values(
                  promo.products.reduce((acc, product) => {
                    if (!acc[product.id]) {
                      acc[product.id] = { ...product, count: 0 }
                    }
                    acc[product.id].count++
                    return acc
                  }, {} as Record<string, typeof promo.products[0] & { count: number }>)
                ).map((product) => (
                  <div key={product.id} className="text-xs text-zinc-600">
                    {product.emoji} {product.name} — {formatPrice(product.price)}{product.count > 1 ? ` x${product.count}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {promo.modifierGroups.map((group: ModifierGroup) => (
            <ModifierGroupSection
              key={group.id}
              group={group}
              selections={selections}
              onChange={handleSelectionChange}
            />
          ))}

          <div className="mt-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-semibold text-zinc-800 text-sm">Observaciones</h3>
              <span className="text-xs text-zinc-400">{observations.length} / 150</span>
            </div>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value.slice(0, 150))}
              rows={2}
              placeholder="Si querés, agregá una aclaración para tu pedido..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50 outline-none focus:border-primary focus:bg-white resize-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-zinc-100 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-full px-2 py-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-full bg-white shadow-sm text-zinc-700 font-bold text-lg flex items-center justify-center"
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-7 h-7 rounded-full bg-white shadow-sm text-zinc-700 font-bold text-lg flex items-center justify-center"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-full font-bold text-sm text-white transition-opacity bg-primary ${
              isValid ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            Agregar · {formatPrice(subtotal)}
          </button>
        </div>
      </div>
    </div>
  )
}
