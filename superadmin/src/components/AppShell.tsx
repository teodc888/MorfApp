'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, isSuperadmin } from '@/lib/auth'

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<'loading' | 'auth' | 'ready'>('loading')

  useEffect(() => {
    // Páginas públicas — no requieren auth
    if (pathname === '/login') {
      setState('auth')
      return
    }

    if (!isAuthenticated() || !isSuperadmin()) {
      router.replace('/login')
      return
    }

    setState('ready')
  }, [pathname, router])

  // Mientras verifica auth
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Página de login — solo el contenido, sin sidebar
  if (state === 'auth') {
    return <>{children}</>
  }

  // Páginas autenticadas — layout con sidebar
  const isActive = (segment: string) => segment === '/' ? pathname === '/' : pathname.includes(segment)

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed top-0 left-0 h-full z-20">
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <span className="font-bold text-indigo-600 text-lg">MorfApp</span>
          <span className="ml-1 text-xs text-gray-400 font-normal">super</span>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">📊</span>
            Dashboard
          </Link>
          <Link
            href="/tenants"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('tenants')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">🏪</span>
            Negocios
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('settings')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-base">⚙️</span>
            Configuración
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Panel de superadmin</p>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-10">
          <span className="font-bold text-indigo-600">MorfApp</span>
          <span className="ml-1 text-xs text-gray-400">super</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
