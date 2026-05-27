'use client'

import { useItemCount, useCartTotal } from '@/hooks/useHydratedCartStore'
import { formatPrice } from '@/lib/utils'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  onCartOpen: () => void
}

export function BottomBar({ onCartOpen }: Props) {
  const itemCount = useItemCount()
  const total = useCartTotal()

  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-3 pointer-events-none">
      <div className="max-w-[520px] mx-auto pointer-events-auto">
        <button
          onClick={onCartOpen}
          className="w-full flex items-center justify-between px-4 py-3 text-white rounded-2xl shadow-lg font-semibold"
          style={{ backgroundColor: STITCH.primary }}
        >
          <span className="bg-white/25 rounded-full px-2 py-0.5 text-sm font-bold">
            {itemCount}
          </span>
          <span className="text-sm font-semibold">Ver carrito</span>
          <span className="font-bold text-sm">{formatPrice(total)}</span>
        </button>
      </div>
    </div>
  )
}
