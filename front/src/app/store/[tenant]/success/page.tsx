'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, loadPendingWhatsAppOrder, buildOrderFollowUpMessage } from '@/lib/utils'
import { useTenant } from '@/components/store/StoreProviders'
import { STITCH } from '@/lib/stitch-theme'

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

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const tenant = useTenant()

  const orderId = searchParams.get('orderId') || '—'
  const total = searchParams.get('total') || '0'
  const estimatedTime = searchParams.get('time') || '30-45 min'

  const handleSendWhatsApp = () => {
    const pending = loadPendingWhatsAppOrder(orderId)
    if (pending) {
      window.open(`https://wa.me/${pending.phoneNumber}?text=${encodeURIComponent(pending.message)}`, '_blank')
      return
    }
    const fallbackMessage = buildOrderFollowUpMessage(tenant.name, tenant.branding.emojiIcon, orderId, parseFloat(total))
    const number = tenant.whatsappNumber.replace(/\D/g, '')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(fallbackMessage)}`, '_blank')
  }

  const ambientBackgroundStyle = tenant.branding.bannerUrl
    ? {
        backgroundImage: `url(${tenant.branding.bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(20px)',
      }
    : {
        background: `linear-gradient(135deg, ${tenant.branding.colorPrimary}, ${tenant.branding.colorAccent})`,
        filter: 'blur(20px)',
      }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: DS.bg }}>
      {/* Ambient Background - blurred image or tenant gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={ambientBackgroundStyle}
      />

      <main className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center">
        {/* Success Icon - bouncing animation */}
        <div className="mb-6" style={{ animation: 'bounce 0.8s ease-out' }}>
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
            style={{ 
              backgroundColor: DS.primary,
              boxShadow: '0px 12px 32px rgba(249,115,22,0.3)',
            }}
          >
            <span className="text-white text-5xl">✓</span>
          </div>
        </div>

        {/* Headline */}
        <h1 
          className="text-4xl text-center mb-2 font-bold"
          style={{ 
            color: DS.text, 
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          ¡Pedido enviado!
        </h1>

        {/* Instructions */}
        <p 
          className="text-lg text-center mb-8 max-w-md"
          style={{ color: DS.textMuted }}
        >
          Tu pedido está siendo procesada. En breve recibirás un mensaje de WhatsApp para confirmar los detalles.
        </p>

        {/* Order Summary Card - Bento Style */}
        <div 
          className="w-full rounded-xl p-6 mb-8"
          style={{ 
            backgroundColor: DS.surface, 
            border: `1px solid ${DS.border}`,
            boxShadow: '0px 4px 12px rgba(67,20,7,0.05)',
          }}
        >
          <h2 
            className="text-xl mb-4 pb-3 font-bold"
            style={{ 
              color: DS.primary, 
              borderBottom: `1px solid ${DS.border}`,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Resumen del Pedido
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold" style={{ color: DS.text }}>Pedido #</p>
                <p className="text-sm" style={{ color: DS.textMuted }}>{orderId.slice(-6).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: DS.text }}>Tiempo estimado</p>
                <p 
                  className="text-sm font-semibold flex items-center gap-1"
                  style={{ color: DS.primary }}
                >
                  <span>⏱</span> {estimatedTime}
                </p>
              </div>
            </div>

            {/* Items would be rendered here if passed via query params */}
            <div className="pt-3" style={{ borderTop: `1px solid ${DS.border}` }}>
              <div className="flex justify-between items-center">
                <p className="font-bold text-xl" style={{ color: DS.text }}>Total</p>
                <p className="font-bold text-xl" style={{ color: DS.primary }}>{formatPrice(parseFloat(total))}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="w-full py-3 rounded-xl font-semibold text-white flex justify-center items-center gap-2 mb-3"
          style={{
            backgroundColor: '#25D366',
            boxShadow: '0px 4px 12px rgba(37,211,102,0.3)',
          }}
        >
          <span>💬</span>
          Enviar pedido por WhatsApp
        </button>

        {orderId !== '—' && (
          <Link
            href={`/store/${tenant.slug}/order/${orderId}`}
            className="w-full py-3 rounded-xl font-semibold flex justify-center items-center gap-2 mb-3"
            style={{
              backgroundColor: 'transparent',
              border: `2px solid ${DS.primary}`,
              color: DS.primary,
            }}
          >
            <span>📦</span>
            Seguir mi pedido
          </Link>
        )}

        <Link
          href="/"
          className="w-full py-3 rounded-xl font-semibold text-white flex justify-center items-center gap-2"
          style={{
            backgroundColor: DS.primary,
            boxShadow: '0px 4px 12px rgba(67,20,7,0.08)',
          }}
        >
          <span>←</span>
          Volver al Menú
        </Link>
      </main>
    </div>
  )
}
