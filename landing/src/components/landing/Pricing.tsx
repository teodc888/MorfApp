'use client';

import type { CSSProperties, ReactNode, WheelEvent } from 'react';
import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { InteractiveProductCard } from '@/components/ui/card-7';
import { InterestModal } from './InterestModal';

const basicFeatures = ['1 local', 'Menu y productos ilimitados', 'Pedidos por WhatsApp', 'Carrito con modificadores', 'Delivery y takeaway', 'Subdominio incluido'];
const proFeatures = ['Todo lo del plan Basico', 'Dominio propio', 'Estadisticas de pedidos', 'Branding avanzado', 'Soporte prioritario'];
const businessFeatures = ['Todo lo del plan Pro', 'Multiples locales', 'Panel centralizado', 'Reportes avanzados', 'Onboarding personalizado'];

const planImages = {
  basic: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop',
  pro: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
};

const ICON_STYLE: CSSProperties = { fontSize: 18, fontVariationSettings: "'FILL' 1" };

type PlanTone = 'light' | 'dark' | 'warm';

function Check({ tone = 'light' }: { tone?: PlanTone }) {
  const color = tone === 'dark' ? '#d4a96a' : tone === 'warm' ? '#f1b16b' : '#f4a261';

  return (
    <span
      className="material-symbols-outlined flex-shrink-0"
      style={{ ...ICON_STYLE, color }}
    >
      check_circle
    </span>
  );
}

function FeatureList({ items, tone = 'light' }: { items: string[]; tone?: PlanTone }) {
  const color = '#faf5ee';

  return (
    <ul className="mb-5 flex flex-col gap-2.5">
      {items.map((feature) => (
        <li
          key={feature}
          className="flex items-center gap-2 font-body text-sm"
          style={{ color }}
        >
          <Check tone={tone} />
          {feature}
        </li>
      ))}
    </ul>
  );
}

