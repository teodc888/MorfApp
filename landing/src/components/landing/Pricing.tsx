'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
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

function Check({ amber }: { amber?: boolean }) {
  return (
    <span
      className="material-symbols-outlined flex-shrink-0"
      style={{ ...ICON_STYLE, color: amber ? '#d4a96a' : '#c2652a' }}
    >
      check_circle
    </span>
  );
}

function FeatureList({ items, amber }: { items: string[]; amber?: boolean }) {
  return (
    <ul className="mb-5 flex flex-col gap-2.5">
      {items.map((feature) => (
        <li
          key={feature}
          className="flex items-center gap-2 font-body text-sm"
          style={{ color: amber ? '#faf5ee' : '#3a302a' }}
        >
          <Check amber={amber} />
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
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  featured?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full border px-4 py-3 font-body text-sm font-bold transition-colors ${
        featured
          ? 'border-primary/35 bg-primary/20 text-primary hover:bg-primary hover:text-on-primary disabled:hover:bg-primary/20 disabled:hover:text-primary'
          : 'border-primary/20 bg-white/30 text-on-surface hover:bg-primary hover:text-on-primary'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
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
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/10 pt-5">
        <span className="mb-3 inline-block bg-green-100 px-3 py-1 font-body text-xs font-bold text-green-800">
          Primer mes gratis
        </span>
        <p className="font-body text-xs text-on-surface-variant">despues del primer mes</p>
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
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/25 pt-5">
        <span className="inline-block border border-accent-amber/35 bg-accent-amber/15 px-3 py-1 font-body text-xs font-bold uppercase tracking-[0.12em] text-accent-amber">
          Mas popular
        </span>
      </div>
      <FeatureList items={proFeatures} amber />
      <PlanAction featured disabled>Proximamente</PlanAction>
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
      className="max-w-none"
    >
      <div className="mb-5 border-t border-primary/10 pt-5">
        <span className="inline-block border border-on-surface/10 bg-on-surface/10 px-3 py-1 font-body text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Proximamente
        </span>
      </div>
      <FeatureList items={businessFeatures} />
      <PlanAction disabled>Contactar</PlanAction>
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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActivePlan((current) => {
      const next = value < 0.33 ? 0 : value < 0.66 ? 1 : 2;
      return current === next ? current : next;
    });
  });

  const x0 = useTransform(scrollYProgress, [0, 0.5, 1], [0, -360, -620]);
  const sc0 = useTransform(scrollYProgress, [0, 0.38, 0.62, 1], [1.04, 1.04, 0.84, 0.72]);
  const op0 = useTransform(scrollYProgress, [0, 0.38, 0.62, 1], [1, 1, 0.45, 0.16]);

  const x1 = useTransform(scrollYProgress, [0, 0.5, 1], [360, 0, -360]);
  const sc1 = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.62, 0.82, 1], [0.84, 0.84, 1.04, 1.04, 0.84, 0.84]);
  const op1 = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.62, 0.82, 1], [0.45, 0.45, 1, 1, 0.45, 0.45]);

  const x2 = useTransform(scrollYProgress, [0, 0.5, 1], [620, 360, 0]);
  const sc2 = useTransform(scrollYProgress, [0, 0.38, 0.62, 1], [0.72, 0.84, 0.84, 1.04]);
  const op2 = useTransform(scrollYProgress, [0, 0.38, 0.62, 1], [0.16, 0.45, 0.45, 1]);

  const dw0 = useTransform(scrollYProgress, [0, 0.28, 0.33], [24, 24, 8]);
  const dw1 = useTransform(scrollYProgress, [0.28, 0.33, 0.5, 0.66, 0.72], [8, 24, 24, 24, 8]);
  const dw2 = useTransform(scrollYProgress, [0.66, 0.72, 1], [8, 24, 24]);
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

      <div id="pricing-scroll" ref={containerRef} style={{ height: '140vh' }} className="relative hidden lg:block">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden bg-surface-container-low border-t border-outline-variant/30">
          <div className="mb-8 px-6 text-center">
            <h2 className="mb-3 font-headline text-5xl font-bold text-on-surface">Planes transparentes</h2>
            <p className="font-body text-lg text-on-surface-variant">Primer mes gratis. Sin tarjeta requerida.</p>
          </div>

          <div className="relative w-full" style={{ height: 560 }}>
            <motion.div
              style={{ x: x0, scale: sc0, opacity: op0, position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 0 ? 30 : 10 }}
              className="w-[340px]"
            >
              <BasicCard onCta={() => setSelectedPlan('Basico')} />
            </motion.div>

            <motion.div
              style={{ x: x1, scale: sc1, opacity: op1, position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 1 ? 30 : 20 }}
              className="w-[340px]"
            >
              <ProCard />
            </motion.div>

            <motion.div
              style={{ x: x2, scale: sc2, opacity: op2, position: 'absolute', left: '50%', marginLeft: -170, zIndex: activePlan === 2 ? 30 : 10 }}
              className="w-[340px]"
            >
              <BusinessCard />
            </motion.div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {([dw0, dw1, dw2] as const).map((width, index) => (
              <motion.div
                key={index}
                style={{
                  width,
                  height: 8,
                  borderRadius: 999,
                  background: activePlan === index ? '#c2652a' : '#d8d0c8',
                }}
              />
            ))}
          </div>

          <p className="mt-3 font-body text-xs text-on-surface-variant opacity-70">{hints[activePlan]}</p>
        </div>
      </div>
    </>
  );
}
