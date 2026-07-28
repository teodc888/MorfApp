'use client';

import { useState } from 'react';
import type { PlanInfo } from './Pricing';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'morfapp.app';

const DEFAULT_COLOR_PRIMARY = '#e8390e';
const DEFAULT_COLOR_ACCENT = '#25D366';
const EMOJI_OPTIONS = ['🍔', '🍕', '🌮', '🍗', '🥗', '☕', '🍰', '🍜'];

// Mismo criterio que Slugify() en PublicController.cs — es solo para la vista previa,
// el slug final (con sufijo si hay colisión) lo define el backend al registrar.
function slugifyPreview(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Props = {
  plan: PlanInfo;
  onClose: () => void;
};

export function InterestModal({ plan, onClose }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [colorPrimary, setColorPrimary] = useState(DEFAULT_COLOR_PRIMARY);
  const [colorAccent, setColorAccent] = useState(DEFAULT_COLOR_ACCENT);
  const [emojiIcon, setEmojiIcon] = useState(EMOJI_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone, restaurantName,
          plan: plan.plan, colorPrimary, colorAccent, emojiIcon,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message ?? 'Ocurrió un error. Intentá de nuevo.');
        setLoading(false);
        return;
      }

      // Redirige a la página hosteada de Mercado Pago para cargar la tarjeta.
      // Al volver (back_url), la tienda ya está creándose de fondo vía webhook.
      window.location.href = data.checkoutUrl;
    } catch {
      setError('No pudimos conectar con el servidor. Probá de nuevo en unos minutos.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10 my-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">¡Empezá tu prueba gratis!</h2>
          <p className="font-body text-sm text-on-surface-variant">
            Plan seleccionado: <strong>{plan.displayName} (${plan.monthlyPriceArs.toLocaleString('es-AR')}/mes)</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Juan"
                required
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="García"
                required
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="juan@ejemplo.com"
              required
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Teléfono / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+54 9 351 000-0000"
              required
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Nombre del restaurante</label>
            <input
              type="text"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              placeholder="La Parrilla de Juan"
              required
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body"
            />
            {restaurantName.trim().length > 0 && (
              <p className="text-xs text-on-surface-variant font-body mt-1">
                Tu tienda va a estar en{' '}
                <strong>{slugifyPreview(restaurantName) || '...'}.{ROOT_DOMAIN}</strong>
                {' '}(puede variar un poco si ya está en uso)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Elegí un ícono</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEmojiIcon(emoji)}
                  aria-label={`Usar ${emoji}`}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-colors ${
                    emojiIcon === emoji ? 'border-primary bg-primary/10' : 'border-outline-variant hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Color principal</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-outline-variant cursor-pointer"
                />
                <span className="text-xs text-on-surface-variant font-body">{colorPrimary}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">Color secundario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorAccent}
                  onChange={e => setColorAccent(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-outline-variant cursor-pointer"
                />
                <span className="text-xs text-on-surface-variant font-body">{colorAccent}</span>
              </div>
            </div>
          </div>

          {/* Vista previa en vivo — para no elegir colores/ícono a ciegas */}
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ backgroundColor: colorPrimary }}
            >
              <span className="text-xl leading-none">{emojiIcon}</span>
              <span className="text-white font-bold text-sm truncate">
                {restaurantName.trim() || 'Tu negocio'}
              </span>
            </div>
            <div className="px-3 py-2 bg-white flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Vista previa</span>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: colorAccent }}
              >
                💬 Pedir por WhatsApp
              </span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant font-body -mt-2">
            Podés cambiar todo esto después desde el panel de tu tienda.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity font-body text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Redirigiendo a Mercado Pago...' : 'Continuar con Mercado Pago'}
          </button>

          <p className="text-xs text-center text-on-surface-variant font-body">
            Vas a cargar tu tarjeta en Mercado Pago. El primer mes es gratis — recién se cobra al terminar la prueba.
          </p>
        </form>
      </div>
    </div>
  );
}
