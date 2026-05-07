'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getTenantFromToken } from '@/lib/auth'
import { STITCH } from '@/lib/stitch-theme'

type NavItem = {
  label: string
  emoji: string
  href: string
  segment: string
}

const NAV: NavItem[] = [
  { label: 'Pedidos', emoji: '🧾', href: 'orders', segment: 'orders' },
  { label: 'Métricas', emoji: '📈', href: 'metrics', segment: 'metrics' },
  { label: 'Carta', emoji: '📋', href: 'menu', segment: 'menu' },
  { label: 'Opciones', emoji: '✨', href: 'modifiers', segment: 'modifiers' },
  { label: 'Promos', emoji: '🎁', href: 'promotions', segment: 'promotions' },
  { label: 'Proveedores', emoji: '🏭', href: 'proveedores', segment: 'proveedores' },
  { label: 'Insumos', emoji: '📦', href: 'insumos', segment: 'insumos' },
  { label: 'Apariencia', emoji: '🎨', href: 'branding', segment: 'branding' },
  { label: 'WhatsApp', emoji: '💬', href: 'whatsapp', segment: 'whatsapp' },
  { label: 'Config.', emoji: '⚙️', href: 'config', segment: 'config' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const base = '/admin'

  const isLoginPage = pathname.endsWith('/login')
  const authenticated = isLoginPage || isAuthenticated()
  const tenant = getTenantFromToken() || 'Mi negocio'

  useEffect(() => {
    if (isLoginPage) return
    if (!isAuthenticated()) {
      router.replace(`${base}/login`)
    }
  }, [base, isLoginPage, router])

  // Login page renders immediately — no auth check needed
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: STITCH.bg }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: STITCH.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const isActive = (segment: string) => pathname.includes(`${base}/${segment}`)

  return (
    <div className="min-h-screen flex w-full max-w-screen overflow-x-hidden" style={{ backgroundColor: STITCH.bg }}>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full z-20" style={{ backgroundColor: STITCH.surface, borderRight: `1px solid ${STITCH.border}` }}>
        <div className="h-16 flex items-center px-5" style={{ borderBottom: `1px solid ${STITCH.border}` }}>
          <span className="font-bold text-lg" style={{ color: STITCH.primary }}>MorfApp</span>
          <span className="ml-1 text-xs font-normal" style={{ color: STITCH.muted }}>admin</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.segment}
              href={`${base}/${item.href}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(item.segment)
                  ? 'text-white'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isActive(item.segment) ? STITCH.primary : 'transparent',
                color: isActive(item.segment) ? '#FFFFFF' : STITCH.muted,
              }}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4" style={{ borderTop: `1px solid ${STITCH.border}` }}>
          <p className="text-xs truncate" style={{ color: STITCH.muted }}>{tenant}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full max-w-screen overflow-x-hidden">
        <header className="md:hidden h-14 flex items-center px-4 sticky top-0 z-10" style={{ backgroundColor: STITCH.surface, borderBottom: `1px solid ${STITCH.border}` }}>
          <span className="font-bold" style={{ color: STITCH.primary }}>MorfApp</span>
          <span className="ml-1 text-xs" style={{ color: STITCH.muted }}>admin</span>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom tabs mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-screen max-w-none z-20 flex" style={{ backgroundColor: STITCH.surface, borderTop: `1px solid ${STITCH.border}` }}>
        {NAV.map((item) => (
          <Link
            key={item.segment}
            href={`${base}/${item.href}`}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive(item.segment) ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: isActive(item.segment) ? STITCH.primary : 'transparent',
              color: isActive(item.segment) ? '#FFFFFF' : STITCH.muted,
            }}
          >
            <span className="text-xl mb-0.5">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
