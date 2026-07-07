'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/admin-api'

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🍽️</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">MorfApp Admin</h1>
        </div>
        {children}
      </div>
    </div>
  )
}

function InvalidLinkCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
      <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
        Link inválido. Pedí un nuevo link de recuperación.
      </p>
      <Link
        href="/admin/forgot-password"
        className="block w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm text-center transition-colors"
      >
        Pedir nuevo link
      </Link>
    </div>
  )
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/login')
      }, 2000)
    } catch (err) {
      console.error(err)
      setError('El link es inválido o venció. Pedí un nuevo link de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-gray-700">Contraseña actualizada correctamente</p>
        <button
          onClick={() => router.push('/admin/login')}
          className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Ir a login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          <Link href="/admin/forgot-password" className="block text-sm text-center text-gray-500 hover:text-orange-600">
            Pedir un nuevo link de recuperación
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium rounded-lg text-sm transition-colors"
      >
        {loading ? 'Actualizando...' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return (
    <CardShell>
      {token ? <ResetPasswordForm token={token} /> : <InvalidLinkCard />}
    </CardShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<CardShell><div className="text-sm text-center text-gray-500">Cargando...</div></CardShell>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
