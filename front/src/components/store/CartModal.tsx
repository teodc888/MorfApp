'use client'

import { useState } from 'react'
import type { TenantPublic, CartItem, SelectedOption } from '@/types/store'
import { useCartStore } from '@/store/cart'
import { formatPrice, buildWhatsAppMessage } from '@/lib/utils'
import type { CustomerForm } from '@/lib/utils'
import { registerRedemption } from '@/lib/api'

type Props = {
  tenant: TenantPublic
  onClose: () => void
}

function CartItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)

  const modifierSummary = Object.values(item.selections)
    .flatMap((val) => {
      if (Array.isArray(val)) return (val as SelectedOption[]).map((v) => v.name)
      return [(val as SelectedOption).name]
    })
    .join(', ')

  const subtotal = ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
      <span className="text-3xl leading-none flex-shrink-0">{item.product.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 text-sm leading-snug">{item.product.name}</p>
        <div className="mt-1 space-y-0.5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {item.product.discountPercent && item.product.finalPrice && (
                <>
                  <span className="line-through text-xs text-zinc-400">
                    {formatPrice(item.product.price)}
                  </span>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                    -{item.product.discountPercent}%
                  </span>
                </>
              )}
            </div>
            <span className="text-xs font-semibold text-zinc-700">
              {formatPrice((item.product.finalPrice ?? item.product.price) * item.qty)}
            </span>
          </div>

          {Object.entries(item.selections).map(([, value]) => {
            const selections = Array.isArray(value) ? value : [value]
            return selections.map((sel: SelectedOption) => (
              <div key={sel.optionId} className="flex justify-between text-xs text-zinc-500">
                <span>· {sel.name}</span>
                <span>+ {formatPrice(sel.extraPrice * item.qty)}</span>
              </div>
            ))
          })}

          {item.observations && (
            <p className="text-xs text-zinc-400 italic mt-1">📝 {item.observations}</p>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-zinc-100 mt-1">
            <span className="text-xs font-bold text-zinc-900">Total</span>
            <span className="text-sm font-bold text-primary">{formatPrice(subtotal)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => updateQty(item.cartId, item.qty - 1)}
          className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-base"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
        <button
          onClick={() => updateQty(item.cartId, item.qty + 1)}
          className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-base"
        >
          +
        </button>
        <button
          onClick={() => removeItem(item.cartId)}
          className="ml-1 w-7 h-7 rounded-full bg-zinc-100 text-red-400 flex items-center justify-center text-sm"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export function CartModal({ tenant, onClose }: Props) {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const clear = useCartStore((s) => s.clear)
  const [isClosing, setIsClosing] = useState(false)
  const [redemptionError, setRedemptionError] = useState<string | null>(null)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  const deliveryMode = tenant.deliveryConfig.mode

  const [activeDelivery, setActiveDelivery] = useState<'delivery' | 'pickup'>(
    deliveryMode === 'pickup' ? 'pickup' : 'delivery',
  )
  const [form, setForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    deliveryMode: deliveryMode === 'pickup' ? 'pickup' : 'delivery',
    paymentMethod: 'cash',
  })

  const handleInput = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const getAvailablePaymentMethods = (mode: 'delivery' | 'pickup') => {
    const methods = [
      { key: 'cash' as const, label: 'Efectivo', icon: '💵',
        enabled: mode === 'delivery' ? tenant.paymentConfig.deliveryCash : tenant.paymentConfig.pickupCash },
      { key: 'transfer' as const, label: 'Transferencia', icon: '🏦',
        enabled: mode === 'delivery' ? tenant.paymentConfig.deliveryTransfer : tenant.paymentConfig.pickupTransfer },
      { key: 'card' as const, label: 'Tarjeta', icon: '💳',
        enabled: mode === 'delivery' ? tenant.paymentConfig.deliveryCard : tenant.paymentConfig.pickupCard },
    ]
    return methods.filter(m => m.enabled)
  }

  const handleDeliverySwitch = (mode: 'delivery' | 'pickup') => {
    setActiveDelivery(mode)
    const available = getAvailablePaymentMethods(mode)
    const newPaymentMethod = available.length > 0 ? available[0].key : 'cash'
    setForm((prev) => ({ ...prev, deliveryMode: mode, paymentMethod: newPaymentMethod }))
  }

  const minAmount = tenant.deliveryConfig.minOrderAmount ?? 0
  const shortfall = minAmount > 0 ? Math.max(0, minAmount - total) : 0

  const deliveryCost = (() => {
    if (activeDelivery !== 'delivery') return 0
    const cost = tenant.deliveryConfig.deliveryCost ?? 0
    const freeFrom = tenant.deliveryConfig.freeDeliveryFrom
    if (freeFrom && total >= freeFrom) return 0
    return cost
  })()

  const grandTotal = total + deliveryCost

  const isFormValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    (activeDelivery === 'pickup' || form.address.trim().length > 0)

  const handleConfirm = async () => {
    if (!isFormValid || shortfall > 0) return

    // Validar redemptions para promos antes de abrir WhatsApp
    try {
      setRedemptionError(null)
      for (const item of items) {
        if (item.product.id.startsWith('promo:')) {
          const promoId = item.product.id.replace('promo:', '')
          const status = await registerRedemption(tenant.slug, promoId, {
            phoneNumber: form.phone,
            quantity: item.qty,
          })
          if (!status.canRedeem) {
            setRedemptionError(
              `Ya alcanzaste el límite de esta promo. Máximo: ${status.maxPerUser}, Usado: ${status.used}`
            )
            return
          }
        }
      }
    } catch {
      setRedemptionError('Error validando promoción')
      return
    }

    // Abrir WhatsApp (si llegó aquí, todas las validaciones pasaron)
    const message = buildWhatsAppMessage(tenant, items, {
      ...form,
      deliveryMode: activeDelivery,
    })
    const encoded = encodeURIComponent(message)
    const number = tenant.whatsappNumber.replace(/\D/g, '')
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank')
    clear()
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      <div
        className={`relative bg-white rounded-t-2xl max-h-[92dvh] flex flex-col max-w-[520px] mx-auto w-full overflow-hidden transition-opacity duration-300 ${
          isClosing ? 'animate-slide-down opacity-0' : 'animate-slide-up opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-base">Tu carrito</h2>
          <button
            onClick={handleClose}
            className="text-zinc-400 p-1 rounded-full hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-3">🛒</span>
              <p className="text-zinc-500 font-medium">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div className="py-2">
                {items.map((item) => (
                  <CartItemRow key={item.cartId} item={item} />
                ))}
              </div>

              {/* Delivery mode tabs — only when mode is 'both' */}
              {deliveryMode === 'both' && (
                <div className="flex gap-2 mt-3 mb-4">
                  {(['delivery', 'pickup'] as const).map((mode) => {
                    const isActive = activeDelivery === mode
                    return (
                      <button
                        key={mode}
                        onClick={() => handleDeliverySwitch(mode)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                          isActive
                            ? 'bg-primary-muted border-primary text-primary'
                            : 'border-zinc-200 text-zinc-500'
                        }`}
                      >
                        {mode === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local'}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Customer form */}
              <div className="flex flex-col gap-3 pb-4">
                <input
                  type="text"
                  placeholder="Tu nombre *"
                  value={form.name}
                  onChange={(e) => handleInput('name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none ring-primary focus:border-primary"
                />
                <input
                  type="tel"
                  placeholder="Teléfono *"
                  value={form.phone}
                  onChange={(e) => handleInput('phone', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none ring-primary focus:border-primary"
                />
                {activeDelivery === 'delivery' && (
                  <input
                    type="text"
                    placeholder="Dirección de entrega *"
                    value={form.address}
                    onChange={(e) => handleInput('address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none ring-primary focus:border-primary"
                  />
                )}
                <textarea
                  placeholder="Aclaraciones (opcional)"
                  value={form.notes}
                  onChange={(e) => handleInput('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none ring-primary focus:border-primary resize-none"
                />

                {/* Método de pago */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2">Forma de pago</p>
                  <div className="flex gap-2">
                    {getAvailablePaymentMethods(activeDelivery).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setForm((f) => ({ ...f, paymentMethod: key }))}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          form.paymentMethod === key
                            ? 'bg-primary-muted border-primary text-primary'
                            : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desglose de precios */}
                <div className="border-t border-zinc-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {activeDelivery === 'delivery' && (
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Envío</span>
                      <span>
                        {deliveryCost === 0
                          ? <span className="text-green-600 font-medium">Gratis</span>
                          : formatPrice(deliveryCost)
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-100">
                    <span className="font-bold text-zinc-900">Total</span>
                    <span className="font-bold text-lg text-primary">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Confirm button */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-5 pt-2 border-t border-zinc-100">
            {redemptionError && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm mb-3">
                {redemptionError}
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={!isFormValid || shortfall > 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-opacity bg-accent ${
                isFormValid && shortfall === 0 ? 'opacity-100' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              {shortfall > 0
                ? `Te faltan ${formatPrice(shortfall)} para el mínimo`
                : `Confirmar pedido · ${formatPrice(grandTotal)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
