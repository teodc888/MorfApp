'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAuthenticated, getTenantFromToken, isPlanPro } from '@/lib/auth'
import { getAdminMe, updateTenantPause } from '@/lib/admin-api'
import type { TenantAdmin } from '@/types/store'

const NAV_ADMIN = [
  { href: 'orders',      label: 'Pedidos',       icon: 'receipt_long',    proOnly: false },
  { href: 'metrics',     label: 'Métricas',      icon: 'bar_chart',       proOnly: false },
  { href: 'menu',        label: 'Carta',          icon: 'restaurant_menu', proOnly: false },
  { href: 'modifiers',   label: 'Opciones',       icon: 'tune',            proOnly: false },
  { href: 'promotions',  label: 'Promos',         icon: 'redeem',          proOnly: false },
  { href: 'proveedores', label: 'Proveedores',    icon: 'local_shipping',  proOnly: true  },
  { href: 'insumos',     label: 'Insumos',        icon: 'inventory_2',     proOnly: true  },
]

const NAV_CONFIG = [
  { href: 'branding',    label: 'Apariencia',     icon: 'palette'         },
  { href: 'whatsapp',    label: 'WhatsApp',       icon: 'chat'            },
  { href: 'config',      label: 'Configuración',  icon: 'settings'        },
]

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function PlanBadge({ proPlan }: { proPlan: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20,
      background: proPlan ? 'linear-gradient(90deg,#f97316,#fb923c)' : 'var(--outline-soft)',
      color: proPlan ? '#fff' : 'var(--muted)',
    }}>
      {proPlan ? 'Pro' : 'Básico'}
    </span>
  )
}

function PauseToggle({ isPaused, isPending, onToggle, compact }: {
  isPaused: boolean
  isPending: boolean
  onToggle: () => void
  compact?: boolean
}) {
  if (compact) {
    const label = isPaused ? 'Tienda pausada — click para reabrir' : 'Tienda abierta — click para pausar'
    return (
      <button
        onClick={onToggle}
        disabled={isPending}
        title={label}
        aria-label={label}
        className="tap"
        style={{
          width: 38, height: 38, borderRadius: 19,
          display: 'grid', placeItems: 'center',
          background: isPaused ? 'rgba(239,68,68,0.14)' : 'var(--surface-container)',
          border: isPaused ? '1px solid #ef4444' : '1px solid transparent',
          opacity: isPending ? 0.6 : 1,
          cursor: isPending ? 'default' : 'pointer',
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: 5, flexShrink: 0,
          background: isPaused ? '#ef4444' : '#22c55e',
        }} />
      </button>
    )
  }

  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '9px 12px', borderRadius: 10, marginBottom: 10,
        border: '1px solid ' + (isPaused ? '#ef4444' : 'var(--outline-soft)'),
        background: isPaused ? 'rgba(239,68,68,0.10)' : 'var(--surface-container)',
        color: isPaused ? '#ef4444' : 'var(--text)',
        cursor: isPending ? 'default' : 'pointer',
        fontSize: 12.5, fontWeight: 600, textAlign: 'left',
        opacity: isPending ? 0.65 : 1,
        transition: 'background .15s ease, border-color .15s ease',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: 4, flexShrink: 0,
        background: isPaused ? '#ef4444' : '#22c55e',
      }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isPending ? 'Actualizando…' : (isPaused ? 'Pausada — no se reciben pedidos' : 'Tienda abierta')}
      </span>
    </button>
  )
}

/**
 * Contenido compartido entre el sidebar desktop y el drawer mobile:
 * logo, nav (secciones "Administración" y "Configuración") y footer
 * (PauseToggle + avatar/nombre del tenant).
 *
 * `linkPadding` / `linkTransition` y `showPlanBadge` / `nameMaxWidth` existen
 * porque el desktop y el mobile tenían pequeñas diferencias de estilo entre
 * sí (padding de los links, si se muestra el PlanBadge, el maxWidth del
 * nombre) — se preservan tal cual estaban antes del refactor.
 */
