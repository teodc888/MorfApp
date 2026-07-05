'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/lib/useWebSocket'
import { unlockAudio, playNotificationBeep } from '@/lib/notificationSound'
import {
  getOrders,
  confirmOrder,
  cancelOrder,
  updateOrderStatus,
  exportOrders,
  type OrderAdmin,
  type OrderItemFromApi,
} from '@/lib/admin-api'
import { formatPrice } from '@/lib/utils'

const SOUND_ENABLED_KEY = 'morf_sound_enabled'

// Decisión de diseño: con los nuevos estados intermedios (preparing/ready), un pedido
// "confirmado" ya no es un estado terminal — sigue siendo accionable hasta llegar a
// delivered. Por eso la pestaña que antes era "Pendientes" pasa a ser "En curso" y
// agrupa todo lo que NO es un estado terminal (pending/confirmed/preparing/ready),
// mientras que "Historial" queda reservado solo para los estados terminales
// (delivered/cancelled). Ver uso de `apiStatus` más abajo para el detalle de fetch.
type StatusFilter = 'active' | 'history'
type HistoryStatus = 'delivered' | 'cancelled'

const STATUS_LABELS: Record<OrderAdmin['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_STYLES: Record<OrderAdmin['status'], string> = {
  pending: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ACTIVE_STATUSES: OrderAdmin['status'][] = ['pending', 'confirmed', 'preparing', 'ready']

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
  if (parsed.length === 0) return <span className="text-[var(--muted)] italic">Sin items</span>

  return (
    <ul className="space-y-1">
      {parsed.map((item, i) => (
        <li key={i} className="text-xs text-[var(--text)]">
          <div className="font-semibold">{item.quantity}x {item.productName}</div>
          {item.modifiers && item.modifiers.length > 0 && (
            <ul className="ml-3 text-[var(--muted)] space-y-0.5">
              {item.modifiers.map((mod, j) => (
                <li key={j}>
                  • {mod.optionName}{mod.extraPrice > 0 && ` +$${mod.extraPrice}`}
                </li>
              ))}
            </ul>
          )}
          {item.observations && (
            <p className="ml-3 mt-0.5 italic text-[var(--muted)]">📝 {item.observations}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Printable order (comanda)                                            */
/* ------------------------------------------------------------------ */
const DELIVERY_MODE_LABELS: Record<string, string> = {
  delivery: 'Delivery',
  pickup: 'Retiro en local',
}

function PrintableOrder({ order }: { order: OrderAdmin }) {
  const items = parseItems(order.items)
  const orderDate = new Date(order.createdAt)
  const dateLabel = orderDate.toLocaleString('es-AR')
  const deliveryLabel = order.deliveryMode
    ? DELIVERY_MODE_LABELS[order.deliveryMode] || order.deliveryMode
    : '—'

  return (
    <div className="text-black bg-white p-6 text-sm">
      <style>{`
        @media print {
          @page { margin: 12mm; }
        }
      `}</style>

      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
        <p className="text-xs">{dateLabel}</p>
      </div>

      <div className="border-t border-black pt-2 mb-2">
        <p><strong>Cliente:</strong> {order.customerName || '—'}</p>
        <p><strong>Teléfono:</strong> {order.customerPhone}</p>
      </div>

      <div className="border-t border-black pt-2 mb-2">
        <p className="font-bold mb-1">Items</p>
        {items.length === 0 ? (
          <p className="italic">Sin items</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i}>
                <div className="font-semibold">{item.quantity}x {item.productName}</div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <ul className="ml-4">
                    {item.modifiers.map((mod, j) => (
                      <li key={j}>
                        - {mod.optionName}{mod.extraPrice > 0 && ` (+$${mod.extraPrice})`}
                      </li>
                    ))}
                  </ul>
                )}
                {item.observations && (
                  <p className="italic">📝 {item.observations}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {order.notes && (
        <div className="border-t border-black pt-2 mb-2">
          <p className="font-bold">Observaciones</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="border-t border-black pt-2 mb-2">
        <p><strong>Entrega:</strong> {deliveryLabel}</p>
        {order.deliveryMode === 'delivery' && order.address && (
          <p><strong>Dirección:</strong> {order.address}</p>
        )}
      </div>

      <div className="border-t border-black pt-2 mb-2">
        <p><strong>Método de pago:</strong> {order.paymentMethod || '—'}</p>
      </div>

      <div className="border-t border-black pt-2 text-right">
        <p className="text-lg font-bold">Total: {formatPrice(order.totalPrice)}</p>
      </div>
    </div>
  )
}

function OrderRow({
  order,
  onConfirm,
  onCancel,
  onAdvance,
  onPrint,
  confirmingId,
  cancellingId,
  advancingId,
}: {
  order: OrderAdmin
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  onAdvance: (id: string, status: 'preparing' | 'ready' | 'delivered') => void
  onPrint: (order: OrderAdmin) => void
  confirmingId: string | null
  cancellingId: string | null
  advancingId: string | null
}) {
  const isConfirming = confirmingId === order.id
  const isCancelling = cancellingId === order.id
  const isAdvancing = advancingId === order.id
  const isBusy = isConfirming || isCancelling || isAdvancing

  return (
    <tr className="border-b border-[#E5E7EB] hover:bg-[var(--bg)] transition-colors">
      {/* ID pedido */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono text-[var(--muted)]">
          #{order.id.slice(-6).toUpperCase()}
        </span>
      </td>

      {/* Cliente */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[var(--text)]">
          {order.customerName || '—'}
        </p>
        <p className="text-xs text-[var(--muted)]">{order.customerPhone}</p>
      </td>

      {/* Items */}
      <td className="px-4 py-3 max-w-xs">
        <ItemsSummary items={order.items} />
      </td>

      {/* Total */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm font-semibold text-[var(--text)]">
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
      <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--muted)]">
        {formatDate(order.createdAt)}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPrint(order)}
            title="Imprimir comanda"
            className="text-xs px-2 py-1.5 border border-[#E5E7EB] hover:bg-[var(--bg)] text-[var(--text)] rounded-lg font-medium transition-colors"
          >
            🖨️
          </button>
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
          {order.status === 'confirmed' && (
            <>
              <button
                onClick={() => onAdvance(order.id, 'preparing')}
                disabled={isBusy}
                className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdvancing ? 'Actualizando...' : 'Marcar en preparación'}
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
          {order.status === 'preparing' && (
            <button
              onClick={() => onAdvance(order.id, 'ready')}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdvancing ? 'Actualizando...' : 'Marcar listo'}
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={() => onAdvance(order.id, 'delivered')}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdvancing ? 'Actualizando...' : 'Marcar entregado'}
            </button>
          )}
          {(order.status === 'delivered' || order.status === 'cancelled') && (
            <span className="text-xs text-[var(--muted)]">—</span>
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
  onAdvance,
  onPrint,
  confirmingId,
  cancellingId,
  advancingId,
}: {
  order: OrderAdmin
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  onAdvance: (id: string, status: 'preparing' | 'ready' | 'delivered') => void
  onPrint: (order: OrderAdmin) => void
  confirmingId: string | null
  cancellingId: string | null
  advancingId: string | null
}) {
  const isConfirming = confirmingId === order.id
  const isCancelling = cancellingId === order.id
  const isAdvancing = advancingId === order.id
  const isBusy = isConfirming || isCancelling || isAdvancing

  return (
    <div className="bg-[var(--surface)] rounded-[16px] border border-[#E5E7EB] p-4 space-y-3 shadow-[0px_4px_12px_rgba(67,20,7,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--text)] text-sm">
            {order.customerName || order.customerPhone}
          </p>
          {order.customerName && (
            <p className="text-xs text-[var(--muted)]">{order.customerPhone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-[var(--muted)]">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--muted)] font-mono">
        <span>#{order.id.slice(-6).toUpperCase()}</span>
        <button
          onClick={() => onPrint(order)}
          title="Imprimir comanda"
          className="text-xs px-2 py-1 border border-[#E5E7EB] hover:bg-[var(--bg)] text-[var(--text)] rounded-lg font-medium transition-colors font-sans"
        >
          🖨️ Imprimir
        </button>
      </div>

      <div className="border-t border-[#E5E7EB] pt-2">
        <ItemsSummary items={order.items} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-bold text-[var(--text)]">{formatPrice(order.totalPrice)}</span>

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

        {order.status === 'confirmed' && (
          <div className="flex gap-2">
            <button
              onClick={() => onCancel(order.id)}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 text-[#EF4444] hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar'}
            </button>
            <button
              onClick={() => onAdvance(order.id, 'preparing')}
              disabled={isBusy}
              className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdvancing ? 'Actualizando...' : 'Marcar en preparación'}
            </button>
          </div>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => onAdvance(order.id, 'ready')}
            disabled={isBusy}
            className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdvancing ? 'Actualizando...' : 'Marcar listo'}
          </button>
        )}

        {order.status === 'ready' && (
          <button
            onClick={() => onAdvance(order.id, 'delivered')}
            disabled={isBusy}
            className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdvancing ? 'Actualizando...' : 'Marcar entregado'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */
type SortField = 'date' | 'total'
type SortOrder = 'asc' | 'desc'

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('delivered')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [printingOrder, setPrintingOrder] = useState<OrderAdmin | null>(null)
  const [exportPanel, setExportPanel] = useState<{ open: boolean; from: string; to: string }>({
    open: false,
    from: '',
    to: '',
  })
  const [isExporting, setIsExporting] = useState(false)
  const pageSize = 10

  const queryClient = useQueryClient()

  // Inicializa el estado del toggle de sonido desde localStorage (default: activado)
  useEffect(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY)
    if (stored !== null) setSoundEnabled(stored === 'true')
  }, [])

  // Inicializa el estado de permisos de notificaciones (SSR-safe: Notification no existe en el server)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported')
      return
    }
    setNotifPermission(Notification.permission)
  }, [])

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem(SOUND_ENABLED_KEY, String(next))
      if (next) unlockAudio()
      return next
    })
  }, [])

  const handleEnableNotifications = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    unlockAudio()
    Notification.requestPermission().then((result) => {
      setNotifPermission(result)
    })
  }, [])

  // Dispara la impresión del navegador apenas hay un pedido seleccionado para imprimir,
  // y limpia el estado cuando el usuario cierra o cancela el diálogo de impresión.
  useEffect(() => {
    if (!printingOrder) return
    if (typeof window === 'undefined') return

    window.print()

    const handleAfterPrint = () => setPrintingOrder(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [printingOrder])

  const handlePrint = useCallback((order: OrderAdmin) => {
    setPrintingOrder(order)
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportOrders({
        status: statusFilter === 'history' ? historyStatus : undefined,
        from: exportPanel.from || undefined,
        to: exportPanel.to || undefined,
      })
      setExportPanel((prev) => ({ ...prev, open: false }))
    } catch {
      toast.error('Error al exportar los pedidos')
    } finally {
      setIsExporting(false)
    }
  }, [statusFilter, historyStatus, exportPanel.from, exportPanel.to])

  useWebSocket({
    onNewOrder: (data) => {
      if (soundEnabled) {
        playNotificationBeep()
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('MorfApp — Nuevo pedido', {
          body: `Nuevo pedido de ${data.customerName || 'cliente'} — ${formatPrice(data.totalPrice ?? 0)}`,
        })
      }
    },
  })

  // "active" agrupa todo pedido que no llegó a un estado terminal (pending/confirmed/
  // preparing/ready). El backend soporta el filtro combinado `statuses` (bug 3 fix), así
  // que pedimos directamente esos 4 estados en un solo request — la paginación (`total`)
  // ya viene correcta desde el backend, sin necesidad de descartar nada client-side.
  // "history" sigue pidiendo un status puntual (delivered o cancelled) igual que antes.
  const apiStatus = statusFilter === 'active' ? undefined : historyStatus
  const apiStatuses = statusFilter === 'active' ? ACTIVE_STATUSES : undefined
  const { data: response = { items: [], total: 0, limit: 10, offset: 0 }, isLoading, error, refetch } = useQuery<{ items: OrderAdmin[], total: number, limit: number, offset: number }, Error>({
    queryKey: ['orders', apiStatus, apiStatuses, searchQuery, currentPage],
    queryFn: () => getOrders({ status: apiStatus, statuses: apiStatuses, search: searchQuery, limit: pageSize, offset: currentPage * pageSize }),
  })

  const visibleOrders = response.items

  const sortedOrders = (() => {
    const sorted = [...visibleOrders]
    if (sortField === 'date') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      })
    } else if (sortField === 'total') {
      sorted.sort((a, b) => {
        return sortOrder === 'desc' ? b.totalPrice - a.totalPrice : a.totalPrice - b.totalPrice
      })
    }
    return sorted
  })()

  const orders = sortedOrders
  const totalOrders = response.total
  const totalPages = Math.ceil(totalOrders / pageSize)

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmOrder(id),
    onMutate: (id) => setConfirmingId(id),
    onSuccess: () => toast.success('Pedido confirmado'),
    onError: () => toast.error('Error al procesar el pedido'),
    onSettled: () => {
      setConfirmingId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onMutate: (id) => setCancellingId(id),
    onSuccess: () => toast.success('Pedido cancelado'),
    onError: () => toast.error('Error al procesar el pedido'),
    onSettled: () => {
      setCancellingId(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const ADVANCE_SUCCESS_MESSAGES: Record<'preparing' | 'ready' | 'delivered', string> = {
    preparing: 'Pedido en preparación',
    ready: 'Pedido marcado como listo',
    delivered: 'Pedido entregado',
  }

  const advanceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'preparing' | 'ready' | 'delivered' }) =>
      updateOrderStatus(id, status),
    onMutate: ({ id }) => setAdvancingId(id),
    onSuccess: (_data, variables) => toast.success(ADVANCE_SUCCESS_MESSAGES[variables.status]),
    onError: (err) => {
      const message = err instanceof Error ? err.message : ''
      toast.error(
        message.includes('API error 400')
          ? 'No se pudo actualizar: la transición de estado no es válida'
          : 'Error al procesar el pedido',
      )
    },
    onSettled: () => {
      setAdvancingId(null)
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

  const handleAdvance = useCallback(
    (id: string, status: 'preparing' | 'ready' | 'delivered') => advanceStatusMutation.mutate({ id, status }),
    [advanceStatusMutation],
  )

  return (
    <>
    <div className="print:hidden min-h-screen bg-[var(--bg)] max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Pedidos</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Gestioná y confirmá los pedidos de tus clientes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle de sonido */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Sonido activado — click para desactivar' : 'Sonido desactivado — click para activar'}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-[#EF4444] hover:bg-red-600 text-white'
                : 'border border-[#E5E7EB] hover:bg-[var(--surface)] text-[var(--text)]'
            }`}
          >
            {soundEnabled ? '🔊 Sonido activado' : '🔇 Sonido desactivado'}
          </button>

          {/* Notificaciones de navegador */}
          {notifPermission === 'granted' && (
            <span className="text-sm px-4 py-2 rounded-lg font-medium border border-[#E5E7EB] text-[var(--muted)] flex items-center gap-1.5">
              ✓ Notificaciones activadas
            </span>
          )}
          {notifPermission === 'denied' && (
            <span className="text-sm px-4 py-2 rounded-lg font-medium text-[var(--muted)]">
              Notificaciones bloqueadas por el navegador
            </span>
          )}
          {notifPermission === 'default' && (
            <button
              onClick={handleEnableNotifications}
              className="text-sm px-4 py-2 border border-[#E5E7EB] hover:bg-[var(--surface)] text-[var(--text)] rounded-lg font-medium transition-colors"
            >
              Activar notificaciones
            </button>
          )}

          <button
            onClick={() => refetch()}
            className="self-start sm:self-auto text-sm px-4 py-2 border border-[#E5E7EB] hover:bg-[var(--surface)] text-[var(--text)] rounded-lg font-medium transition-colors"
          >
            Actualizar
          </button>

          {/* Export CSV */}
          <div className="relative">
            <button
              onClick={() => setExportPanel((prev) => ({ ...prev, open: !prev.open }))}
              className="self-start sm:self-auto text-sm px-4 py-2 border border-[#E5E7EB] hover:bg-[var(--surface)] text-[var(--text)] rounded-lg font-medium transition-colors"
            >
              📥 Exportar CSV
            </button>

            {exportPanel.open && (
              <div className="absolute right-0 mt-2 w-72 bg-[var(--surface)] border border-[#E5E7EB] rounded-lg shadow-lg p-4 z-10 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={exportPanel.from}
                    onChange={(e) => setExportPanel((prev) => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={exportPanel.to}
                    onChange={(e) => setExportPanel((prev) => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setExportPanel({ open: false, from: '', to: '' })}
                    className="text-xs px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-[var(--text)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="text-xs px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isExporting ? 'Exportando...' : 'Exportar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtro por status */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => {
            setStatusFilter('active')
            setCurrentPage(0)
            setSearchQuery('')
          }}
          className={`pb-2.5 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            statusFilter === 'active'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          En curso
        </button>
        <button
          onClick={() => {
            setStatusFilter('history')
            setCurrentPage(0)
            setSearchQuery('')
          }}
          className={`pb-2.5 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            statusFilter === 'history'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial
        </button>
      </div>

      {/* Filtros y búsqueda solo en historial */}
      {statusFilter === 'history' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select
                value={historyStatus}
                onChange={(e) => {
                  setHistoryStatus(e.target.value as HistoryStatus)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                <option value="delivered">Entregados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar cliente</label>
              <input
                type="text"
                placeholder="Nombre o teléfono..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            {/* Ordenar por */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordenar por</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                <option value="date">Fecha</option>
                <option value="total">Monto</option>
              </select>
            </div>

            {/* Orden */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                {sortField === 'date' ? (
                  <>
                    <option value="desc">Más recientes</option>
                    <option value="asc">Más antiguos</option>
                  </>
                ) : (
                  <>
                    <option value="desc">Mayor a menor</option>
                    <option value="asc">Menor a mayor</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Mostrando {orders.length === 0 ? 0 : currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalOrders)} de {totalOrders}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || isLoading}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Errores de carga */}
      {error && (
        <p className="text-sm text-[#EF4444] bg-red-50 px-3 py-2 rounded-lg">
          {error.message}
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
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-4xl mb-3">
            {statusFilter === 'active' ? '🟡' : historyStatus === 'delivered' ? '✅' : '❌'}
          </p>
          <p className="font-medium">
            {statusFilter === 'active'
              ? 'Sin pedidos en curso'
              : historyStatus === 'delivered'
              ? 'Sin pedidos entregados'
              : 'Sin pedidos cancelados'}
          </p>
          <p className="text-sm mt-1">
            {statusFilter === 'active'
              ? 'Los nuevos pedidos aparecerán aquí'
              : 'No hay pedidos en este estado'}
          </p>
        </div>
      )}

      {/* Tabla — desktop */}
      {!isLoading && orders.length > 0 && (
        <>
          <div className="hidden md:block bg-[var(--surface)] rounded-[16px] border border-[#E5E7EB] overflow-hidden shadow-[0px_4px_12px_rgba(67,20,7,0.08)]">
            <table className="w-full text-left">
              <thead className="bg-[var(--bg)] border-b border-[#E5E7EB] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    ID
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    Items
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
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
                    onAdvance={handleAdvance}
                    onPrint={handlePrint}
                    confirmingId={confirmingId}
                    cancellingId={cancellingId}
                    advancingId={advancingId}
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
                onAdvance={handleAdvance}
                onPrint={handlePrint}
                confirmingId={confirmingId}
                cancellingId={cancellingId}
                advancingId={advancingId}
              />
            ))}
          </div>
        </>
      )}
    </div>

    {/* Vista de impresión — solo visible al imprimir, oculta en pantalla */}
    <div className="hidden print:block">
      {printingOrder && <PrintableOrder order={printingOrder} />}
    </div>
    </>
  )
}
