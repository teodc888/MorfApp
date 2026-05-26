'use client'

import { useEffect, useState, useRef } from 'react'
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
      imageUrl: null,
      tags: [],
      modifierGroups: [],
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
      imageUrl: null,
      tags: [],
      modifierGroups: [],
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<string | null>(null)
  const [tenantData, setTenantData] = useState<TenantPublic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminMe()
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
      } catch (err) {
        setError('Error al cargar los datos')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateWhatsAppTemplate(template || null)
      setError(null)
    } catch (err) {
      setError('Error al guardar')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💬 Template WhatsApp</h1>
        <p className="text-gray-600">Personaliza el mensaje que se envía a los clientes</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Editor</h2>
              <button
                onClick={resetToDefault}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Restaurar default
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={template || ''}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Deja en blanco para usar el formato por defecto"
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Variables disponibles</h3>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(({ var: variable }) => (
                  <button
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition-colors"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista previa</h2>
          <div className="bg-gray-50 rounded-lg p-4 min-h-96 whitespace-pre-wrap text-sm font-mono overflow-auto max-h-96 border border-gray-200">
            {preview || 'La previsualización aparecerá aquí'}
          </div>
          <p className="text-xs text-gray-500 mt-4">Ejemplo con datos de prueba. El mensaje real contendrá los datos del pedido.</p>
        </div>
      </div>

      {/* Help section */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📝 Cómo usar</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Usa las variables entre llaves: <code className="bg-white px-1 rounded">{'{variable}'}</code></li>
          <li>• Las saltos de línea se preservan tal como los escribes</li>
          <li>• Si no escribes nada, se usa el formato por defecto</li>
          <li>• Usa Markdown básico: <code className="bg-white px-1 rounded">*negrita*</code>, <code className="bg-white px-1 rounded">_cursiva_</code></li>
        </ul>
      </div>
    </div>
  )
}
