'use client'

import Image from 'next/image'
import type { Product } from '@/types/store'
import { formatPrice } from '@/lib/utils'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  product: Product
  categoryEmoji: string
  onSelect: (product: Product) => void
}

export function ProductCard({ product, categoryEmoji, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="w-full overflow-hidden text-left hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col"
      style={{ backgroundColor: STITCH.surface, border: `1px solid ${STITCH.border}`, borderRadius: STITCH.radius, boxShadow: STITCH.shadow }}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden" style={{ backgroundColor: STITCH.bg }}>
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
        <h3 className="font-bold text-sm leading-snug line-clamp-2" style={{ color: STITCH.text }}>
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: STITCH.muted }}>
            {product.description}
          </p>
        )}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: '#F4F2FD', color: STITCH.muted }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3">
          <div className="flex items-center gap-1.5">
            {product.discountPercent && product.finalPrice ? (
              <>
                <span className="line-through text-xs" style={{ color: '#9CA3AF' }}>
                  {formatPrice(product.price)}
                </span>
                <span className="font-bold text-sm" style={{ color: STITCH.primary }}>
                  {formatPrice(product.finalPrice)}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FED7AA', color: STITCH.tertiary }}>
                  -{product.discountPercent}%
                </span>
              </>
            ) : (
              <span className="font-bold text-sm" style={{ color: STITCH.primary }}>
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <span className="w-9 h-9 rounded-full text-white flex items-center justify-center text-lg font-bold leading-none flex-shrink-0" style={{ backgroundColor: STITCH.primary }}>
            +
          </span>
        </div>
      </div>
    </button>
  )
}
