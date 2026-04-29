'use client'

import { useState, useEffect } from 'react'
import { getAdminMe, updateAdminMe, updateDelivery, updateHours } from '@/lib/admin-api'
import type { BusinessHour } from '@/types/store'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type DeliveryForm = {
  mode: 'delivery' | 'pickup' | 'both'
  deliveryCost: string
  freeDeliveryFrom: string
  minOrderAmount: string
  estimatedMinutes: string
  pickupAddress: string
}

const DEFAULT_DELIVERY: DeliveryForm = {
  mode: 'delivery',
  deliveryCost: '',
  freeDeliveryFrom: '',
  minOrderAmount: '',
  estimatedMinutes: '',
  pickupAddress: '',
}

const DEFAULT_HOURS: BusinessHour[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5,
  opensAt: '09:00',
  closesAt: '22:00',
}))

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tenantName, setTenantName] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [localSaving, setLocalSaving] = useState(false)
  const [localSaved, setLocalSaved] = useState(false)

  const [delivery, setDelivery] = useState<DeliveryForm>(DEFAULT_DELIVERY)
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [deliverySaved, setDeliverySaved] = useState(false)

  const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS)
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  useEffect(() => {
    getAdminMe()
      .then((tenant) => {
        setTenantName(tenant.name)
        setWhatsappNumber(tenant.whatsappNumber ?? '')

        const d = tenant.delivery
        if (d) {
          setDelivery({
            mode: (d.mode?.toLowerCase() ?? 'delivery') as 'delivery' | 'pickup' | 'both',
            deliveryCost: d.deliveryCost != null ? String(d.deliveryCost) : '',
            freeDeliveryFrom: d.freeDeliveryFrom != null ? String(d.freeDeliveryFrom) : '',
            minOrderAmount: d.minOrderAmount != null ? String(d.minOrderAmount) : '',
            estimatedMinutes: d.estimatedMinutes ?? '',
            pickupAddress: d.pickupAddress ?? '',
          })
        }

        if (tenant.hours?.length > 0) {
          const filled = Array.from({ length: 7 }, (_, i) => {
            const found = tenant.hours.find((h) => h.dayOfWeek === i)
            return found ?? { dayOfWeek: i, isOpen: false, opensAt: '09:00', closesAt: '22:00' }
          })
          setHours(filled)
        }
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [])

  async function saveLocal() {
    setLocalSaving(true)
    setError(null)
    try {
      await updateAdminMe({ name: tenantName, whatsappNumber })
      setLocalSaved(true)
    } catch {
      setError('Error al guardar los datos del local')
    } finally {
      setLocalSaving(false)
    }
  }

  async function saveDelivery() {
    setDeliverySaving(true)
    setError(null)
    try {
      await updateDelivery({
        mode: delivery.mode.charAt(0).toUpperCase() + delivery.mode.slice(1),
        deliveryCost: delivery.deliveryCost ? parseFloat(delivery.deliveryCost) : null,
        freeDeliveryFrom: delivery.freeDeliveryFrom ? parseFloat(delivery.freeDeliveryFrom) : null,
        minOrderAmount: delivery.minOrderAmount ? parseFloat(delivery.minOrderAmount) : null,
        estimatedMinutes: delivery.estimatedMinutes || null,
        pickupAddress: delivery.pickupAddress || null,
      })
      setDeliverySaved(true)
    } catch {
      setError('Error al guardar delivery')
    } finally {
      setDeliverySaving(false)
    }
  }

  async function saveHours() {
    setHoursSaving(true)
    setError(null)
    try {
      await updateHours(hours)
      setHoursSaved(true)
    } catch {
      setError('Error al guardar horarios')
    } finally {
      setHoursSaving(false)
    }
  }

  function updateHour<K extends keyof BusinessHour>(index: number, key: K, value: BusinessHour[K]) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [key]: value } : h)))
    setHoursSaved(false)
  }

  function setDel<K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) {
    setDelivery((f) => ({ ...f, [key]: value }))
    setDeliverySaved(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showPickup = delivery.mode === 'pickup' || delivery.mode === 'both'
  const showDeliveryCosts = delivery.mode === 'delivery' || delivery.mode === 'both'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configuración</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Mi Local */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Mi Local</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del local</label>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => { setTenantName(e.target.value); setLocalSaved(false) }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ej: Amadeo Pizzería"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => { setWhatsappNumber(e.target.value); setLocalSaved(false) }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="5491112345678"
          />
          <p className="text-xs text-gray-400 mt-1">Número con código de país, sin espacios ni guiones</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveLocal}
            disabled={localSaving}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {localSaving ? 'Guardando...' : 'Guardar local'}
          </button>
          {localSaved && <p className="text-sm text-green-600 font-medium">Guardado</p>}
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Delivery</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modo</label>
          <div className="flex gap-2">
            {(['delivery', 'pickup', 'both'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDel('mode', m)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                  delivery.mode === m
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {m === 'delivery' ? 'Delivery' : m === 'pickup' ? 'Retiro' : 'Ambos'}
              </button>
            ))}
          </div>
        </div>

        {showDeliveryCosts && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo de envío</label>
              <input
                type="number"
                step="0.01"
                value={delivery.deliveryCost}
                onChange={(e) => setDel('deliveryCost', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gratis desde</label>
              <input
                type="number"
                step="0.01"
                value={delivery.freeDeliveryFrom}
                onChange={(e) => setDel('freeDeliveryFrom', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="5000"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo</label>
            <input
              type="number"
              step="0.01"
              value={delivery.minOrderAmount}
              onChange={(e) => setDel('minOrderAmount', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo estimado</label>
            <input
              type="text"
              value={delivery.estimatedMinutes}
              onChange={(e) => setDel('estimatedMinutes', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="30-45 min"
            />
          </div>
        </div>

        {showPickup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de retiro</label>
            <input
              type="text"
              value={delivery.pickupAddress}
              onChange={(e) => setDel('pickupAddress', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Av. Corrientes 1234, CABA"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveDelivery}
            disabled={deliverySaving}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {deliverySaving ? 'Guardando...' : 'Guardar delivery'}
          </button>
          {deliverySaved && <p className="text-sm text-green-600 font-medium">Guardado</p>}
        </div>
      </div>

      {/* Hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Horarios</h2>

        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.dayOfWeek} className="flex items-center gap-3">
              <div className="w-24 flex-shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.isOpen}
                    onChange={(e) => updateHour(i, 'isOpen', e.target.checked)}
                    className="w-4 h-4 accent-orange-600"
                  />
                  <span className="text-sm text-gray-700">{DAY_NAMES[h.dayOfWeek]}</span>
                </label>
              </div>

              {h.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={h.opensAt ?? '09:00'}
                    onChange={(e) => updateHour(i, 'opensAt', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time"
                    value={h.closesAt ?? '22:00'}
                    onChange={(e) => updateHour(i, 'closesAt', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 flex-1">Cerrado</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveHours}
            disabled={hoursSaving}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {hoursSaving ? 'Guardando...' : 'Guardar horarios'}
          </button>
          {hoursSaved && <p className="text-sm text-green-600 font-medium">Guardado</p>}
        </div>
      </div>
    </div>
  )
}
