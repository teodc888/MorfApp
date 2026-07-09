'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAuthenticated, getTenantFromToken, isOwner } from '@/lib/auth'
import { logout, getAdminMe, updateTenantPause } from '@/lib/admin-api'
import { PlanProvider, usePlan } from '@/contexts/PlanContext'
import { FEATURE_PLAN, PLAN_LABEL, planHasAccess } from '@/lib/plan'
import type { TenantAdmin } from '@/types/store'

const NAV_ADMIN = [
  { href: 'orders',      label: 'Pedidos',       icon: 'receipt_long',    ownerOnly: false },
  { href: 'metrics',     label: 'Métricas',      icon: 'bar_chart',       ownerOnly: true  },
  { href: 'menu',        label: 'Carta',          icon: 'restaurant_menu', ownerOnly: false },
  { href: 'modifiers',   label: 'Opciones',       icon: 'tune',            ownerOnly: false },
  { href: 'promotions',  label: 'Promos',         icon: 'redeem',          ownerOnly: false },
  { href: 'proveedores', label: 'Proveedores',    icon: 'local_shipping',  ownerOnly: true  },
  { href: 'insumos',     label: 'Insumos',        icon: 'inventory_2',     ownerOnly: true  },
  { href: 'empleados',   label: 'Empleados',      icon: 'badge',           ownerOnly: true  },
]

const NAV_CONFIG = [
  { href: 'branding',    label: 'Apariencia',     icon: 'palette'  },
  { href: 'whatsapp',    label: 'WhatsApp',       icon: 'chat'     },
  { href: 'config',      label: 'Configuración',  icon: 'settings' },
]

const OWNER_ONLY_ROUTES = ['metrics', 'proveedores', 'insumos', 'empleados', 'branding', 'whatsapp', 'config']

const PLAN_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  Basico:  { bg: 'var(--surface-container-high)', color: 'var(--muted)' },
  Pro:     { bg: '#dbeafe', color: '#1d4ed8' },
  Negocio: { bg: '#fef3c7', color: '#92400e' },
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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

function NavItem({ item, active, onClick }: {
  item: typeof NAV_ADMIN[0]
  active: boolean
  onClick?: () => void
}) {
  const plan = usePlan()
  const requiredPlan = FEATURE_PLAN[item.href]
  const locked = requiredPlan ? !planHasAccess(plan, requiredPlan) : false
  const base = '/admin'

  return (
    <Link
      href={`${base}/${item.href}`}
      onClick={onClick}
      title={locked ? `Requiere plan ${PLAN_LABEL[requiredPlan!]}` : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '11px 14px', borderRadius: 12, marginBottom: 2,
        textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'var(--on-primary)' : locked ? 'var(--muted)' : 'var(--text)',
        boxShadow: active ? '0 4px 14px rgba(249,115,22,.35)' : 'none',
        transition: 'background .15s ease, color .15s ease',
        opacity: locked ? 0.65 : 1,
      }}>
      <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {locked && !active && (
        <span className="mat" style={{ fontSize: 16, opacity: 0.7 }}>lock</span>
      )}
    </Link>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const plan = usePlan()
  const base = '/admin'

  const isLoginPage = pathname.endsWith('/login')

  useEffect(() => {
    setMounted(true)
    if (isLoginPage) return
    if (!isAuthenticated()) { router.replace(`${base}/login`); return }
    const isRestricted = OWNER_ONLY_ROUTES.some(r => pathname.includes(`${base}/${r}`))
    if (isRestricted && !isOwner()) router.replace(`${base}/orders`)
  }, [base, isLoginPage, pathname, router])

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

  async function handleLogout() {
    await logout()
    router.replace(`${base}/login`)
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
  const owner = isOwner()
  const visibleAdminNav = NAV_ADMIN.filter(item => !item.ownerOnly || owner)
  const isActive = (href: string) => pathname.includes(`${base}/${href}`)

  const planBadge = PLAN_BADGE_STYLE[plan] ?? PLAN_BADGE_STYLE.Basico

  const SidebarContent = () => (
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
        <div style={{ marginBottom: 20 }}>
          <div style={{ paddingLeft: 14, marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Administración
          </div>
          {visibleAdminNav.map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={() => setDrawerOpen(false)} />
          ))}
        </div>

        {owner && (
          <div>
            <div style={{ paddingLeft: 14, marginBottom: 10, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configuración
            </div>
            {NAV_CONFIG.map(item => {
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={`${base}/${item.href}`} onClick={() => setDrawerOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 14px', borderRadius: 12, marginBottom: 2,
                  textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? 'var(--on-primary)' : 'var(--text)',
                  boxShadow: active ? '0 4px 14px rgba(249,115,22,.35)' : 'none',
                  transition: 'background .15s ease, color .15s ease',
                }}>
                  <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 22px 20px', borderTop: '1px solid var(--outline-soft)' }}>
        {owner && adminMe && (
          <PauseToggle
            isPaused={adminMe.isPaused}
            isPending={pauseMutation.isPending}
            onToggle={handleTogglePause}
          />
        )}
        {owner && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20, marginBottom: 10,
            background: planBadge.bg, color: planBadge.color,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <span className="mat fill" style={{ fontSize: 13 }}>workspace_premium</span>
            Plan {PLAN_LABEL[plan]}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'var(--surface-container-high)', color: 'var(--primary-dark)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14,
          }}>{initials(tenant)}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant}</span>
            {!owner && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Empleado</span>}
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: 4, borderRadius: 8,
            display: 'grid', placeItems: 'center',
            transition: 'color .15s ease',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <span className="mat" style={{ fontSize: 20 }}>logout</span>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex" style={{
        flexDirection: 'column', width: 260, position: 'fixed',
        top: 0, left: 0, height: '100%', zIndex: 20,
        background: 'var(--surface)', borderRight: '1px solid var(--outline-soft)',
      }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="drawer-backdrop md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="drawer md:hidden" role="dialog" aria-modal="true" style={{ display: 'flex' }}>
            <SidebarContent />
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
          <button onClick={() => setDrawerOpen(true)} className="tap" aria-label="Abrir menú de navegación" style={{
            width: 44, height: 44, borderRadius: 22,
            display: 'grid', placeItems: 'center',
            background: 'var(--surface-container)', color: 'var(--text)',
          }}>
            <span className="mat">menu</span>
          </button>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <span className="mat fill" style={{ color: 'var(--primary)', fontSize: 22 }}>restaurant</span>
            <span className="serif" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em' }}>MorfApp</span>
          </div>

          {/* Toggle de pausa de tienda (solo owner) */}
          {owner && adminMe ? (
            <PauseToggle
              isPaused={adminMe.isPaused}
              isPending={pauseMutation.isPending}
              onToggle={handleTogglePause}
              compact
            />
          ) : (
            <div style={{ width: 44 }} />
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </PlanProvider>
  )
}
