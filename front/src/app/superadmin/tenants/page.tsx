'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getSuperAdminTenants,
  updateTenantStatus,
  buildWhatsAppNotificationUrl,
  getSettings,
  type SuperAdminTenant,
} from '@/lib/superadmin-api'

const PLAN_LABELS: Record<string, string> = { Basico: 'Básico', Pro: 'Pro', Negocio: 'Negocio' }
const PLAN_COLORS: Record<string, string> = {
  Basico: 'bg-gray-100 text-gray-700',
  Pro: 'bg-blue-100 text-blue-700',
  Negocio: 'bg-purple-100 text-purple-700',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<SuperAdminTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ tenantId: string; tenantName: string } | null>(null)
  const [messageTemplate, setMessageTemplate] = useState<string>('')

  useEffect(() => {
    load()
    loadTemplate()
  }, [])

  async function loadTemplate() {
    try {
      const settings = await getSettings()
      setMessageTemplate(settings.notificationMessageTemplate)
    } catch {
      // silently fail, will use default template
    }
  }

  async function load() {
    try {
      const data = await getSuperAdminTenants()
      setTenants(data)
    } catch {
      setError('No se pudo cargar la lista de negocios')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(tenant: SuperAdminTenant) {
    const newStatus = tenant.status === 'Active' ? 'Inactive' : 'Active'

    if (newStatus === 'Inactive') {
      setConfirmDialog({ tenantId: tenant.id, tenantName: tenant.name })
      return
    }

    setToggling(tenant.id)
    try {
      await updateTenantStatus(tenant.id, newStatus)
      setTenants(prev =>
        prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t)
      )
    } catch {
      alert('No se pudo cambiar el estado')
    } finally {
      setToggling(null)
    }
  }

  async function confirmDeactivate() {
    if (!confirmDialog) return
    setToggling(confirmDialog.tenantId)
    try {
      await updateTenantStatus(confirmDialog.tenantId, 'Inactive')
      setTenants(prev =>
        prev.map(t => t.id === confirmDialog.tenantId ? { ...t, status: 'Inactive' } : t)
      )
    } catch {
      alert('No se pudo cambiar el estado')
    } finally {
      setToggling(null)
      setConfirmDialog(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negocios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} negocios registrados</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nuevo negocio
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Negocio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dueño</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map(tenant => {
                const days = daysLeft(tenant.subscriptionEndsAt)
                const expiringSoon = days !== null && days <= 7 && days >= 0
                const expired = days !== null && days < 0

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-xs text-gray-400">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{tenant.ownerName || '—'}</div>
                      <div className="text-xs text-gray-400">{tenant.ownerPhone || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[tenant.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                        {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-gray-700'}>
                        {formatDate(tenant.subscriptionEndsAt)}
                      </div>
                      {(expiringSoon || expired) && (
                        <div className="text-xs mt-0.5">
                          {expired ? `Venció hace ${Math.abs(days!)} días` : `Vence en ${days} días`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tenant.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tenant.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {tenant.ownerPhone && (
                          <a
                            href={buildWhatsAppNotificationUrl(tenant.ownerPhone, tenant.name, tenant.plan, tenant.subscriptionEndsAt, messageTemplate)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            💬 Notificar
                          </a>
                        )}
                        <Link
                          href={`/superadmin/tenants/${tenant.id}/edit`}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(tenant)}
                          disabled={toggling === tenant.id}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            tenant.status === 'Active'
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {toggling === tenant.id ? '...' : tenant.status === 'Active' ? 'Dar baja' : 'Dar alta'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {tenants.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🏪</p>
              <p>No hay negocios registrados aún</p>
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Dar de baja "{confirmDialog.tenantName}"</h2>
              <p className="text-sm text-gray-600 mb-6">
                Esta acción marcará el negocio como inactivo. El dueño no podrá acceder al panel de administración.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  disabled={toggling === confirmDialog.tenantId}
                  className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-900 font-medium rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeactivate}
                  disabled={toggling === confirmDialog.tenantId}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {toggling === confirmDialog.tenantId ? 'Dando de baja...' : 'Dar de baja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
