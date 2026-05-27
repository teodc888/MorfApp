'use client'

import Image from 'next/image'
import type { TenantPublic } from '@/types/store'
import { useItemCount } from '@/hooks/useHydratedCartStore'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  tenant: TenantPublic
  onCartOpen: () => void
}

export function MenuHeader({ tenant, onCartOpen }: Props) {
  const itemCount = useItemCount()

  return (
    <header className="sticky top-0 z-30" style={{ backgroundColor: STITCH.primary, borderBottom: `1px solid ${STITCH.border}` }}>
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-[1200px] mx-auto w-full gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {tenant.branding.logoUrl ? (
            <Image
              src={tenant.branding.logoUrl}
              alt={tenant.name}
              width={40}
              height={40}
              className="rounded-full object-cover flex-shrink-0 border"
              style={{ borderColor: '#FFFFFF50' }}
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
            {tenant.branding.tagline && <p className="text-xs truncate text-white/80">{tenant.branding.tagline}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border" style={{ backgroundColor: tenant.isOpen ? '#ECFDF5' : '#FEF2F2', color: tenant.isOpen ? '#166534' : '#B91C1C', borderColor: tenant.isOpen ? '#BBF7D0' : '#FECACA' }}>
            <span className={`w-1.5 h-1.5 rounded-full ${tenant.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            {tenant.isOpen ? 'Abierto' : 'Cerrado'}
          </span>

          <button
            onClick={onCartOpen}
            aria-label="Ver carrito"
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            style={{ backgroundColor: STITCH.primary, color: '#FFFFFF', boxShadow: STITCH.shadow }}
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
