'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantPublic, CartItem, SelectedOption } from '@/types/store'
import { useCartStore } from '@/store/cart'
import {
  formatPrice,
  buildWhatsAppMessage,
  buildStorePath,
  getStoreClosedMessage,
  loadCustomerData,
  saveCustomerData,
  clearCustomerData,
  savePendingWhatsAppOrder,
} from '@/lib/utils'
import type { CustomerForm } from '@/lib/utils'
import { createOrder, buildOrderItems, ApiError } from '@/lib/api'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  tenant: TenantPublic
  onClose: () => void
}

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
  radiusSm: '12px',
}

function CartItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty)
  const removeItem = useCartStore((s) => s.removeItem)

  if (!item.product) {
    return (
      <div className="flex items-center justify-between py-3 px-2" style={{ borderBottom: `1px solid ${DS.border}30`, backgroundColor: '#FEF2F2' }}>
        <span className="text-sm" style={{ color: '#DC2626' }}>Producto no disponible</span>
        <button
          onClick={() => removeItem(item.cartId)}
          className="text-xs px-2 py-1 rounded"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
        >
          Remover
        </button>
      </div>
    )
  }

  const subtotal = ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: `1px solid ${DS.border}30` }}>
      <span className="text-3xl leading-none flex-shrink-0">{item.product.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug" style={{ color: DS.text }}>{item.product.name}</p>
        <div className="mt-1 space-y-0.5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {item.product.discountPercent && item.product.finalPrice && (
                <>
                  <span className="line-through text-xs" style={{ color: '#9CA3AF' }}>
                    {formatPrice(item.product.price)}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FED7AA', color: '#EA580C' }}>
                    -{item.product.discountPercent}%
                  </span>
                </>
              )}
            </div>
            <span className="text-xs font-semibold" style={{ color: DS.text }}>
              {formatPrice((item.product.finalPrice ?? item.product.price) * item.qty)}
            </span>
          </div>

          {Object.entries(item.selections).map(([, value]) => {
            const selections = Array.isArray(value) ? value : [value]
            return selections.map((sel: SelectedOption) => (
              <div key={sel.optionId} className="flex justify-between text-xs" style={{ color: DS.textMuted }}>
                <span>· {sel.name}</span>
                <span>+ {formatPrice(sel.extraPrice * item.qty)}</span>
              </div>
            ))
          })}

          {item.observations && (
            <p className="text-xs italic mt-1" style={{ color: DS.textMuted }}>📝 {item.observations}</p>
          )}

          <div className="flex justify-between items-center pt-1 mt-1" style={{ borderTop: `1px solid ${DS.border}` }}>
            <span className="text-xs font-bold" style={{ color: DS.text }}>Total</span>
            <span className="text-sm font-bold" style={{ color: DS.primary }}>{formatPrice(subtotal)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => updateQty(item.cartId, item.qty - 1)}
          aria-label="Disminuir cantidad"
          className="w-7 h-7 rounded-full flex items-center justify-center text-base transition-colors"
          style={{ backgroundColor: '#F3F4F6', color: DS.textMuted }}
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
        <button
          onClick={() => updateQty(item.cartId, item.qty + 1)}
          aria-label="Aumentar cantidad"
          className="w-7 h-7 rounded-full flex items-center justify-center text-base transition-colors"
          style={{ backgroundColor: '#F3F4F6', color: DS.textMuted }}
        >
          +
        </button>
        <button
          onClick={() => removeItem(item.cartId)}
          aria-label="Quitar del carrito"
          className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-sm"
          style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export function CartModal({ tenant, onClose }: Props) {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const clear = useCartStore((s) => s.clear)
  const [isClosing, setIsClosing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY
    setIsDragging(true)
  }

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return
    const diff = clientY - dragStartY.current
    if (diff > 0) {
      setDragY(diff)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    if (dragY > 100) {
      handleClose()
    } else {
      setDragY(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientY)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    handleDragMove(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    handleDragEnd()
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
  const [hasSavedCustomerData, setHasSavedCustomerData] = useState(false)

  useEffect(() => {
    const saved = loadCustomerData()
    if (saved) {
      setHasSavedCustomerData(true)
      setForm((prev) => ({
        ...prev,
        name: saved.name,
        phone: saved.phone,
        address: saved.address,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleForgetCustomerData = () => {
    clearCustomerData()
    setHasSavedCustomerData(false)
    setForm((prev) => ({ ...prev, name: '', phone: '', address: '' }))
  }

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
    form.name.trim().length >= 2 &&
    /^\d{8,}$/.test(form.phone.replace(/[\s+\-()]/g, '')) &&
    (activeDelivery === 'pickup' || form.address.trim().length > 0)

  const closedMessage = useMemo(
    () => (!tenant.isOpen ? getStoreClosedMessage(tenant.businessHours) : null),
    [tenant.isOpen, tenant.businessHours]
  )

  const isConfirmDisabled = !isFormValid || shortfall > 0 || isSaving || !tenant.isOpen

  const handleConfirm = async () => {
    if (!isFormValid || shortfall > 0 || isSaving) return

    if (!tenant.isOpen) {
      setOrderError(closedMessage)
      return
    }

    setOrderError(null)

    // Guardar pedido en BD antes de abrir WhatsApp
    // El backend valida y registra el límite de redemption de promos (MaxPerUser)
    // de forma atómica dentro de CreateOrder; si se excede, devuelve 409 PROMO_LIMIT_REACHED.
    setIsSaving(true)
    let orderId: string
    try {
      const result = await createOrder(tenant.slug, {
        items: buildOrderItems(items),
        total: grandTotal,
        customerName: form.name,
        customerPhone: form.phone,
        deliveryMode: activeDelivery,
        address: activeDelivery === 'delivery' ? form.address : undefined,
        notes: form.notes || undefined,
        paymentMethod: form.paymentMethod,
      })
      orderId = result.orderId
    } catch (err) {
      if (err instanceof ApiError && err.code === 'STORE_CLOSED') {
        setOrderError(closedMessage ?? 'Cerrado ahora')
      } else if (err instanceof ApiError && err.code === 'PROMO_LIMIT_REACHED') {
        setOrderError(err.message)
      } else {
        setOrderError('Error al guardar pedido. Intenta de nuevo.')
      }
      setIsSaving(false)
      return
    }
    setIsSaving(false)

    // Armar mensaje de WhatsApp y guardarlo para que el usuario lo envíe desde /success
    const message = buildWhatsAppMessage(tenant, items, {
      ...form,
      deliveryMode: activeDelivery,
    }, orderId)
    savePendingWhatsAppOrder({
      orderId,
      phoneNumber: tenant.whatsappNumber.replace(/\D/g, ''),
      message,
    })
    saveCustomerData({ name: form.name, phone: form.phone, address: form.address })
    clear()
    router.push(buildStorePath(tenant.slug, `/success?orderId=${orderId}&total=${grandTotal}`))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'transparent' }}>
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={handleClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        tabIndex={-1}
        className={`relative flex flex-col max-w-[520px] mx-auto w-full overflow-hidden transition-opacity duration-300 outline-none ${isClosing ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'}`}
        style={{
          backgroundColor: DS.surface,
          borderTopLeftRadius: DS.radius,
          borderTopRightRadius: DS.radius,
          maxHeight: '92dvh',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header - drag pill + título (solo el handle arrastra) */}
        <div className="flex-shrink-0 sticky top-0" style={{ backgroundColor: DS.surface }}>
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: DS.border }} />
          </div>
          <div className="flex items-center px-4 pb-2" style={{ borderBottom: `1px solid ${DS.border}` }}>
            <h2 className="font-bold text-base" style={{ color: DS.text, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Tu Pedido</h2>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-3">🛒</span>
              <p className="font-medium" style={{ color: DS.textMuted }}>Tu carrito está vacío</p>
            </div>
          ) : (
            <>

              {/* Order Items Section - Stitch Design */}
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
                        className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors"
                        style={{
                          backgroundColor: isActive ? DS.primary : 'transparent',
                          borderColor: isActive ? DS.primary : DS.border,
                          color: isActive ? '#FFFFFF' : DS.textMuted,
                        }}
                      >
                        {mode === 'delivery' ? '🛵 Delivery' : '🏠 Retiro'}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Customer form */}
              <div className="flex flex-col gap-3 pb-4">
                {hasSavedCustomerData && (
                  <div className="flex items-center justify-between -mb-1">
                    <span className="text-xs" style={{ color: DS.textMuted }}>Datos guardados</span>
                    <button
                      type="button"
                      onClick={handleForgetCustomerData}
                      className="text-xs w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ color: DS.textMuted, border: `1px solid ${DS.border}` }}
                      aria-label="Olvidar datos guardados"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Tu nombre *"
                  value={form.name}
                  onChange={(e) => handleInput('name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, color: DS.text }}
                />
                <input
                  type="tel"
                  placeholder="Teléfono *"
                  value={form.phone}
                  onChange={(e) => handleInput('phone', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, color: DS.text }}
                />
                {activeDelivery === 'delivery' && (
                  <input
                    type="text"
                    placeholder="Dirección de entrega *"
                    value={form.address}
                    onChange={(e) => handleInput('address', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, color: DS.text }}
                  />
                )}
                <textarea
                  placeholder="Aclaraciones (opcional)"
                  value={form.notes}
                  onChange={(e) => handleInput('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, color: DS.text }}
                />

                {/* Método de pago */}
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: DS.textMuted }}>Forma de pago</p>
                  <div className="flex gap-2">
                    {getAvailablePaymentMethods(activeDelivery).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setForm((f) => ({ ...f, paymentMethod: key }))}
                        className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold border transition-colors"
                        style={{
                          backgroundColor: form.paymentMethod === key ? DS.primary : 'transparent',
                          borderColor: form.paymentMethod === key ? DS.primary : DS.border,
                          color: form.paymentMethod === key ? '#FFFFFF' : DS.textMuted,
                        }}
                      >
                        <span className="text-lg">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Section - Stitch Design */}
                <div className="rounded-xl p-4" style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}` }}>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm" style={{ color: DS.textMuted }}>
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    {activeDelivery === 'delivery' && (
                      <div className="flex justify-between text-sm" style={{ color: DS.textMuted }}>
                        <span>Envío</span>
                        <span>
                          {deliveryCost === 0
                            ? <span className="font-medium" style={{ color: DS.secondary }}>Gratis</span>
                            : formatPrice(deliveryCost)
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
                      <span className="font-bold text-lg" style={{ color: DS.text }}>Total</span>
                      <span className="font-bold text-lg" style={{ color: DS.primary }}>{formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Confirm button */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-5 pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
            {closedMessage && (
              <div className="px-3 py-2 rounded text-sm mb-3" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                {closedMessage}
              </div>
            )}
            {orderError && (
              <div className="px-3 py-2 rounded text-sm mb-3" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                {orderError}
              </div>
            )}
            <button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: isConfirmDisabled ? '#D1D5DB' : DS.primary,
                opacity: isConfirmDisabled ? 0.6 : 1,
                cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </>
              ) : shortfall > 0
                ? `Mínimo ${formatPrice(shortfall)}`
                : `Confirmar · ${formatPrice(grandTotal)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
