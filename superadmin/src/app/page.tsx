'use client'

import { useState, useEffect } from 'react'
import { getSuperAdminDashboard, type SuperAdminDashboardDto, type OrderCountByTenant } from '@/lib/superadmin-api'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OrdersTable({ title, rows }: { title: string; rows: OrderCountByTenant[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Sin pedidos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Negocio</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Pedidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => (
                  <tr key={row.tenantId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{row.tenantName}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{row.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<SuperAdminDashboardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const result = await getSuperAdminDashboard()
      setData(result)
    } catch {
      setError('No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error ?? 'No se pudo cargar el dashboard'}</p>
  }

  const ordersLast7Days = [...data.ordersLast7Days].sort((a, b) => b.orderCount - a.orderCount)
  const ordersLast30Days = [...data.ordersLast30Days].sort((a, b) => b.orderCount - a.orderCount)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen general de la plataforma</p>
      </div>

      {/* Tarjetas de conteo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-green-600">{data.activeTenants}</div>
          <div className="text-sm text-gray-500 mt-1">Activos</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-amber-600">{data.pendingTenants}</div>
          <div className="text-sm text-gray-500 mt-1">Pendientes</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-red-600">{data.expiredTenants}</div>
          <div className="text-sm text-gray-500 mt-1">Vencidos</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-gray-600">{data.suspendedTenants}</div>
          <div className="text-sm text-gray-500 mt-1">Suspendidos</div>
        </div>
      </div>

      {/* Pedidos últimos 7 / 30 días */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <OrdersTable title="Pedidos últimos 7 días" rows={ordersLast7Days} />
        <OrdersTable title="Pedidos últimos 30 días" rows={ordersLast30Days} />
      </div>

      {/* Negocios sin pedidos recientes */}
      <div className="mb-8">
        {data.tenantsWithoutRecentOrders.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700">
            Todos los negocios tienen actividad reciente 🎉
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              ⚠️ Negocios sin pedidos recientes ({data.tenantsWithoutRecentOrders.length})
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-100">
                      <th className="text-left px-4 py-3 font-medium text-red-800">Negocio</th>
                      <th className="text-left px-4 py-3 font-medium text-red-800">Último pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.tenantsWithoutRecentOrders.map(row => (
                      <tr key={row.tenantId} className="hover:bg-red-100/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.tenantName}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.lastOrderAt ? formatDate(row.lastOrderAt) : 'Nunca'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Próximos vencimientos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Próximos vencimientos</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {data.upcomingExpirations.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No hay vencimientos próximos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Negocio</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Días restantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.upcomingExpirations.map(row => {
                    const urgent = row.daysRemaining <= 7
                    return (
                      <tr
                        key={row.tenantId}
                        className={`transition-colors ${urgent ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{row.tenantName}</td>
                        <td className={`px-4 py-3 ${urgent ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
                          {formatDate(row.subscriptionEndsAt)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${urgent ? 'text-amber-700' : 'text-gray-700'}`}>
                          {row.daysRemaining}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
