'use client'

import Image from 'next/image'
import type { Promotion } from '@/types/store'
import { formatPrice } from '@/lib/utils'

type Props = {
  promo: Promotion
  onSelect: () => void
}

export function PromoCard({ promo, onSelect }: Props) {
  // Count quantities of each product
  const productCounts: {[key: string]: {name: string; count: number}} = {}
  promo.products.forEach(p => {
    if (!productCounts[p.id]) {
      productCounts[p.id] = { name: p.name, count: 0 }
    }
    productCounts[p.id].count++
  })

  const productDisplay = Object.values(productCounts)
    .map(p => p.count > 1 ? `${p.count}x ${p.name}` : p.name)
    .join(', ')

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-2xl border border-zinc-100 overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col relative"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-zinc-50 flex items-center justify-center overflow-hidden">
        {promo.imageUrl ? (
          <Image
            src={promo.imageUrl}
            alt={promo.name}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-5xl">{promo.emoji}</span>
        )}
      </div>

      {/* Discount badge */}
      <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
        -{promo.discountPercent}%
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">
          {promo.name}
        </h3>
        {promo.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
            {promo.description}
          </p>
        )}
        <p className="text-xs text-zinc-500 mt-2">
          <span className="font-medium">Incluye:</span> {productDisplay}
        </p>
        <div className="flex items-baseline gap-2 mt-auto pt-3">
          <span className="text-xs text-zinc-400 line-through">{formatPrice(promo.originalPrice)}</span>
          <span className="font-bold text-sm text-orange-600">
            {formatPrice(promo.price)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-500">
            {promo.maxPerUser ? `Máx: ${promo.maxPerUser}` : 'Sin límite'}
          </span>
          <span className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-lg font-bold leading-none flex-shrink-0">
            +
          </span>
        </div>
      </div>
    </button>
  )
}
