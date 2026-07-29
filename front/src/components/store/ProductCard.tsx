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
  const outOfStock = product.isOutOfStock

  return (
    <button
      onClick={() => onSelect(product)}
      className="w-full overflow-hidden text-left hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col relative"
      style={{ backgroundColor: STITCH.surface, border: `1px solid ${STITCH.border}`, borderRadius: STITCH.radius, boxShadow: STITCH.shadow }}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden" style={{ backgroundColor: STITCH.bg }}>
        {product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-5xl">{categoryEmoji}</span>
        )}
        {outOfStock && (
          <>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
            <span
              className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: STITCH.errorBg, color: STITCH.error }}
            >
              Sin stock
            </span>
          </>
        )}
      </div>

      {/* Body */}
      <div className={`flex flex-col flex-1 p-3 ${outOfStock ? 'opacity-60' : ''}`}>
        <h3 className="font-bold text-sm leading-snug line-clamp-2" style={{ color: STITCH.text }}>
          {product.name}
        </h3>
        <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: STITCH.muted, minHeight: '2.5rem' }}>
          {product.description || ''}
        </p>
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
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#EA580C', color: '#FFFFFF' }}>
                  -{product.discountPercent}%
                </span>
              </>
            ) : (
              <span className="font-bold text-sm" style={{ color: STITCH.primary }}>
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: outOfStock ? '#E5E7EB' : STITCH.primary,
              color: outOfStock ? '#9CA3AF' : '#FFFFFF',
              opacity: outOfStock ? 0.7 : 1,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
        </div>
      </div>
    </button>
  )
}
