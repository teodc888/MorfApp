'use client'

import { useState, useCallback, useEffect } from 'react'
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

function elapsedMin(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

function parseItems(raw: unknown): OrderItemFromApi[] {
  if (Array.isArray(raw)) return raw as OrderItemFromApi[]
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as OrderItemFromApi[] } catch { return [] }
  }
  return []
}

/* ── Elapsed chip ─────────────────────────────────────────────────── */
function ElapsedChip({ createdAt, status }: { createdAt: string; status: OrderAdmin['status'] }) {
  const min = elapsedMin(createdAt)
  if (status === 'confirmed') return (
    <span className="chip success"><span className="mat xs fill">check_circle</span>Confirmado</span>
  )
  if (status === 'cancelled') return (
    <span className="chip error"><span className="mat xs fill">cancel</span>Cancelado</span>
  )
  if (min >= 10) return (
    <span className="chip error"><span className="mat xs fill">timer</span>{min} min</span>
  )
  return (
    <span className="chip"><span className="mat xs">schedule</span>{min} min</span>
  )
}

/* ── Toast ────────────────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [msg, onDone])
  return (
    <div className="admin-toast">
      <span className="mat sm fill" style={{ color: '#7be38a' }}>check_circle</span>
      {msg}
    </div>
  )
}

/* ── Order card ───────────────────────────────────────────────────── */
function OrderCard({
  order, onTap, onAccept, onReject, busy,
}: {
  order: OrderAdmin
  onTap: () => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  busy: boolean
}) {
  const items = parseItems(order.items)
  const isPending = order.status === 'pending'
  const min = elapsedMin(order.createdAt)
  const accent = !isPending ? undefined
    : min >= 10 ? 'var(--error)'
    : min >= 5  ? 'var(--warning)'
    : 'var(--primary)'

  return (
    <div className="card" style={{ overflow: 'hidden', borderTop: isPending ? `3px solid ${accent}` : undefined }}>
      <button onClick={onTap} className="tap" style={{ width: '100%', padding: '14px 16px 12px', textAlign: 'left', display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <ElapsedChip createdAt={order.createdAt} status={order.status} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {order.customerName
                ? `${order.customerName} · ${order.customerPhone}`
                : order.customerPhone}
            </div>
          </div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
            {formatPrice(order.totalPrice)}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                minWidth: 26, height: 22, borderRadius: 6,
                background: 'var(--surface-container)', color: 'var(--primary-dark)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, padding: '0 6px', flexShrink: 0,
              }}>{it.quantity}×</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.productName}</div>
                {it.modifiers && it.modifiers.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {it.modifiers.map(m => m.optionName).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </button>

      {isPending && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => onReject(order.id)}>
            Rechazar
          </button>
          <button className="btn btn-primary" style={{ flex: 1.4 }} disabled={busy} onClick={() => onAccept(order.id)}>
            <span className="mat sm">check</span> Aceptar
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Detail sheet ─────────────────────────────────────────────────── */
function DetailSheet({
  order, onClose, onAccept, onReject, busy,
}: {
  order: OrderAdmin
  onClose: () => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  busy: boolean
}) {
  const items = parseItems(order.items)
  const isPending = order.status === 'pending'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="grabber" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, color: 'var(--primary-dark)' }}>
            Pedido #{order.id.slice(-6).toUpperCase()}
          </h2>
          <button onClick={onClose} className="tap" style={{ width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
            <span className="mat">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <ElapsedChip createdAt={order.createdAt} status={order.status} />
          {order.customerName && <span className="chip">{order.customerName}</span>}
          <span className="chip">{order.customerPhone}</span>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0
            ? <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Sin items</p>
            : items.map((it, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                paddingBottom: i < items.length - 1 ? 10 : 0,
                borderBottom: i < items.length - 1 ? '1px solid var(--outline-soft)' : 'none',
              }}>
                <span style={{
                  minWidth: 30, height: 24, borderRadius: 6,
                  background: 'var(--primary)', color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{it.quantity}×</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{it.productName}</div>
                  {it.modifiers && it.modifiers.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {it.modifiers.map((m, j) => (
                        <div key={j} style={{ fontSize: 12, color: 'var(--muted)' }}>
                          • {m.optionName}{m.extraPrice > 0 ? ` +$${m.extraPrice}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          }
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 4px', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total</span>
          <span className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary-dark)' }}>
            {formatPrice(order.totalPrice)}
          </span>
        </div>

        {isPending && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => onReject(order.id)}>
              Rechazar
            </button>
            <button className="btn btn-primary" style={{ flex: 1.4 }} disabled={busy} onClick={() => onAccept(order.id)}>
              <span className="mat sm">check</span> Aceptar pedido
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [detail, setDetail] = useState<OrderAdmin | null>(null)
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null)

  const queryClient = useQueryClient()

  const { data: orders = [], isLoading, error, refetch } = useQuery<OrderAdmin[], Error>({
    queryKey: ['orders', statusFilter],
    queryFn: () => getOrders(statusFilter),
    refetchInterval: 30_000,
  })

  const pendingCount = orders.filter(o => o.status === 'pending').length

  const showToast = useCallback((msg: string) => setToast({ id: Date.now(), msg }), [])

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmOrder(id),
    onSuccess: (_, id) => {
      const o = orders.find(x => x.id === id)
      if (o) showToast(`Pedido #${o.id.slice(-6).toUpperCase()} aceptado`)
    },
    onSettled: () => {
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: (_, id) => {
      const o = orders.find(x => x.id === id)
      if (o) showToast(`Pedido #${o.id.slice(-6).toUpperCase()} rechazado`)
    },
    onSettled: () => {
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const handleAccept = useCallback((id: string) => confirmMutation.mutate(id), [confirmMutation])
  const handleReject = useCallback((id: string) => cancelMutation.mutate(id), [cancelMutation])
  const isBusy = confirmMutation.isPending || cancelMutation.isPending

  const mutationError = confirmMutation.error?.message ?? cancelMutation.error?.message ?? null

  const TABS = [
    { key: 'pending'   as StatusFilter, label: `Pendientes${statusFilter === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'confirmed' as StatusFilter, label: 'Confirmados' },
    { key: 'cancelled' as StatusFilter, label: 'Cancelados' },
  ]

  return (
    <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Page header */}
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Cola de servicio
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', flex: 1, fontWeight: 700 }}>
            Pedidos activos
          </h1>
          <button onClick={() => refetch()} className="btn btn-outline btn-sm" style={{ marginTop: 4 }}>
            <span className="mat sm">refresh</span>
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          Gestioná tickets entrantes y el flujo de preparación.
        </p>
      </div>

      {/* Segmented filter */}
      <div style={{ padding: '0 22px 16px' }}>
        <div className="seg">
          {TABS.map(t => (
            <button key={t.key} className={statusFilter === t.key ? 'active' : ''} onClick={() => setStatusFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {(error || mutationError) && (
        <div style={{ margin: '0 22px 16px', padding: '12px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-card)', fontSize: 13 }}>
          {error?.message ?? mutationError}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 32, height: 32, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Order list */}
      {!isLoading && (
        <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
              <span className="mat lg" style={{ color: 'var(--muted-soft)', display: 'block', marginBottom: 8 }}>inbox</span>
              <div style={{ fontSize: 14 }}>Sin pedidos en este estado</div>
            </div>
          ) : orders.map(o => (
            <OrderCard
              key={o.id}
              order={o}
              onTap={() => setDetail(o)}
              onAccept={handleAccept}
              onReject={handleReject}
              busy={isBusy}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      {detail && (
        <DetailSheet
          order={detail}
          onClose={() => setDetail(null)}
          onAccept={handleAccept}
          onReject={handleReject}
          busy={isBusy}
        />
      )}

      {/* Toast */}
      {toast && <Toast key={toast.id} msg={toast.msg} onDone={() => setToast(null)} />}
    </div>
  )
}
