'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/lib/useWebSocket'
import {
  getOrders,
  confirmOrder,
  cancelOrder,
  type OrderAdmin,
  type OrderItemFromApi,
} from '@/lib/admin-api'
import { formatPrice } from '@/lib/utils'

type StatusFilter = 'pending' | 'confirmed' | 'cancelled'

const STATUS_LABELS: Record<OrderAdmin['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const STATUS_STYLES: Record<OrderAdmin['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseItems(raw: unknown): OrderItemFromApi[] {
  if (Array.isArray(raw)) return raw as OrderItemFromApi[]
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as OrderItemFromApi[] } catch { return [] }
  }
  return []
}

function ItemsSummary({ items }: { items: OrderItemFromApi[] }) {
  const parsed = parseItems(items)
  if (parsed.length === 0) return <span className="text-gray-400 italic">Sin items</span>

  return (
    <ul className="space-y-1">
      {parsed.map((item, i) => (
        <li key={i} className="text-xs text-gray-700">
          <div className="font-semibold">{item.quantity}x {item.productName}</div>
          {item.modifiers && item.modifiers.length > 0 && (
            <ul className="ml-3 text-gray-500 space-y-0.5">
              {item.modifiers.map((mod, j) => (
                <li key={j}>
                  • {mod.optionName}{mod.extraPrice > 0 && ` +$${mod.extraPrice}`}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

function OrderRow({
  order,
  onConfirm,
  onCancel,
  confirmingId,
  cancellingId,
}: {
  order: OrderAdmin
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  confirmingId: string | null
  cancellingId: string | null
}) {
  const isConfirming = confirmingId === order.id
  const isCancelling = cancellingId === order.id
  const isBusy = isConfirming || isCancelling

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* ID pedido */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono text-gray-500">
          #{order.id.slice(-6).toUpperCase()}
        </span>
      </td>

      {/* Cliente */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">
          {order.customerName || '—'}
        </p>
        <p className="text-xs text-gray-500">{order.customerPhone}</p>
      </td>

      {/* Items */}
      <td className="px-4 py-3 max-w-xs">
        <ItemsSummary items={order.items} />
      </td>

      {/* Total */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm font-semibold text-gray-900">
          {formatPrice(order.totalPrice)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[order.status]}`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </td>

      {/* Fecha */}
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {formatDate(order.createdAt)}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {order.status === 'pending' && (
            <>
              <button
                onClick={() => onConfirm(order.id)}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => onCancel(order.id)}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar'}
              </button>
            </>
          )}
          {order.status !== 'pending' && (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile card variant                                                   */
/* ------------------------------------------------------------------ */
function OrderCard({
  order,
  onConfirm,
  onCancel,
  confirmingId,
  cancellingId,
}: {
  order: OrderAdmin
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  confirmingId: string | null
  cancellingId: string | null
}) {
  const isConfirming = confirmingId === order.id
  const isCancelling = cancellingId === order.id
  const isBusy = isConfirming || isCancelling

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm">
            {order.customerName || order.customerPhone}
          </p>
          {order.customerName && (
            <p className="text-xs text-gray-500">{order.customerPhone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-mono">
        #{order.id.slice(-6).toUpperCase()}
      </div>

      <div className="border-t border-gray-100 pt-2">
        <ItemsSummary items={order.items} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-bold text-gray-900">{formatPrice(order.totalPrice)}</span>

        {order.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onCancel(order.id)}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar'}
            </button>
            <button
              onClick={() => onConfirm(order.id)}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */
export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10

  const queryClient = useQueryClient()

  // Log cuando el componente se monta y desmonta
  useEffect(() => {
    console.log('[OrdersPage] Mounted with statusFilter:', statusFilter)
    return () => console.log('[OrdersPage] Unmounted')
  }, [statusFilter])

  useWebSocket()

  const { data: response = { items: [], total: 0, limit: 10, offset: 0 }, isLoading, error, refetch } = useQuery<{ items: OrderAdmin[], total: number, limit: number, offset: number }, Error>({
    queryKey: ['orders', statusFilter, searchQuery, currentPage],
    queryFn: async () => {
      console.log('[Orders Query] Fetching orders with status:', statusFilter, 'search:', searchQuery, 'page:', currentPage)
      const result = await getOrders(statusFilter, searchQuery, pageSize, currentPage * pageSize)
      return result
    },
  })

  const orders = response.items
  const totalOrders = response.total
  const totalPages = Math.ceil(totalOrders / pageSize)

  // Log cuando los datos cambian
  useEffect(() => {
    console.log('[OrdersPage] Data updated - orders count:', orders.length, 'isLoading:', isLoading)
  }, [orders, isLoading])

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmOrder(id),
    onMutate: (id) => setConfirmingId(id),
    onSettled: () => {
      setConfirmingId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => {
      setCancellingId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const handleConfirm = useCallback(
    (id: string) => confirmMutation.mutate(id),
    [confirmMutation],
  )

  const handleCancel = useCallback(
    (id: string) => cancelMutation.mutate(id),
    [cancelMutation],
  )

  const mutationError = confirmMutation.error?.message ?? cancelMutation.error?.message ?? null

  const STATUS_TABS: StatusFilter[] = ['pending', 'confirmed', 'cancelled']
  const TAB_LABELS: Record<StatusFilter, string> = {
    pending: 'Pendientes',
    confirmed: 'Confirmados',
    cancelled: 'Cancelados',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestioná y confirmá los pedidos de tus clientes
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto text-sm px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Filtro por status */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab)
              setCurrentPage(0)
              setSearchQuery('')
            }}
            className={`pb-2.5 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              statusFilter === tab
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Búsqueda y paginación */}
      {statusFilter !== 'pending' && (
        <>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar por nombre o teléfono</label>
              <input
                type="text"
                placeholder="Nombre o teléfono del cliente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(0)
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Mostrando {orders.length === 0 ? 0 : currentPage * pageSize + 1} a {Math.min((currentPage + 1) * pageSize, totalOrders)} de {totalOrders}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || isLoading}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Errores */}
      {(error || mutationError) && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error?.message ?? mutationError}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">
            {statusFilter === 'pending' ? '🟡' : statusFilter === 'confirmed' ? '✅' : '❌'}
          </p>
          <p className="font-medium">Sin pedidos {TAB_LABELS[statusFilter].toLowerCase()}</p>
          <p className="text-sm mt-1">
            {statusFilter === 'pending'
              ? 'Los nuevos pedidos aparecerán aquí'
              : 'No hay pedidos en este estado'}
          </p>
        </div>
      )}

      {/* Tabla — desktop */}
      {!isLoading && orders.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Items
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirmingId={confirmingId}
                    cancellingId={cancellingId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirmingId={confirmingId}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
