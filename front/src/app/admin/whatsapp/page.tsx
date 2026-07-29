'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminMe, updateWhatsAppTemplate } from '@/lib/admin-api'
import { buildWhatsAppMessage, type CustomerForm } from '@/lib/utils'
import type { TenantPublic, CartItem } from '@/types/store'

const VARIABLES = [
  { var: '{negocio}', label: 'Nombre negocio' },
  { var: '{emoji}', label: 'Emoji' },
  { var: '{productos}', label: 'Productos' },
  { var: '{subtotal}', label: 'Subtotal' },
  { var: '{envio}', label: 'Envío' },
  { var: '{total}', label: 'Total' },
  { var: '{cliente}', label: 'Cliente' },
  { var: '{telefono}', label: 'Teléfono' },
  { var: '{direccion}', label: 'Dirección' },
  { var: '{pago}', label: 'Pago' },
  { var: '{modo}', label: 'Modo' },
  { var: '{notas}', label: 'Notas' },
  { var: '{hora}', label: 'Hora' },
]

const DEMO_CART: CartItem[] = [
  {
    cartId: '1',
    product: {
      id: '1',
      name: 'Hamburguesa Clásica',
      description: '',
      price: 1200,
      emoji: '🍔',
      imageUrls: [],
      tags: [],
      modifierGroups: [],
      isOutOfStock: false,
    },
    qty: 2,
    selections: {
      grp1: { optionId: '1', name: 'Carne Normal', extraPrice: 0 },
      grp2: [
        { optionId: '2', name: 'Queso', extraPrice: 100 },
        { optionId: '3', name: 'Bacon', extraPrice: 150 },
      ],
    },
    extraPrice: 250,
    observations: 'Sin cebolla',
  },
  {
    cartId: '2',
    product: {
      id: '2',
      name: 'Papas Fritas',
      description: '',
      price: 500,
      emoji: '🍟',
      imageUrls: [],
      tags: [],
      modifierGroups: [],
      isOutOfStock: false,
    },
    qty: 1,
    selections: {},
    extraPrice: 0,
  },
]

const DEMO_CUSTOMER: CustomerForm = {
  name: 'Juan García',
  phone: '1234567890',
  address: 'Calle Principal 123, Apto 4B',
  notes: 'Dejar en conserjería',
  deliveryMode: 'delivery',
  paymentMethod: 'transfer',
}

export default function WhatsAppPage() {
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState<string | null>(null)
  const [tenantData, setTenantData] = useState<TenantPublic | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: getAdminMe,
  })

  useEffect(() => {
    if (!data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTemplate(data.whatsAppMessageTemplate ?? '')
    // Create a public DTO from the admin DTO
    setTenantData({
      id: data.id,
      slug: data.slug,
      name: data.name,
      whatsappNumber: data.whatsappNumber,
      whatsAppMessageTemplate: data.whatsAppMessageTemplate,
      isOpen: true,
      status: 'Active',
      metaPixelId: null,
      googleAnalyticsId: null,
      branding: data.branding,
      deliveryConfig: data.delivery || {
        mode: 'both',
        deliveryCost: null,
        freeDeliveryFrom: null,
        minOrderAmount: null,
        estimatedMinutes: null,
        pickupAddress: null,
      },
      paymentConfig: data.payment || {
        deliveryCash: true,
        deliveryTransfer: true,
        deliveryCard: true,
        pickupCash: true,
        pickupTransfer: true,
        pickupCard: true,
      },
      businessHours: data.hours,
    })
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => updateWhatsAppTemplate(template || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-me'] })
      toast.success('Plantilla guardada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const handleSave = () => saveMutation.mutate()
  const saving = saveMutation.isPending

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newTemplate = (template || '').slice(0, start) + variable + (template || '').slice(end)
    setTemplate(newTemplate)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const resetToDefault = () => {
    setTemplate('')
  }

  const preview = !tenantData
    ? ''
    : buildWhatsAppMessage(
        tenantData,
        DEMO_CART,
        DEMO_CUSTOMER,
      )

  if (isLoading) {
    return (
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Mensaje Automático</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', fontWeight: 700 }}>WhatsApp</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>Personalizá el texto que recibe el cliente al confirmar el pedido.</p>
      </div>

      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Preview chat bubble */}
        <div className="card" style={{ padding: 16, background: '#ECE5DD', border: 'none' }}>
          <div className="text-xs" style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#075E54', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            💬 Vista previa
          </div>
          <div style={{
            background: '#DCF8C6',
            padding: '10px 12px',
            borderRadius: '14px 14px 14px 4px',
            position: 'relative',
            fontSize: 13.5,
            lineHeight: 1.45,
            color: '#1f2c33',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            marginBottom: 6,
          }}>
            {preview || 'La previsualización aparecerá aquí'}
            <div style={{ marginTop: 6, fontSize: 10, color: '#7d8a93', textAlign: 'right' }}>20:45 ✓✓</div>
          </div>
          <div className="text-xs" style={{ color: '#5b6b73', fontStyle: 'italic' }}>Datos de ejemplo. El mensaje real usará los datos del pedido.</div>
        </div>

        {/* Editor */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="serif" style={{ fontSize: 16, fontWeight: 700 }}>Plantilla</div>
            <button style={{ fontSize: 12, color: 'var(--primary-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }} onClick={resetToDefault}>
              🔄 Restaurar default
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="input"
            rows={6}
            value={template || ''}
            onChange={(e) => setTemplate(e.target.value)}
            style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 120 }}
          />

          <div>
            <div className="text-xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Variables · tap para insertar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {VARIABLES.map(({ var: variable, label }) => (
                <button
                  key={variable}
                  onClick={() => insertVariable(variable)}
                  title={label}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(249,115,22,0.08)',
                    color: 'var(--primary-dark)',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid rgba(249,115,22,0.18)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card" style={{ padding: 14, background: 'rgba(46,125,50,0.06)', borderLeft: 'none' }}>
          <div className="text-xs" style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            💡 Cómo usar
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            <li>Usa variables entre llaves: <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{variable}'}</code></li>
            <li>Los saltos de línea se preservan tal cual los escribís.</li>
            <li>Markdown básico: <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>*negrita*</code> y <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>_cursiva_</code></li>
          </ul>
        </div>

        <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 0', background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
          <button className="btn btn-primary btn-block" disabled={saving || !template?.trim()} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar plantilla'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
