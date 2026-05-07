'use client'

import { useState, useEffect } from 'react'
import { getAdminMe, updateBranding } from '@/lib/admin-api'
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
    <div className="max-w-2xl mx-auto space-y-6 w-full min-w-0" style={{ backgroundColor: DS.bg, minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <h1 className="text-2xl font-bold" style={{ color: DS.text, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Branding</h1>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {/* Preview Card - Stitch Style */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
        <p className="text-xs font-semibold px-4 pt-3 pb-2 uppercase tracking-wide" style={{ color: DS.textMuted }}>Vista previa</p>
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

      {/* Form Card - Stitch Style */}
      <div className="rounded-xl p-5 space-y-5" style={{ backgroundColor: DS.surface, border: `1px solid ${DS.border}`, boxShadow: '0px 4px 12px rgba(67,20,7,0.08)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-sm font-semibold mb-2" style={{ color: DS.textMuted }}>Color primario</label>
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="color"
                value={form.colorPrimary}
                onChange={(e) => set('colorPrimary', e.target.value)}
                className="w-12 h-10 min-w-12 rounded-lg cursor-pointer p-0.5"
                style={{ border: `1px solid ${DS.border}` }}
              />
              <input
                type="text"
                value={form.colorPrimary}
                onChange={(e) => set('colorPrimary', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-semibold mb-2" style={{ color: DS.textMuted }}>Color acento</label>
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="color"
                value={form.colorAccent}
                onChange={(e) => set('colorAccent', e.target.value)}
                className="w-12 h-10 min-w-12 rounded-lg cursor-pointer p-0.5"
                style={{ border: `1px solid ${DS.border}` }}
              />
              <input
                type="text"
                value={form.colorAccent}
                onChange={(e) => set('colorAccent', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: DS.textMuted }}>Emoji icono</label>
          <input
            type="text"
            value={form.emojiIcon}
            onChange={(e) => set('emojiIcon', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
            placeholder="🍽️"
          />
          <p className="text-xs mt-1" style={{ color: DS.textMuted }}>Se muestra cuando no hay logo</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: DS.textMuted }}>Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => set('tagline', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
            placeholder="La mejor pizza de la ciudad"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: DS.textMuted }}>URL del logo</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => set('logoUrl', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: DS.textMuted }}>URL del banner</label>
          <input
            type="url"
            value={form.bannerUrl}
            onChange={(e) => set('bannerUrl', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ border: `1px solid ${DS.border}`, color: DS.text, backgroundColor: DS.bg }}
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            style={{ 
              backgroundColor: saving ? '#D1D5DB' : DS.primary, 
              color: '#FFFFFF',
              boxShadow: '0px 4px 12px rgba(67,20,7,0.08)',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <p className="text-sm font-medium" style={{ color: DS.secondary }}>Guardado correctamente</p>}
        </div>
      </div>
    </div>
  )
}
