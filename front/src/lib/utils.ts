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

function buildProductsBlock(items: CartItem[]): string {
  const lines: string[] = []

  items.forEach((item, index) => {
    const itemTotal = ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty

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

  return lines.join('\n')
}

export function buildWhatsAppMessage(
  tenant: TenantPublic,
  items: CartItem[],
  customerData: CustomerForm,
): string {
  let total = 0
  items.forEach((item) => {
    const itemTotal = ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty
    total += itemTotal
  })

  const deliveryCost = (() => {
    if (customerData.deliveryMode !== 'delivery') return 0
    const cost = tenant.deliveryConfig.deliveryCost ?? 0
    const freeFrom = tenant.deliveryConfig.freeDeliveryFrom
    if (freeFrom && total >= freeFrom) return 0
    return cost
  })()

  const grandTotal = total + deliveryCost

  const paymentLabels = { cash: '💵 Efectivo', transfer: '🏦 Transferencia', card: '💳 Tarjeta' }
  const paymentMethod = paymentLabels[customerData.paymentMethod]
  const mode = customerData.deliveryMode === 'delivery' ? 'Delivery' : 'Retiro en local'
  const now = new Date()
  const hora = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  if (tenant.whatsAppMessageTemplate) {
    const productsBlock = buildProductsBlock(items)
    const template = tenant.whatsAppMessageTemplate
      .replace(/{negocio}/g, tenant.name)
      .replace(/{emoji}/g, tenant.branding.emojiIcon)
      .replace(/{productos}/g, productsBlock)
      .replace(/{subtotal}/g, formatPrice(total))
      .replace(/{envio}/g, formatPrice(deliveryCost))
      .replace(/{total}/g, formatPrice(grandTotal))
      .replace(/{cliente}/g, customerData.name)
      .replace(/{telefono}/g, customerData.phone || '(sin teléfono)')
      .replace(/{direccion}/g, customerData.address || '(sin dirección)')
      .replace(/{pago}/g, paymentMethod)
      .replace(/{modo}/g, mode)
      .replace(/{notas}/g, customerData.notes || '(sin notas)')
      .replace(/{hora}/g, hora)
    return template
  }

  const lines: string[] = []

  lines.push(`${tenant.branding.emojiIcon} *Pedido — ${tenant.name}*`)
  lines.push('━━━━━━━━━━━━━━━━')

  items.forEach((item, index) => {
    const itemTotal = ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty

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

  lines.push('━━━━━━━━━━━━━━━━')
  if (deliveryCost > 0) {
    lines.push(`🛒 Subtotal: ${formatPrice(total)}`)
    lines.push(`🛵 Envío: ${formatPrice(deliveryCost)}`)
  }
  lines.push(`💰 *Total: ${formatPrice(grandTotal)}*`)
  lines.push(`🕐 ${hora}`)
  lines.push('')

  const phoneDisplay = customerData.phone ? ` · 📞 ${customerData.phone}` : ''
  lines.push(`👤 *${customerData.name}*${phoneDisplay}`)

  if (customerData.deliveryMode === 'delivery' && customerData.address) {
    lines.push(`🛵 Delivery a: ${customerData.address}`)
  } else {
    lines.push('🏠 Retiro en local')
  }

  lines.push(`💳 Pago: ${paymentMethod}`)

  if (customerData.notes) {
    lines.push(`📝 ${customerData.notes}`)
  }

  return lines.join('\n')
}
