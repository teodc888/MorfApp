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
  colorPrimary: '#F97316',
  colorAccent: '#25d366',
  logoUrl: '',
  bannerUrl: '',
  tagline: '',
  emojiIcon: '🍽️',
}

const COLOR_SWATCHES = [
  '#9D4300', '#F97316', '#E2725B', '#D14B2F', '#7B1F0E',
  '#2E7D32', '#1F8A5B', '#0F766E', '#1D4ED8', '#7C3AED',
]

function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  let r = (n >> 16) + Math.round((255 * percent) / 100)
  let g = ((n >> 8) & 0xff) + Math.round((255 * percent) / 100)
  let b = (n & 0xff) + Math.round((255 * percent) / 100)
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

export default function BrandingPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [tenantName, setTenantName] = useState('Mi local')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminMe()
      .then((tenant) => {
        const b = tenant.branding
        setTenantName(tenant.name)
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
    } catch {
      setError('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--sans)', minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--sans)' }}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Marca y Apariencia</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: 'var(--text)', fontWeight: 700 }}>Apariencia</h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>Cómo te ven tus clientes en la tienda online.</p>
      </div>

      {error && (
        <div style={{ padding: '0 22px 12px' }}>
          <div className="card" style={{ padding: 10, background: 'rgba(186,26,26,0.06)', border: '1px solid var(--error)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>{error}</div>
        </div>
      )}

      <div style={{ padding: '0 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Live preview */}
        <div>
          <div className="text-xs muted" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>Vista previa</div>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{
              height: 90,
              position: 'relative',
              background: form.bannerUrl
                ? `url(${form.bannerUrl}) center/cover`
                : `linear-gradient(135deg, ${form.colorPrimary} 0%, ${shade(form.colorPrimary, -25)} 100%)`,
            }}>
              {!form.bannerUrl && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>banner placeholder</div>
              )}
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginTop: -36,
                background: form.logoUrl ? `url(${form.logoUrl}) center/cover` : form.colorPrimary,
                border: '4px solid var(--surface)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                color: '#fff',
                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                flexShrink: 0,
              }}>
                {!form.logoUrl && form.emojiIcon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{tenantName}</div>
                <div className="text-xs muted" style={{ marginTop: 2, lineHeight: 1.3 }}>{form.tagline}</div>
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: 999,
                background: form.colorAccent,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}>
                Abierto
              </div>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: form.colorPrimary, color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>Hacer pedido</div>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Identidad</div>
          <div className="field">
            <label>Tagline</label>
            <input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Una frase corta que te describa" />
          </div>
          <div className="field">
            <label>Emoji ícono <span className="muted" style={{ fontWeight: 400 }}>· se muestra cuando no hay logo</span></label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--surface-container)', display: 'grid', placeItems: 'center', fontSize: 28, flexShrink: 0 }}>{form.emojiIcon}</div>
              <input className="input" value={form.emojiIcon} onChange={(e) => set('emojiIcon', e.target.value)} maxLength={4} style={{ fontSize: 18, textAlign: 'center', flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Colores</div>
          <ColorPicker label="Color primario" desc="Botones, links, marca" value={form.colorPrimary} onChange={(c) => set('colorPrimary', c)} />
          <ColorPicker label="Color acento" desc="Estados, chips, destacados" value={form.colorAccent} onChange={(c) => set('colorAccent', c)} />
        </div>

        {/* Assets */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Imágenes</div>
          <div className="field">
            <label>URL del logo</label>
            <input className="input" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://..." />
          </div>
          <div className="field">
            <label>URL del banner</label>
            <input className="input" value={form.bannerUrl} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="https://..." />
          </div>
          <div className="text-xs muted" style={{ lineHeight: 1.4 }}>ℹ Recomendado: logo 512×512 PNG con fondo transparente. Banner 1600×600.</div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 0', background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
          <button className="btn btn-primary btn-block" disabled={saving} onClick={handleSave}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ColorPicker({ label, desc, value, onChange }: { label: string; desc: string; value: string; onChange: (color: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div className="text-sm fw-600">{label}</div>
        <div className="text-xs muted">{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: value, border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--outline-soft), 0 4px 10px rgba(0,0,0,0.06)', flexShrink: 0 }} />
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: 'ui-monospace, monospace', flex: 1, textTransform: 'uppercase' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              background: c,
              border: value.toLowerCase() === c.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
              boxShadow: '0 0 0 1px var(--outline-soft) inset',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
