import type { TenantBranding, TenantPublic, CartItem } from '@/types/store'

export type CustomerForm = {
  name: string
  phone: string
  address: string
  notes: string
  deliveryMode: 'delivery' | 'pickup'
  paymentMethod: 'cash' | 'transfer' | 'card'
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

export function applyTenantTheme(branding: TenantBranding): void {
  const root = document.documentElement
  root.style.setProperty('--color-primary', branding.colorPrimary)
  root.style.setProperty('--color-accent', branding.colorAccent)
  root.style.setProperty('--color-primary-rgb', hexToRgb(branding.colorPrimary))
  root.style.setProperty('--color-accent-rgb', hexToRgb(branding.colorAccent))
}

export function formatPrice(amount: number, locale = 'es-AR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function buildWhatsAppMessage(
  tenant: TenantPublic,
  items: CartItem[],
  customerData: CustomerForm,
): string {
  const lines: string[] = []

  lines.push(`🍔 *Pedido — ${tenant.name}*`)
  lines.push('━━━━━━━━━━━━━━━━')

  let total = 0

  items.forEach((item, index) => {
    const itemTotal = (item.product.price + item.extraPrice) * item.qty
    total += itemTotal

    lines.push(`*${index + 1}. ${item.product.emoji} ${item.product.name}* x${item.qty}`)

    Object.entries(item.selections).forEach(([, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          const names = value.map((v) => v.name).join(', ')
          lines.push(`   · ${names}`)
        }
      } else {
        lines.push(`   · ${value.name}`)
      }
    })

    if (item.observations) {
      lines.push(`   📝 _${item.observations}_`)
    }
    lines.push(`   _Subtotal: ${formatPrice(itemTotal)}_`)
    lines.push('')
  })

  const deliveryCost = (() => {
    if (customerData.deliveryMode !== 'delivery') return 0
    const cost = tenant.deliveryConfig.deliveryCost ?? 0
    const freeFrom = tenant.deliveryConfig.freeDeliveryFrom
    if (freeFrom && total >= freeFrom) return 0
    return cost
  })()

  const grandTotal = total + deliveryCost

  lines.push('━━━━━━━━━━━━━━━━')
  if (deliveryCost > 0) {
    lines.push(`🛒 Subtotal: ${formatPrice(total)}`)
    lines.push(`🛵 Envío: ${formatPrice(deliveryCost)}`)
  }
  lines.push(`💰 *Total: ${formatPrice(grandTotal)}*`)
  lines.push('')

  const phoneDisplay = customerData.phone ? ` · 📞 ${customerData.phone}` : ''
  lines.push(`👤 *${customerData.name}*${phoneDisplay}`)

  if (customerData.deliveryMode === 'delivery' && customerData.address) {
    lines.push(`🛵 Delivery a: ${customerData.address}`)
  } else {
    lines.push('🏠 Retiro en local')
  }

  const paymentLabels = { cash: '💵 Efectivo', transfer: '🏦 Transferencia', card: '💳 Tarjeta' }
  lines.push(`💳 Pago: ${paymentLabels[customerData.paymentMethod]}`)

  if (customerData.notes) {
    lines.push(`📝 ${customerData.notes}`)
  }

  return lines.join('\n')
}
