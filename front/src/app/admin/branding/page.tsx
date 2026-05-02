'use client'

import { useState, useEffect } from 'react'
import { getAdminMe, updateBranding } from '@/lib/admin-api'

type FormState = {
  colorPrimary: string
  colorAccent: string
  logoUrl: string
  bannerUrl: string
  tagline: string
  emojiIcon: string
}

const DEFAULTS: FormState = {
  colorPrimary: '#e8390e',
  colorAccent: '#25d366',
  logoUrl: '',
  bannerUrl: '',
  tagline: '',
  emojiIcon: '🍽️',
}

export default function BrandingPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminMe()
      .then((tenant) => {
        const b = tenant.branding
        setForm({
          colorPrimary: b.colorPrimary,
          colorAccent: b.colorAccent,
          logoUrl: b.logoUrl ?? '',
          bannerUrl: b.bannerUrl ?? '',
          tagline: b.tagline ?? '',
          emojiIcon: b.emojiIcon,
        })
      })
      .catch(() => setError('No se pudo cargar la información'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateBranding({
        colorPrimary: form.colorPrimary,
        colorAccent: form.colorAccent,
        logoUrl: form.logoUrl || null,
        bannerUrl: form.bannerUrl || null,
        tagline: form.tagline || null,
        emojiIcon: form.emojiIcon,
      })
      setSaved(true)
    } catch {
      setError('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 w-full min-w-0">
      <h1 className="text-xl font-bold text-gray-900">Apariencia</h1>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <p className="text-xs font-medium text-gray-500 px-4 pt-3 pb-2 uppercase tracking-wide">Vista previa</p>
        <div
          className="mx-4 mb-4 rounded-xl h-20 flex items-center px-5 gap-3"
          style={{ backgroundColor: form.colorPrimary }}
        >
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="text-3xl leading-none flex-shrink-0">{form.emojiIcon}</span>
          )}
          <div className="min-w-0">
            <p className="font-bold text-white truncate text-base">Mi local</p>
            {form.tagline && (
              <p className="text-xs text-white/75 truncate">{form.tagline}</p>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: form.colorAccent }}
            >
              Ver más
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">Color primario</label>
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="color"
                value={form.colorPrimary}
                onChange={(e) => set('colorPrimary', e.target.value)}
                className="w-12 h-10 min-w-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.colorPrimary}
                onChange={(e) => set('colorPrimary', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">Color acento</label>
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="color"
                value={form.colorAccent}
                onChange={(e) => set('colorAccent', e.target.value)}
                className="w-12 h-10 min-w-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.colorAccent}
                onChange={(e) => set('colorAccent', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emoji icono</label>
          <input
            type="text"
            value={form.emojiIcon}
            onChange={(e) => set('emojiIcon', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="🍽️"
          />
          <p className="text-xs text-gray-400 mt-1">Se muestra cuando no hay logo</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="La mejor pizza de la ciudad"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL del logo</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => set('logoUrl', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL del banner</label>
          <input
            type="url"
            value={form.bannerUrl}
            onChange={(e) => set('bannerUrl', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <p className="text-sm text-green-600 font-medium">Guardado correctamente</p>}
        </div>
      </div>
    </div>
  )
}
