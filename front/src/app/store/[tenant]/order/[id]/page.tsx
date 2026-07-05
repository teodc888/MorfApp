'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getOrderTracking } from '@/lib/api'
import { useTenant } from '@/components/store/StoreProviders'
import { formatPrice } from '@/lib/utils'
import { STITCH } from '@/lib/stitch-theme'
import type { OrderTracking } from '@/types/store'

const DS = {
  bg: STITCH.bg,
  surface: STITCH.surface,
  primary: STITCH.primary,
  secondary: STITCH.secondary,
  tertiary: STITCH.tertiary,
  text: STITCH.text,
  textMuted: STITCH.muted,
  border: STITCH.border,
  radius: STITCH.radius,
}

const STEPS: { key: OrderTracking['status']; label: string; emoji: string }[] = [
  { key: 'pending', label: 'Pendiente', emoji: '📝' },
  { key: 'confirmed', label: 'Confirmado', emoji: '✅' },
  { key: 'preparing', label: 'En preparación', emoji: '👨‍🍳' },
  { key: 'ready', label: 'Listo', emoji: '📦' },
  { key: 'delivered', label: 'Entregado', emoji: '🎉' },
]

function deliveryModeLabel(order: OrderTracking): string {
  if (order.deliveryMode === 'delivery') {
    return order.address || 'Envío a domicilio'
  }
  return 'Retiro en local'
}

function OrderTimeline({ order }: { order: OrderTracking }) {
  if (order.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center py-4 gap-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: STITCH.errorBg }}
        >
          <span className="text-2xl" style={{ color: STITCH.error }}>✕</span>
        </div>
        <p className="font-bold text-lg" style={{ color: STITCH.error }}>Pedido cancelado</p>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = i > currentIndex
        const isLast = i === STEPS.length - 1

        const dotColor = isDone || isCurrent ? DS.primary : DS.border
        const textColor = isFuture ? DS.textMuted : DS.text

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isCurrent ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: isDone ? dotColor : isCurrent ? dotColor : DS.bg,
                  border: `2px solid ${dotColor}`,
                  color: isDone || isCurrent ? '#FFFFFF' : DS.textMuted,
                }}
              >
                {isDone ? '✓' : step.emoji}
              </div>
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[24px]"
                  style={{ backgroundColor: isDone ? DS.primary : DS.border }}
                />
              )}
            </div>
            <div className="pb-6">
              <p className="font-semibold text-sm" style={{ color: textColor }}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs" style={{ color: DS.primary }}>En curso ahora</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function OrderTrackingPage() {
  const params = useParams<{ tenant: string; id: string }>()
  const tenant = useTenant()
  const orderId = params.id

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-tracking', tenant.slug, orderId],
    queryFn: () => getOrderTracking(tenant.slug, orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'delivered' || status === 'cancelled' ? false : 30000
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: DS.bg }}>
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: `3px solid ${DS.primary}`, borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4" style={{ backgroundColor: DS.bg }}>
        <p className="text-xl font-bold text-center" style={{ color: DS.text, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          No encontramos este pedido
        </p>
        <p className="text-sm text-center" style={{ color: DS.textMuted }}>
          Puede que el link sea incorrecto o el pedido ya no exista.
        </p>
        <Link
          href={`/store/${tenant.slug}`}
          className="px-6 py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: DS.primary }}
        >
          Volver al menú
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={{ backgroundColor: DS.bg }}>
      <main className="w-full max-w-md mx-auto flex flex-col items-center py-6">
        <h1
          className="text-2xl text-center mb-1 font-bold"
          style={{ color: DS.text, fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.02em' }}
        >
          Seguimiento de tu pedido
        </h1>
        <p className="text-sm mb-6" style={{ color: DS.textMuted }}>
          #{order.id.slice(-6).toUpperCase()}
        </p>

        {/* Timeline card */}
        <div
          className="w-full rounded-xl p-6 mb-6"
          style={{ backgroundColor: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.05)' }}
        >
          <OrderTimeline order={order} />

          {order.estimatedMinutes && (
            <div
              className="mt-2 rounded-lg py-2 px-3 text-center font-semibold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: DS.bg, color: DS.primary }}
            >
              <span>⏱</span> Tiempo estimado: {order.estimatedMinutes}
            </div>
          )}
        </div>

        {/* Order details card */}
        <div
          className="w-full rounded-xl p-6 mb-6"
          style={{ backgroundColor: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.05)' }}
        >
          <h2
            className="text-lg mb-4 pb-3 font-bold"
            style={{ color: DS.primary, borderBottom: `1px solid ${DS.border}`, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Detalle del pedido
          </h2>

          <div className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: DS.text }}>
                    {item.quantity}x {item.productName}
                  </p>
                  {item.modifiers.map((mod, mIdx) => (
                    <p key={mIdx} className="text-xs" style={{ color: DS.textMuted }}>
                      · {mod.optionName}
                      {mod.extraPrice > 0 ? ` (+${formatPrice(mod.extraPrice)})` : ''}
                    </p>
                  ))}
                  {item.observations && (
                    <p className="text-xs italic mt-0.5" style={{ color: DS.textMuted }}>
                      📝 {item.observations}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold whitespace-nowrap" style={{ color: DS.text }}>
                  {formatPrice(item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-3 mb-4" style={{ borderTop: `1px solid ${DS.border}` }}>
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg" style={{ color: DS.text }}>Total</p>
              <p className="font-bold text-lg" style={{ color: DS.primary }}>{formatPrice(order.totalPrice)}</p>
            </div>
          </div>

          <div className="pt-3 space-y-1" style={{ borderTop: `1px solid ${DS.border}` }}>
            <p className="text-sm" style={{ color: DS.text }}>
              <span className="font-semibold">Entrega:</span> {deliveryModeLabel(order)}
            </p>
            <p className="text-sm" style={{ color: DS.text }}>
              <span className="font-semibold">Cliente:</span> {order.customerName}
            </p>
            <p className="text-xs" style={{ color: DS.textMuted }}>
              Contacto: {order.customerPhoneMasked}
            </p>
          </div>
        </div>

        <Link
          href={`/store/${tenant.slug}`}
          className="w-full py-3 rounded-xl font-semibold text-white flex justify-center items-center gap-2"
          style={{ backgroundColor: DS.primary, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}
        >
          <span>←</span>
          Volver al Menú
        </Link>
      </main>
    </div>
  )
}
