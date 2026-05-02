'use client'

import Image from 'next/image'
import type { Promotion, Product } from '@/types/store'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'

type Props = {
  promo: Promotion
}

export function PromoCard({ promo }: Props) {
  const addItem = useCartStore(s => s.addItem)

  const handleAdd = () => {
    const synthetic: Product = {
      id: `promo:${promo.id}`,
      name: promo.name,
      description: promo.description,
      price: promo.price,
      emoji: promo.emoji,
      imageUrl: promo.imageUrl,
      tags: [],
      modifierGroups: [],
    }
    addItem({
      cartId: crypto.randomUUID(),
      product: synthetic,
      qty: 1,
      selections: {},
      extraPrice: 0,
    })
  }

  const productNames = promo.products.map(p => p.name).join(', ')

  return (
    <button
      onClick={handleAdd}
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
          <span className="font-medium">Incluye:</span> {productNames}
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
