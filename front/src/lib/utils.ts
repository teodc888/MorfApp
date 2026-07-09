import type { TenantBranding, TenantPublic, CartItem, BusinessHour } from '@/types/store'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires'

function getArgentinaNowParts(now: Date): { dayOfWeek: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  let hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'

  // Intl puede devolver "24" para medianoche cuando hour12 es false
  if (hour === '24') hour = '00'

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return {
    dayOfWeek: weekdayMap[weekdayShort] ?? 0,
    time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  }
}

export function getStoreClosedMessage(businessHours: BusinessHour[]): string {
  const now = new Date()
  const { dayOfWeek: today, time: currentTime } = getArgentinaNowParts(now)

  for (let offset = 0; offset <= 7; offset++) {
    const dayOfWeek = (today + offset) % 7
    const match = businessHours.find((bh) => bh.dayOfWeek === dayOfWeek && bh.isOpen)

    if (!match || !match.opensAt) continue

    if (offset === 0 && match.opensAt <= currentTime) continue

    if (offset === 0) {
      return `Cerrado ahora — abrimos hoy a las ${match.opensAt}`
    }
    if (offset === 1) {
      return `Cerrado ahora — abrimos mañana a las ${match.opensAt}`
    }
    return `Cerrado ahora — abrimos el ${DIAS_SEMANA[dayOfWeek]} a las ${match.opensAt}`
  }

  return 'Cerrado ahora'
}

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

const STORE_ADMIN_SUBDOMAIN = 'admin'

/**
 * Replica el criterio de `front/src/proxy.ts` para determinar si un hostname
 * corresponde a un subdominio real de tenant (donde el proxy ya reescribe el
 * path agregando `/store/{slug}` del lado del servidor) — a diferencia de
 * localhost/127.0.0.1 (dev, sin rewrite) o del dominio raíz sin subdominio
 * (acceso directo por path, tampoco hay rewrite).
 *
 * Lee `NEXT_PUBLIC_ROOT_DOMAIN` en cada llamada (no la cachea a nivel de
 * módulo) para que sea consistente con el valor real en runtime y testeable.
 */
function isRealTenantSubdomain(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'morfapp.teodc.com'

  const subdomain =
    hostname === rootDomain
      ? ''
      : hostname.endsWith(`.${rootDomain}`)
        ? hostname.slice(0, -(rootDomain.length + 1))
        : hostname.split('.').length > 2
          ? hostname.split('.').slice(0, -2).join('.')
          : ''

  return subdomain !== '' && subdomain !== STORE_ADMIN_SUBDOMAIN
}

/**
 * Construye un path de navegación dentro del storefront, adaptado según el
 * contexto en el que se está ejecutando:
 * - En un subdominio real de tenant (ej. `pre.morfapp.app`, `burger.morfapp.app`),
 *   el proxy YA antepuso `/store/{slug}` server-side de forma invisible para el
 *   browser — hay que devolver el path SIN ese prefijo, o se duplica y rompe (404).
 * - En localhost/127.0.0.1 (dev) o en acceso directo por path sobre el dominio
 *   raíz, no hay rewrite — hay que devolver el path CON el prefijo completo.
 *
 * @param slug slug del tenant (ej. "burger")
 * @param path path relativo dentro del store; puede ser `''` (home) o empezar
 *   con `/` (ej. `/success?orderId=x`, `/order/123`)
 * @param hostnameOverride opcional — para tests. Por defecto usa
 *   `window.location.hostname`.
 */
export function buildStorePath(slug: string, path: string, hostnameOverride?: string): string {
  const suffix = path === '' || path.startsWith('/') ? path : `/${path}`
  const hostname = hostnameOverride ?? (typeof window !== 'undefined' ? window.location.hostname : undefined)

  if (hostname !== undefined && isRealTenantSubdomain(hostname)) {
    return suffix === '' ? '/' : suffix
  }

  return `/store/${slug}${suffix}`
}

/**
 * Igual que `buildStorePath`, pero devuelve una URL absoluta (con origin) —
 * pensado para links que se comparten fuera de la app (ej. WhatsApp).
 *
 * @param originOverride opcional — para tests. Por defecto usa
 *   `window.location.origin`.
 */
export function buildStoreUrl(slug: string, path: string, hostnameOverride?: string, originOverride?: string): string {
  const relativePath = buildStorePath(slug, path, hostnameOverride)
  const origin = originOverride ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

  if (origin === undefined) return relativePath

  return `${origin}${relativePath}`
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
  orderId?: string,
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

  lines.push(`${tenant.branding?.emojiIcon ?? '🍽️'} *Pedido — ${tenant.name}*`)
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

  if (orderId) {
    const trackingUrl = buildStoreUrl(tenant.slug, `/order/${orderId}`)
    lines.push(`📦 Seguí tu pedido: ${trackingUrl}`)
  }

  return lines.join('\n')
}

const CUSTOMER_DATA_KEY = 'morf_customer'
const PENDING_WHATSAPP_ORDER_KEY = 'morf_pending_whatsapp'

export type SavedCustomerData = Pick<CustomerForm, 'name' | 'phone' | 'address'>

export function saveCustomerData(data: SavedCustomerData): void {
  try {
    localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[utils] No se pudo guardar los datos del cliente:', e)
  }
}

export function loadCustomerData(): SavedCustomerData | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_DATA_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedCustomerData
  } catch (e) {
    console.error('[utils] No se pudo leer los datos del cliente:', e)
    return null
  }
}

export function clearCustomerData(): void {
  try {
    localStorage.removeItem(CUSTOMER_DATA_KEY)
  } catch (e) {
    console.error('[utils] No se pudo limpiar los datos del cliente:', e)
  }
}

export type PendingWhatsAppOrder = { orderId: string; phoneNumber: string; message: string }

export function savePendingWhatsAppOrder(data: PendingWhatsAppOrder): void {
  try {
    sessionStorage.setItem(PENDING_WHATSAPP_ORDER_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[utils] No se pudo guardar el pedido de WhatsApp pendiente:', e)
  }
}

export function loadPendingWhatsAppOrder(orderId: string): PendingWhatsAppOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_WHATSAPP_ORDER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingWhatsAppOrder
    if (parsed.orderId !== orderId) return null
    return parsed
  } catch (e) {
    console.error('[utils] No se pudo leer el pedido de WhatsApp pendiente:', e)
    return null
  }
}

export function clearPendingWhatsAppOrder(): void {
  try {
    sessionStorage.removeItem(PENDING_WHATSAPP_ORDER_KEY)
  } catch (e) {
    console.error('[utils] No se pudo limpiar el pedido de WhatsApp pendiente:', e)
  }
}

export function buildOrderFollowUpMessage(tenantName: string, emojiIcon: string, orderId: string, total: number): string {
  const shortId = orderId.slice(-6).toUpperCase()
  return `${emojiIcon} Hola! Quiero confirmar mi pedido #${shortId} en *${tenantName}* por un total de ${formatPrice(total)}.`
}
