'use client'

import { useState, useMemo } from 'react'
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
  const addItem = useCartStore((s) => s.addItem)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
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

      <div className={`relative max-h-[90dvh] flex flex-col max-w-[520px] mx-auto w-full overflow-hidden transition-opacity duration-300 ${isClosing ? 'animate-slide-down opacity-0' : 'animate-slide-up opacity-100'}`} style={{ backgroundColor: STITCH.surface, borderTopLeftRadius: STITCH.radiusLg, borderTopRightRadius: STITCH.radiusLg, boxShadow: STITCH.shadowLg }}>
        <div className="flex-shrink-0 flex justify-between items-center px-4 pt-3 pb-1" style={{ borderBottom: `1px solid ${STITCH.border}` }}>
          <div className="w-10" />
          <button
            onClick={handleClose}
            className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
            aria-label="Cerrar modal"
          >
            <svg
              className="w-6 h-6 hover:text-zinc-600"
              style={{ color: STITCH.muted }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-2">
          <div className="flex justify-center mb-4">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={140}
                height={140}
                className="rounded-xl object-cover"
              />
            ) : (
              <span className="text-7xl">{categoryEmoji}</span>
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
              className="w-7 h-7 rounded-full shadow-sm font-bold text-lg flex items-center justify-center"
              style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-7 h-7 rounded-full shadow-sm font-bold text-lg flex items-center justify-center"
              style={{ backgroundColor: STITCH.surface, color: STITCH.text }}
            >
              +
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-full font-bold text-sm text-white transition-opacity ${
              isValid ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ backgroundColor: STITCH.primary }}
          >
            Agregar · {formatPrice(subtotal)}
          </button>
        </div>
      </div>
    </div>
  )
}
