'use client'

import Image from 'next/image'
import type { Product } from '@/types/store'
import { formatPrice } from '@/lib/utils'

type Props = {
  product: Product
  categoryEmoji: string
  onSelect: (product: Product) => void
}

export function ProductCard({ product, categoryEmoji, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="w-full bg-white rounded-2xl border border-zinc-100 overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-zinc-50 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-5xl">{categoryEmoji}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] font-medium bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3">
          <div className="flex items-center gap-1.5">
            {product.discountPercent && product.finalPrice ? (
              <>
                <span className="line-through text-xs text-zinc-400">
                  {formatPrice(product.price)}
                </span>
                <span className="font-bold text-sm text-primary">
                  {formatPrice(product.finalPrice)}
                </span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                  -{product.discountPercent}%
                </span>
              </>
            ) : (
              <span className="font-bold text-sm text-primary">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold leading-none flex-shrink-0">
            +
          </span>
        </div>
      </div>
    </button>
  )
}
