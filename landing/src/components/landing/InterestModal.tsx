'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5500';
const WHATSAPP_NUMBER = '5493516133893';

const PLAN_LABELS: Record<string, string> = {
  Basico: 'Básico ($20.000/mes)',
  Pro: 'Pro ($45.000/mes)',
  Negocio: 'Negocio (a consultar)',
};

type Props = {
  plan: string;
  onClose: () => void;
};

export function InterestModal({ plan, onClose }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
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
        body: JSON.stringify({ firstName, lastName, email, phone, restaurantName, plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Ocurrió un error. Intentá de nuevo.');
        setLoading(false);
        return;
      }
    } catch {
      // If the API is down, we still redirect to WhatsApp
    }

    const message =
      `Hola! 👋 Estoy interesado en adquirir el plan *${PLAN_LABELS[plan] ?? plan}* de MorfApp.\n\n` +
      `*Nombre:* ${firstName} ${lastName}\n` +
      `*Restaurante:* ${restaurantName}\n` +
      `*Email:* ${email}\n\n` +
      `Quedo a la espera de los datos para la transferencia. ¡Gracias!`;

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10"
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
            Plan seleccionado: <strong>{PLAN_LABELS[plan] ?? plan}</strong>
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
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity font-body text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Enviando...</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.406 17.406c-2.426 2.426-5.655 3.761-9.083 3.761-1.754 0-3.474-.445-4.993-1.288L0 21l1.164-4.277A11.93 11.93 0 01.834 12C.834 5.72 5.72.834 12 .834S23.166 5.72 23.166 12 18.28 23.166 12 23.166c-3.428 0-6.657-1.335-9.083-3.761z" fillRule="evenodd" clipRule="evenodd"/>
                </svg>
                Continuar por WhatsApp
              </>
            )}
          </button>

          <p className="text-xs text-center text-on-surface-variant font-body">
            Te redirigiremos a WhatsApp para completar el proceso de compra.
          </p>
        </form>
      </div>
    </div>
  );
}