function PlanAction({
  children,
  disabled,
  featured,
  tone = featured ? 'dark' : 'light',
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  featured?: boolean;
  tone?: PlanTone;
  onClick?: () => void;
}) {
  const isDark = tone === 'dark';

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full border px-4 py-3 font-body text-sm font-bold transition-colors ${
        isDark
          ? 'border-accent-amber/45 bg-accent-amber/18 text-accent-amber hover:bg-accent-amber hover:text-on-surface disabled:hover:bg-accent-amber/18 disabled:hover:text-accent-amber'
          : 'border-primary/35 bg-primary/18 text-[#f4a261] hover:bg-primary hover:text-on-primary'
      } ${disabled ? 'cursor-not-allowed opacity-95' : ''}`}
    >
      {children}
    </button>
  );
}

function BasicCard({ onCta }: { onCta: () => void }) {
  return (
    <InteractiveProductCard
      imageUrl={planImages.basic}
      title="Basico"
      description="Para empezar con el pie derecho."
      price="$20.000 / mes"
      tone="light"
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/10 pt-5">
        <span className="mb-3 inline-block bg-[#dff5df] px-3 py-1 font-body text-xs font-bold text-[#1d6b32] shadow-sm">
          Primer mes gratis
        </span>
        <p className="font-body text-xs text-[#f8ead9]/78">despues del primer mes</p>
      </div>
      <FeatureList items={basicFeatures} />
      <PlanAction onClick={onCta}>Empezar prueba gratis</PlanAction>
    </InteractiveProductCard>
  );
}

function ProCard() {
  return (
    <InteractiveProductCard
      imageUrl={planImages.pro}
      title="Pro"
      description="Para locales que buscan destacar."
      price="$45.000 / mes"
      featured
      tone="dark"
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/25 pt-5">
        <span className="inline-block border border-accent-amber/45 bg-accent-amber/20 px-3 py-1 font-body text-xs font-bold uppercase tracking-[0.12em] text-[#f4c875]">
          Mas popular
        </span>
      </div>
      <FeatureList items={proFeatures} tone="dark" />
      <PlanAction featured tone="dark" disabled>Proximamente</PlanAction>
    </InteractiveProductCard>
  );
}

function BusinessCard() {
  return (
    <InteractiveProductCard
      imageUrl={planImages.business}
      title="Negocio"
      description="Para cadenas y franquicias."
      price="A consultar"
      tone="warm"
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/20 pt-5">
        <span className="inline-block border border-[#f1b16b]/35 bg-[#2a1f1a]/58 px-3 py-1 font-body text-xs font-bold uppercase tracking-[0.12em] text-[#f1b16b] shadow-sm">
          Proximamente
        </span>
      </div>
      <FeatureList items={businessFeatures} tone="warm" />
      <PlanAction tone="warm" disabled>Contactar</PlanAction>
    </InteractiveProductCard>
  );
}

function PlanCards({ onBasicCta, className }: { onBasicCta: () => void; className: string }) {
  return (
    <div className={className}>
      <BasicCard onCta={onBasicCta} />
      <ProCard />
      <BusinessCard />
    </div>
  );
}

export function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);

  const goToPlan = (index: number) => {
    setActivePlan(Math.max(0, Math.min(2, index)));
  };

  const goPreviousPlan = () => goToPlan(activePlan - 1);
  const goNextPlan = () => goToPlan(activePlan + 1);

  const handlePricingWheel = (event: WheelEvent<HTMLDivElement>) => {
    const direction = Math.sign(event.deltaY);
    const canMovePlan = (direction > 0 && activePlan < 2) || (direction < 0 && activePlan > 0);

    if (!canMovePlan) return;

    event.preventDefault();
    if (wheelLockedRef.current) return;

    wheelDeltaRef.current += event.deltaY;
    if (Math.abs(wheelDeltaRef.current) < 80) return;

    wheelLockedRef.current = true;
    wheelDeltaRef.current = 0;
    goToPlan(activePlan + direction);

    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 520);
  };

  const planAnimations = [
    [
      { x: 0, scale: 1.04, opacity: 1 },
      { x: 360, scale: 0.84, opacity: 0.45 },
      { x: 620, scale: 0.72, opacity: 0.16 },
    ],
    [
      { x: -360, scale: 0.84, opacity: 0.45 },
      { x: 0, scale: 1.04, opacity: 1 },
      { x: 360, scale: 0.84, opacity: 0.45 },
    ],
    [
      { x: -620, scale: 0.72, opacity: 0.16 },
      { x: -360, scale: 0.84, opacity: 0.45 },
      { x: 0, scale: 1.04, opacity: 1 },
    ],
  ] as const;
  const hints = ['Scrollea para ver los otros planes', 'Hay un plan mas', 'Todos los planes'];

  return (
    <>
      {selectedPlan && <InterestModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}

      <section id="pricing" className="bg-surface-container-low px-4 py-12 md:hidden">
        <div className="mb-10 text-center">
          <h2 className="mb-3 font-headline text-[2.15rem] font-bold leading-tight text-on-surface">Planes transparentes</h2>
          <p className="font-body text-on-surface-variant">Primer mes gratis. Sin tarjeta requerida.</p>
        </div>
        <PlanCards onBasicCta={() => setSelectedPlan('Basico')} className="mx-auto flex max-w-sm flex-col gap-6" />
      </section>

      <section className="hidden bg-surface-container-low px-6 py-16 md:block lg:hidden" aria-labelledby="pricing-tablet-title">
        <div className="mb-10 text-center">
          <h2 id="pricing-tablet-title" className="mb-3 font-headline text-4xl font-bold text-on-surface">Planes transparentes</h2>
          <p className="font-body text-on-surface-variant">Primer mes gratis. Sin tarjeta requerida.</p>
        </div>
        <PlanCards onBasicCta={() => setSelectedPlan('Basico')} className="grid grid-cols-3 gap-4" />
      </section>

      <div id="pricing-scroll" ref={containerRef} onWheel={handlePricingWheel} className="relative hidden h-screen bg-surface-container-low lg:block">
        <div className="flex h-screen flex-col items-center justify-center overflow-hidden bg-surface-container-low border-t border-outline-variant/30">
          <div className="mb-6 px-6 text-center">
            <h2 className="mb-3 font-headline text-5xl font-bold text-on-surface">Planes transparentes</h2>
            <p className="font-body text-lg text-on-surface-variant">Primer mes gratis. Sin tarjeta requerida.</p>
          </div>

          <div className="relative w-full" style={{ height: 590 }}>
            <button
              type="button"
              onClick={goPreviousPlan}
              disabled={activePlan === 0}
              aria-label="Ver plan anterior"
              className="absolute left-[calc(50%-310px)] top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-surface-container-low/85 text-primary shadow-[0_10px_30px_rgba(58,48,42,0.12)] backdrop-blur transition disabled:pointer-events-none disabled:opacity-30 hover:bg-primary hover:text-on-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>chevron_left</span>
            </button>

            <button
              type="button"
              onClick={goNextPlan}
              disabled={activePlan === 2}
              aria-label="Ver siguiente plan"
              className="absolute right-[calc(50%-310px)] top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-surface-container-low/85 text-primary shadow-[0_10px_30px_rgba(58,48,42,0.12)] backdrop-blur transition disabled:pointer-events-none disabled:opacity-30 hover:bg-primary hover:text-on-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>chevron_right</span>
            </button>

            <motion.div
              role="button"
              tabIndex={0}
              aria-label="Ver plan Basico"
              onClick={() => goToPlan(0)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') goToPlan(0);
              }}
              animate={planAnimations[activePlan][0]}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 0 ? 30 : 10 }}
              className={`w-[340px] outline-none ${activePlan === 0 ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <BasicCard onCta={() => setSelectedPlan('Basico')} />
            </motion.div>

            <motion.div
              role="button"
              tabIndex={0}
              aria-label="Ver plan Pro"
              onClick={() => goToPlan(1)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') goToPlan(1);
              }}
              animate={planAnimations[activePlan][1]}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 1 ? 30 : 20 }}
              className={`w-[340px] outline-none ${activePlan === 1 ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <ProCard />
            </motion.div>

            <motion.div
              role="button"
              tabIndex={0}
              aria-label="Ver plan Negocio"
              onClick={() => goToPlan(2)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') goToPlan(2);
              }}
              animate={planAnimations[activePlan][2]}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 2 ? 30 : 10 }}
              className={`w-[340px] outline-none ${activePlan === 2 ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <BusinessCard />
            </motion.div>
          </div>

          <div className="relative z-40 mt-3 flex items-center gap-2">
            {[0, 1, 2].map((_, index) => (
              <motion.div
                key={index}
                animate={{ width: activePlan === index ? 24 : 8 }}
                transition={{ duration: 0.3 }}
                style={{ height: 8, borderRadius: 999, background: activePlan === index ? '#c2652a' : '#d8d0c8' }}
              />
            ))}
          </div>

          <p className="mt-2 font-body text-xs text-on-surface-variant opacity-70">{hints[activePlan]}</p>
        </div>
      </div>
    </>
  );
}
