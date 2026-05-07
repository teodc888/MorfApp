'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSuperAdminTenants, updateTenant, type SuperAdminTenant } from '@/lib/superadmin-api'

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
    ownerName: '',
    ownerPhone: '',
    subscriptionEndsAt: '',
  })

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
          ownerName: found.ownerName,
          ownerPhone: found.ownerPhone,
          subscriptionEndsAt: found.subscriptionEndsAt || '',
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
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        subscriptionEndsAt: form.subscriptionEndsAt || null,
      })
      router.push('/superadmin/tenants')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
    } finally {
      setSubmitting(false)
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
        <p className="text-sm text-gray-500 mt-1">Slug: {tenant.slug}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Negocio</p>
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
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Suscripción</p>
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
