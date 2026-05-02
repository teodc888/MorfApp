'use client'

import Image from 'next/image'
import type { TenantPublic } from '@/types/store'
import { useCartStore } from '@/store/cart'

type Props = {
  tenant: TenantPublic
  onCartOpen: () => void
}

export function MenuHeader({ tenant, onCartOpen }: Props) {
  const itemCount = useCartStore((s) => s.itemCount())

  return (
    <header className="sticky top-0 z-30 bg-primary shadow-md">
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-[1200px] mx-auto w-full gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {tenant.branding.logoUrl ? (
            <Image
              src={tenant.branding.logoUrl}
              alt={tenant.name}
              width={40}
              height={40}
              className="rounded-full object-cover flex-shrink-0 border-2 border-white/30"
            />
          ) : (
            <span className="text-2xl flex-shrink-0 leading-none">
              {tenant.branding.emojiIcon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate text-white">
              {tenant.name}
            </h1>
            {tenant.branding.tagline && (
              <p className="text-xs text-white/70 truncate">{tenant.branding.tagline}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            tenant.isOpen ? 'bg-white/20 text-white' : 'bg-black/25 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tenant.isOpen ? 'bg-green-300' : 'bg-red-300'}`} />
            {tenant.isOpen ? 'Abierto' : 'Cerrado'}
          </span>

          <button
            onClick={onCartOpen}
            aria-label="Ver carrito"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <span>🛒</span>
            {itemCount > 0 ? (
              <span>{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
            ) : (
              <span className="hidden sm:inline">Carrito</span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
