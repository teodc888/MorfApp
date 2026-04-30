'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/auth'

type NavItem = {
  label: string
  emoji: string
  href: string
  segment: string
}

const NAV: NavItem[] = [
  { label: 'Carta', emoji: '📋', href: 'menu', segment: 'menu' },
  { label: 'Personaliz.', emoji: '✨', href: 'modifiers', segment: 'modifiers' },
  { label: 'Apariencia', emoji: '🎨', href: 'branding', segment: 'branding' },
  { label: 'WhatsApp', emoji: '💬', href: 'whatsapp', segment: 'whatsapp' },
  { label: 'Config.', emoji: '⚙️', href: 'config', segment: 'config' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ tenant: string }>()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  const isLoginPage = pathname.endsWith('/login')

  useEffect(() => {
    if (isLoginPage) return
    if (!isAuthenticated()) {
      router.replace(`/admin/login`)
      return
    }
    setReady(true)
  }, [isLoginPage, params.tenant, router])

  // Login page renders immediately — no auth check needed
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const base = `/admin`

  const isActive = (segment: string) => pathname.includes(`/admin/${segment}`)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed top-0 left-0 h-full z-20">
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <span className="font-bold text-orange-600 text-lg">MorfApp</span>
          <span className="ml-1 text-xs text-gray-400 font-normal">admin</span>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.segment}
              href={`${base}/${item.href}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.segment)
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">{params.tenant}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-10">
          <span className="font-bold text-orange-600">MorfApp</span>
          <span className="ml-1 text-xs text-gray-400">admin</span>
        </header>
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom tabs mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex">
        {NAV.map((item) => (
          <Link
            key={item.segment}
            href={`${base}/${item.href}`}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive(item.segment) ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl mb-0.5">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
