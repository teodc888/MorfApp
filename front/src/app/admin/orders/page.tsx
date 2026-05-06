'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
  if (parsed.length === 0) return <span className="text-[#584237] italic">Sin items</span>

  return (
    <ul className="space-y-1">
      {parsed.map((item, i) => (
        <li key={i} className="text-xs text-[#1A1B22]">
          <div className="font-semibold">{item.quantity}x {item.productName}</div>
          {item.modifiers && item.modifiers.length > 0 && (
            <ul className="ml-3 text-[#584237] space-y-0.5">
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
    <tr className="border-b border-[#E5E7EB] hover:bg-[#FAF9F6] transition-colors">
      {/* ID pedido */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono text-[#584237]">
          #{order.id.slice(-6).toUpperCase()}
        </span>
      </td>

      {/* Cliente */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[#1A1B22]">
          {order.customerName || '—'}
        </p>
        <p className="text-xs text-[#584237]">{order.customerPhone}</p>
      </td>

      {/* Items */}
      <td className="px-4 py-3 max-w-xs">
        <ItemsSummary items={order.items} />
      </td>

      {/* Total */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm font-semibold text-[#1A1B22]">
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
      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#584237]">
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
                className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => onCancel(order.id)}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 text-[#EF4444] hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar'}
              </button>
            </>
          )}
          {order.status !== 'pending' && (
            <span className="text-xs text-[#584237]">—</span>
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
    <div className="bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] p-4 space-y-3 shadow-[0px_4px_12px_rgba(67,20,7,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1A1B22] text-sm">
            {order.customerName || order.customerPhone}
          </p>
          {order.customerName && (
            <p className="text-xs text-[#584237]">{order.customerPhone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-[#584237]">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="text-xs text-[#584237] font-mono">
        #{order.id.slice(-6).toUpperCase()}
      </div>

      <div className="border-t border-[#E5E7EB] pt-2">
        <ItemsSummary items={order.items} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-bold text-[#1A1B22]">{formatPrice(order.totalPrice)}</span>

        {order.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onCancel(order.id)}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 text-[#EF4444] hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar'}
            </button>
            <button
              onClick={() => onConfirm(order.id)}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  const queryClient = useQueryClient()

  const { data: orders = [], isLoading, error, refetch } = useQuery<OrderAdmin[], Error>({
    queryKey: ['orders', statusFilter],
    queryFn: () => getOrders(statusFilter),
    refetchInterval: 30_000, // refresca cada 30s automáticamente
  })

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
    <div className="min-h-screen bg-[#FAF9F6] max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1B22]">Pedidos</h1>
          <p className="text-sm text-[#584237] mt-1">
            Gestioná y confirmá los pedidos de tus clientes
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto text-sm px-4 py-2 border border-[#E5E7EB] hover:bg-[#FFFFFF] text-[#1A1B22] rounded-lg font-medium transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Filtro por status */}
      <div className="flex gap-2 border-b border-[#E5E7EB] overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`pb-2.5 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              statusFilter === tab
                ? 'border-[#EF4444] text-[#EF4444]'
                : 'border-transparent text-[#584237] hover:text-[#1A1B22]'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Errores */}
      {(error || mutationError) && (
        <p className="text-sm text-[#EF4444] bg-red-50 px-3 py-2 rounded-lg">
          {error?.message ?? mutationError}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && orders.length === 0 && (
        <div className="text-center py-16 text-[#584237]">
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
          <div className="hidden md:block bg-[#FFFFFF] rounded-[16px] border border-[#E5E7EB] overflow-hidden shadow-[0px_4px_12px_rgba(67,20,7,0.08)]">
            <table className="w-full text-left">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E7EB] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    Items
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#584237] uppercase tracking-wide">
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
