'use client'

import { useState } from 'react'
import type { TenantPublic, Category } from '@/types/store'
import { MenuHeader } from './MenuHeader'
import { BottomBar } from './BottomBar'
import { CartModal } from './CartModal'
import { CategorySidebar } from './CategorySidebar'
import { CategoryTabs } from './CategoryTabs'
import { DeliveryChips } from './DeliveryChips'

type Props = {
  tenant: TenantPublic
  categories: Category[]
  children: React.ReactNode
}

export function StoreShell({ tenant, categories, children }: Props) {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <MenuHeader tenant={tenant} onCartOpen={() => setCartOpen(true)} />

      {/* Mobile category pills — sticky within the page, not wrapped in a fixed-height div */}
      {categories.length > 0 && <CategoryTabs categories={categories} />}

      {/* Page layout */}
      <div className="w-full md:max-w-[1200px] md:mx-auto md:px-6 md:py-7 md:flex md:gap-6 md:items-start">

        {/* Sidebar — desktop only */}
        {categories.length > 0 && (
          <aside className="hidden md:block w-[220px] flex-shrink-0 sticky top-20">
            <CategorySidebar categories={categories} />
          </aside>
        )}

        {/* Main content */}
        <main className="min-w-0 pb-28 px-4 pt-4 md:flex-1 md:px-0 md:pt-0">
          <DeliveryChips deliveryConfig={tenant.deliveryConfig} />
          {children}
        </main>
      </div>

      <BottomBar onCartOpen={() => setCartOpen(true)} />
      {cartOpen && (
        <CartModal tenant={tenant} onClose={() => setCartOpen(false)} />
      )}
    </div>
  )
}
