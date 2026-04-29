import type { DeliveryConfig } from '@/types/store'

type Props = {
  deliveryConfig: DeliveryConfig
}

export function DeliveryChips({ deliveryConfig: dc }: Props) {
  const chips: { icon: string; label: string }[] = []

  if (dc.mode === 'delivery' || dc.mode === 'both') {
    if (!dc.deliveryCost || dc.deliveryCost === 0) {
      chips.push({ icon: '🏍️', label: 'Delivery gratis' })
    } else if (dc.freeDeliveryFrom) {
      chips.push({ icon: '🏍️', label: `Gratis desde $${dc.freeDeliveryFrom.toLocaleString('es-AR')}` })
    } else {
      chips.push({ icon: '🏍️', label: `Delivery $${dc.deliveryCost.toLocaleString('es-AR')}` })
    }
  }

  if (dc.estimatedMinutes) {
    chips.push({ icon: '🕐', label: `${dc.estimatedMinutes} min estimados` })
  }

  if (dc.mode === 'pickup' || dc.mode === 'both') {
    chips.push({ icon: '🏪', label: 'Retiro en local' })
  }

  if (dc.minOrderAmount) {
    chips.push({ icon: '💰', label: `Mínimo $${dc.minOrderAmount.toLocaleString('es-AR')}` })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 text-sm text-zinc-500"
        >
          <span>{chip.icon}</span>
          <span>{chip.label}</span>
        </div>
      ))}
    </div>
  )
}
