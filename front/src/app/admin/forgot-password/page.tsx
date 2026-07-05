'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/admin-api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await forgotPassword(email)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🍽️</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">MorfApp Admin</h1>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-700">
              Si el email existe, te enviamos un link para restablecer tu contraseña.
            </p>
            <Link
              href="/admin/login"
              className="block w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm text-center transition-colors"
            >
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="hola@milocal.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>

            <Link
              href="/admin/login"
              className="block text-sm text-center text-gray-500 hover:text-orange-600"
            >
              Volver al login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
