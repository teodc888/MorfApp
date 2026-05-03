'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';
import { InterestModal } from './InterestModal';

function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isVisible } = useInView();
  return (
    <div ref={ref} className={`reveal ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: `${delay * 80}ms` }}>
      {children}
    </div>
  );
}

export function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const basicFeatures = ['1 local', 'Menú y productos ilimitados', 'Pedidos por WhatsApp', 'Carrito con modificadores', 'Delivery y takeaway', 'Subdominio incluido'];
  const proFeatures = ['Todo lo del plan Básico', 'Dominio propio', 'Estadísticas de pedidos', 'Branding avanzado', 'Soporte prioritario'];
  const businessFeatures = ['Todo lo del plan Pro', 'Múltiples locales', 'Panel centralizado', 'Reportes avanzados', 'Onboarding personalizado'];

  return (
    <>
      {selectedPlan && (
        <InterestModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}

      <section className="py-24 px-6 max-w-7xl mx-auto" id="pricing">
        <style>{`
          .reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
          .reveal.visible { opacity: 1; transform: translateY(0); }
          .coming-soon-wrap { position: relative; }
          .coming-soon-wrap .plan-card { filter: blur(3.5px); opacity: 0.5; pointer-events: none; user-select: none; }
          .coming-soon-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border-radius: 0.75rem; pointer-events: none; }
          .coming-soon-overlay span.icon { font-size: 2rem; }
          .coming-soon-overlay span.label { font-family: 'Manrope', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #3a302a; background: #fff; border: 1.5px solid #d8d0c8; padding: 5px 16px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(58,48,42,.1); }
        `}</style>
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-on-surface mb-6">Planes transparentes</h2>
          <p className="font-body text-lg text-on-surface-variant">Primer mes gratis para que lo pruebes sin compromiso. Sin tarjeta requerida.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-16">
          <RevealCard delay={0}>
            <div className="plan-card bg-surface-container-lowest p-10 rounded-xl border border-outline-variant shadow-[0_2px_16px_rgba(58,48,42,0.04)] flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-headline text-3xl font-bold text-on-surface">Básico</h3>
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full font-body mt-1">
                  Primer mes gratis
                </span>
              </div>
              <p className="font-body text-on-surface-variant mb-6 pb-6 border-b border-outline-variant/40 text-sm">Para empezar con el pie derecho.</p>
              <div className="mb-8">
                <span className="font-headline text-5xl font-bold text-on-surface">$20.000</span>
                <span className="font-body text-on-surface-variant text-sm">/mes</span>
                <p className="font-body text-xs text-on-surface-variant mt-1">después del primer mes</p>
              </div>
              <ul className="flex flex-col gap-4 flex-grow mb-8 font-body text-on-surface text-sm">
                {basicFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelectedPlan('Basico')}
                className="w-full py-4 border-2 border-outline-variant text-on-surface font-bold rounded text-center hover:border-primary hover:text-primary transition-colors font-body block cursor-pointer"
              >
                Empezar prueba gratis
              </button>
            </div>
          </RevealCard>

          <RevealCard delay={1}>
            <div className="coming-soon-wrap">
              <div className="plan-card bg-primary p-10 rounded-xl border border-primary-container shadow-[0_8px_32px_rgba(194,101,42,0.2)] flex flex-col relative overflow-hidden text-on-primary">
                <div className="absolute top-0 right-0 bg-primary-container text-on-primary-container text-xs font-bold px-4 py-1 rounded-bl-lg uppercase tracking-wider font-body">
                  Más Popular
                </div>
                <h3 className="font-headline text-3xl font-bold mb-2">Pro</h3>
                <p className="font-body text-on-primary/80 mb-6 pb-6 border-b border-primary-container text-sm">Para locales que buscan destacar.</p>
                <div className="mb-8">
                  <span className="font-headline text-5xl font-bold">$45.000</span>
                  <span className="font-body text-on-primary/80 text-sm">/mes</span>
                </div>
                <ul className="flex flex-col gap-4 flex-grow mb-8 font-body text-sm">
                  {proFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 bg-surface-bright text-primary font-bold rounded hover:bg-surface-container-low transition-colors shadow-sm font-body text-center block">
                  Elegir Pro
                </button>
              </div>
              <div className="coming-soon-overlay">
                <span className="icon">🔒</span>
                <span className="label">Próximamente</span>
              </div>
            </div>
          </RevealCard>

          <RevealCard delay={2}>
            <div className="coming-soon-wrap">
              <div className="plan-card bg-surface-container-lowest p-10 rounded-xl border border-outline-variant shadow-[0_2px_16px_rgba(58,48,42,0.04)] flex flex-col">
                <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Negocio</h3>
                <p className="font-body text-on-surface-variant mb-6 pb-6 border-b border-outline-variant/40 text-sm">Para cadenas y franquicias.</p>
                <div className="mb-8">
                  <span className="font-headline text-4xl font-bold text-on-surface">A consultar</span>
                </div>
                <ul className="flex flex-col gap-4 flex-grow mb-8 font-body text-on-surface text-sm">
                  {businessFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 border-2 border-outline-variant text-on-surface font-bold rounded text-center hover:border-primary hover:text-primary transition-colors font-body block">
                  Contactar
                </button>
              </div>
              <div className="coming-soon-overlay">
                <span className="icon">🔒</span>
                <span className="label">Próximamente</span>
              </div>
            </div>
          </RevealCard>
        </div>
      </section>
    </>
  );
}
