'use client'

import { useState } from 'react'
import type { Product } from '@/types/store'
import { ProductCard } from './ProductCard'
import { ProductModal } from './ProductModal'

type Props = {
  product: Product
  categoryEmoji: string
}

export function ProductCardClient({ product, categoryEmoji }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ProductCard product={product} categoryEmoji={categoryEmoji} onSelect={() => setOpen(true)} />
      {open && <ProductModal product={product} categoryEmoji={categoryEmoji} onClose={() => setOpen(false)} />}
    </>
  )
}
