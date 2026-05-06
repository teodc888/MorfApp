'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getTenantFromToken } from '@/lib/auth'

const NAV_ALL = [
  { href: 'orders',      label: 'Pedidos',       icon: 'receipt_long'    },
  { href: 'metrics',     label: 'Métricas',      icon: 'bar_chart'       },
  { href: 'menu',        label: 'Carta',          icon: 'restaurant_menu' },
  { href: 'modifiers',   label: 'Opciones',       icon: 'tune'            },
  { href: 'promotions',  label: 'Promos',         icon: 'redeem'          },
  { href: 'proveedores', label: 'Proveedores',    icon: 'local_shipping'  },
  { href: 'insumos',     label: 'Insumos',        icon: 'inventory_2'     },
  { href: 'branding',    label: 'Apariencia',     icon: 'palette'         },
  { href: 'whatsapp',    label: 'WhatsApp',       icon: 'chat'            },
  { href: 'config',      label: 'Configuración',  icon: 'settings'        },
]

const NAV_BOTTOM = [
  { href: 'orders',  label: 'Pedidos',  icon: 'receipt_long' },
  { href: 'metrics', label: 'Métricas', icon: 'bar_chart'    },
  { href: 'insumos', label: 'Insumos',  icon: 'inventory_2'  },
]

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const base = '/admin'

  const isLoginPage = pathname.endsWith('/login')

  useEffect(() => {
    setMounted(true)
    if (isLoginPage) return
    if (!isAuthenticated()) router.replace(`${base}/login`)
  }, [base, isLoginPage, router])

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

  const isActive = (href: string) => pathname.includes(`${base}/${href}`)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex" style={{
        flexDirection: 'column', width: 260, position: 'fixed',
        top: 0, left: 0, height: '100%', zIndex: 20,
        background: 'var(--surface)', borderRight: '1px solid var(--outline-soft)',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 22px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mat fill" style={{ color: 'var(--primary)', fontSize: 24 }}>restaurant</span>
          <span className="serif" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em' }}>MorfApp</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>admin</span>
        </div>
        <div className="divider" style={{ margin: '0 22px 12px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
          {NAV_ALL.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={`${base}/${item.href}`} style={{
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
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 22px 20px', borderTop: '1px solid var(--outline-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: 'var(--surface-container-high)', color: 'var(--primary-dark)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14,
            }}>{initials(tenant)}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{tenant}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="drawer-backdrop md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="drawer md:hidden" style={{ display: 'flex' }}>
            <div style={{ padding: '20px 22px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mat fill" style={{ color: 'var(--primary)', fontSize: 24 }}>restaurant</span>
              <span className="serif" style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: '-0.02em' }}>MorfApp</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>admin</span>
            </div>
            <div className="divider" style={{ margin: '0 22px 12px' }} />
            <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
              {NAV_ALL.map(item => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={`${base}/${item.href}`} onClick={() => setDrawerOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 14px', borderRadius: 12, marginBottom: 2,
                    textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? 'var(--on-primary)' : 'var(--text)',
                    boxShadow: active ? '0 4px 14px rgba(249,115,22,.35)' : 'none',
                  }}>
                    <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div style={{ padding: '12px 22px 20px', borderTop: '1px solid var(--outline-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: 'var(--surface-container-high)', color: 'var(--primary-dark)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 14,
                }}>{initials(tenant)}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{tenant}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Main content area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="md:ml-[260px]">

        {/* Mobile TopBar */}
        <header className="md:hidden" style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', padding: '14px 18px 10px',
        }}>
          {/* Hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="tap" style={{
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

          {/* Notification bell */}
          <button className="tap" style={{
            width: 38, height: 38, borderRadius: 19,
            display: 'grid', placeItems: 'center',
            background: 'var(--surface-container)', color: 'var(--text)', position: 'relative',
          }}>
            <span className="mat">notifications</span>
            <span style={{
              position: 'absolute', top: 8, right: 9,
              width: 8, height: 8, borderRadius: 4,
              background: 'var(--primary)', border: '2px solid var(--surface-container)',
            }} />
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '0 0 88px' }} className="md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile BottomNav (3 tabs) ─────────────────────────────── */}
      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 16px 18px',
        background: 'var(--surface)', borderTop: '1px solid var(--outline-soft)',
      }}>
        {NAV_BOTTOM.map(tab => {
          const active = isActive(tab.href)
          return (
            <Link key={tab.href} href={`${base}/${tab.href}`} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '6px 18px', borderRadius: 12, minWidth: 78, textDecoration: 'none',
              background: active ? 'var(--surface-container-high)' : 'transparent',
              color: active ? 'var(--primary-dark)' : 'var(--muted)',
              fontWeight: active ? 700 : 500, fontSize: 11,
              transition: 'background .15s ease, color .15s ease',
            }}>
              <span className={`mat${active ? ' fill' : ''}`} style={{ fontSize: 22 }}>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