function NavContent({
  visibleNavAdmin,
  pathname,
  base,
  onNavigate,
  linkPadding = '11px 14px',
  linkTransition = 'background .15s ease, color .15s ease',
  tenant,
  proPlan,
  showPlanBadge = true,
  nameMaxWidth = 160,
  adminMe,
  isPending,
  onTogglePause,
}: {
  visibleNavAdmin: typeof NAV_ADMIN
  pathname: string
  base: string
  onNavigate?: () => void
  linkPadding?: string
  linkTransition?: string
  tenant: string
  proPlan: boolean
  showPlanBadge?: boolean
  nameMaxWidth?: number
  adminMe: TenantAdmin | undefined
  isPending: boolean
  onTogglePause: () => void
}) {
  const isActive = (href: string) => pathname.includes(`${base}/${href}`)

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 22px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mat fill" style={{ color: 'var(--primary)', fontSize: 24 }}>restaurant</span>
        <span className="serif" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em' }}>MorfApp</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>admin</span>
      </div>
      <div className="divider" style={{ margin: '0 22px 12px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
        {/* Administración section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ paddingLeft: 14, marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Administración
          </div>
          {visibleNavAdmin.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={`${base}/${item.href}`} onClick={onNavigate} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: linkPadding, borderRadius: 12, marginBottom: 2,
                textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--on-primary)' : 'var(--text)',
                boxShadow: active ? '0 4px 14px rgba(249,115,22,.35)' : 'none',
                ...(linkTransition ? { transition: linkTransition } : {}),
              }}>
                <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Configuración section */}
        <div>
          <div style={{ paddingLeft: 14, marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Configuración
          </div>
          {NAV_CONFIG.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={`${base}/${item.href}`} onClick={onNavigate} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: linkPadding, borderRadius: 12, marginBottom: 2,
                textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--on-primary)' : 'var(--text)',
                boxShadow: active ? '0 4px 14px rgba(249,115,22,.35)' : 'none',
                ...(linkTransition ? { transition: linkTransition } : {}),
              }}>
                <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 22px 20px', borderTop: '1px solid var(--outline-soft)' }}>
        {adminMe && (
          <PauseToggle
            isPaused={adminMe.isPaused}
            isPending={isPending}
            onToggle={onTogglePause}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'var(--surface-container-high)', color: 'var(--primary-dark)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14,
          }}>{initials(tenant)}</div>
          {showPlanBadge ? (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: nameMaxWidth }}>{tenant}</span>
              <PlanBadge proPlan={proPlan} />
            </div>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: nameMaxWidth }}>{tenant}</span>
          )}
        </div>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const base = '/admin'

  const isLoginPage = pathname.endsWith('/login')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (isLoginPage) return
    if (!isAuthenticated()) router.replace(`${base}/login`)
  }, [base, isLoginPage, router])

  useEffect(() => {
    if (!drawerOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  const { data: adminMe } = useQuery({
    queryKey: ['admin-me'],
    queryFn: getAdminMe,
    enabled: mounted && !isLoginPage,
  })

  const pauseMutation = useMutation({
    mutationFn: (next: boolean) => updateTenantPause(next),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-me'], (old: TenantAdmin | undefined) =>
        old ? { ...old, isPaused: data.isPaused } : old
      )
      toast.success(data.isPaused ? 'Tienda pausada — no se recibirán nuevos pedidos' : 'Tienda reabierta')
    },
    onError: () => {
      toast.error('No se pudo actualizar el estado de la tienda')
    },
  })

  const handleTogglePause = () => {
    if (!adminMe || pauseMutation.isPending) return
    pauseMutation.mutate(!adminMe.isPaused)
  }

  if (isLoginPage) return <>{children}</>

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const tenant = getTenantFromToken() || 'Mi negocio'
  const proPlan = isPlanPro()

  const visibleNavAdmin = NAV_ADMIN.filter(item => !item.proOnly || proPlan)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex" style={{
        flexDirection: 'column', width: 260, position: 'fixed',
        top: 0, left: 0, height: '100%', zIndex: 20,
        background: 'var(--surface)', borderRight: '1px solid var(--outline-soft)',
      }}>
        <NavContent
          visibleNavAdmin={visibleNavAdmin}
          pathname={pathname}
          base={base}
          tenant={tenant}
          proPlan={proPlan}
          adminMe={adminMe}
          isPending={pauseMutation.isPending}
          onTogglePause={handleTogglePause}
        />
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="drawer-backdrop md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="drawer md:hidden" role="dialog" aria-modal="true" style={{ display: 'flex' }}>
            <NavContent
              visibleNavAdmin={visibleNavAdmin}
              pathname={pathname}
              base={base}
              onNavigate={() => setDrawerOpen(false)}
              linkPadding="12px 14px"
              linkTransition={undefined}
              tenant={tenant}
              proPlan={proPlan}
              showPlanBadge={false}
              nameMaxWidth={200}
              adminMe={adminMe}
              isPending={pauseMutation.isPending}
              onTogglePause={handleTogglePause}
            />
          </div>
        </>
      )}

      {/* ── Main content area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="md:ml-[260px]">

        {/* Mobile TopBar */}
        <header className="md:hidden flex" style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg)',
          alignItems: 'center', padding: '14px 18px 10px',
        }}>
          {/* Hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="tap" aria-label="Abrir menú de navegación" style={{
            width: 38, height: 38, borderRadius: 19,
            display: 'grid', placeItems: 'center',
            background: 'var(--surface-container)', color: 'var(--text)',
          }}>
            <span className="mat">menu</span>
          </button>

          {/* Brand center */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <span className="mat fill" style={{ color: 'var(--primary)', fontSize: 22 }}>restaurant</span>
            <span className="serif" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em' }}>MorfApp</span>
          </div>

          {/* Toggle de pausa de tienda */}
          {adminMe ? (
            <PauseToggle
              isPaused={adminMe.isPaused}
              isPending={pauseMutation.isPending}
              onToggle={handleTogglePause}
              compact
            />
          ) : (
            <div style={{ width: 38 }} />
          )}
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px 16px 24px' }} className="md:p-8 md:pt-8 md:pb-8">
          <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { fontFamily: 'var(--sans)', fontSize: 14 },
          duration: 3000,
        }}
      />
    </div>
  )
}
