'use client'

import { useState } from 'react'
import type { Promotion } from '@/types/store'
import { PromoCard } from './PromoCard'
import { PromoModal } from './PromoModal'

type Props = {
  promo: Promotion
}

export function PromoCardClient({ promo }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <PromoCard promo={promo} onSelect={() => setOpen(true)} />
      {open && <PromoModal promo={promo} onClose={() => setOpen(false)} />}
    </>
  )
}
