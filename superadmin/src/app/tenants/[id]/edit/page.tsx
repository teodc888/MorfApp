'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { getSuperAdminTenants, updateTenant, resetTenantPassword, type SuperAdminTenant } from '@/lib/superadmin-api'

const PLANS = ['Basico', 'Pro', 'Negocio']
const PLAN_LABELS: Record<string, string> = { Basico: 'Básico', Pro: 'Pro', Negocio: 'Negocio' }

function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  // Toma solo la parte YYYY-MM-DD para que funcione con <input type="date">
  return iso.substring(0, 10)
}

export default function EditTenantPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenant, setTenant] = useState<SuperAdminTenant | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerPhone: '',
    subscriptionEndsAt: '',
    plan: 'Basico',
  })

  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadTenant() {
      try {
        const tenants = await getSuperAdminTenants()
        const found = tenants.find(t => t.id === id)
        if (!found) {
          setError('Negocio no encontrado')
          return
        }
        setTenant(found)
        setForm({
          name: found.name,
          slug: found.slug || '',
          ownerName: found.ownerName,
          ownerPhone: found.ownerPhone,
          subscriptionEndsAt: isoToDateInput(found.subscriptionEndsAt),
          plan: found.plan || 'Basico',
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar el negocio'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    loadTenant()
  }, [id])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await updateTenant(id, {
        name: form.name,
        slug: form.slug || undefined,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        subscriptionEndsAt: form.subscriptionEndsAt || null,
        plan: form.plan,
      })
      router.push('/tenants')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword() {
    if (!tenant) return
    setResettingPassword(true)
    setResetUrl(null)
    try {
      const data = await resetTenantPassword(tenant.id)
      // El backend devuelve setupUrl como ruta relativa: /activate?token=...
      // Apuntamos al frontend (morfapp.app) usando la variable de entorno o fallback
      const frontendBase = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://morfapp.app'
      // El path de setup en el front es /setup?token=...
      const path = data.setupUrl.replace('/activate', '/setup')
      setResetUrl(`${frontendBase}${path}`)
    } catch (err) {
      toast.error('Error al generar el link: ' + (err instanceof Error ? err.message : 'desconocido'))
    } finally {
      setResettingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="max-w-xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Negocio no encontrado'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Editar &quot;{tenant.name}&quot;</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Negocio</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Burger Co."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="flex-1 px-3 py-2.5 text-sm outline-none"
                  placeholder="mi-comercio"
                />
                <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 whitespace-nowrap">.morfapp.app</span>
              </div>
              {form.slug && (
                <p className="text-xs text-amber-500 mt-1">⚠️ Cambiar el slug modifica la URL pública del comercio.</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Plan y suscripción</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {PLANS.map(p => (
                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vence el</label>
              <input
                type="date"
                value={form.subscriptionEndsAt}
                onChange={e => set('subscriptionEndsAt', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del dueño</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del dueño</label>
              <input
                required
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono WhatsApp</label>
              <input
                required
                value={form.ownerPhone}
                onChange={e => set('ownerPhone', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="5493516133893"
              />
              <p className="text-xs text-gray-400 mt-1">Con código de país, sin + (ej: 5493516133893)</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acceso del comercio</p>
          {resetUrl ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Link generado (válido 72hs):</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white border rounded px-2 py-1 flex-1 break-all">{resetUrl}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(resetUrl)}
                  className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-100 shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="text-sm border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {resettingPassword ? 'Generando...' : '🔑 Restablecer contraseña del admin'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
