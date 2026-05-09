'use client';

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { BurgerLabels } from './BurgerLabels'

const BurgerCanvas = dynamic(
  () => import('./BurgerCanvas').then(m => ({ default: m.BurgerCanvas })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 70% 80% at 75% 55%, #fff1de 0%, #faf5ee 60%, #f3eadc 100%)',
        }}
      />
    ),
  }
)

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden hero-section"
    >
      {/* 3D background — full bleed */}
      <div className="absolute inset-0 z-0">
        <BurgerCanvas fullBleed sectionRef={sectionRef} />
      </div>

      {/* Legibility gradient: horizontal on desktop (text on left), vertical on mobile */}
      <div
        className="absolute inset-0 z-10 pointer-events-none hero-gradient"
        aria-hidden="true"
      />

      {/* Content overlay */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 pt-28 pb-16 flex flex-col justify-center">
        <div className="lg:w-1/2 flex flex-col items-start gap-6 hero-left">
          <div className="hero-child-1 inline-flex items-center gap-2 bg-primary-fixed/95 backdrop-blur-sm px-4 py-2 rounded-full border border-primary-fixed-dim/60">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span className="font-body text-xs font-bold text-primary tracking-widest uppercase">Primer mes gratis</span>
          </div>
          <h1 className="hero-child-2 font-headline text-5xl lg:text-7xl font-bold leading-[1.05] text-on-surface tracking-tight hero-headline">
            Tu menú digital,<br />
            <span className="text-primary italic">tan irresistible</span>
            <br />
            como tu cocina
          </h1>
          <p className="hero-child-3 font-body text-lg text-on-surface-variant max-w-lg leading-relaxed hero-subhead">
            Atrae más clientes y gestioná tus pedidos directamente por WhatsApp. Sin comisiones, sin complicaciones. Tu local online en minutos.
          </p>
          <div className="hero-child-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-on-primary rounded font-bold text-lg hover:bg-surface-tint transition-colors shadow-lg shadow-primary/30"
              href="#pricing"
            >
              Ver planes
            </a>
            <a
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-outline-variant/80 backdrop-blur-sm bg-surface/50 text-on-surface rounded font-bold text-lg hover:border-primary hover:text-primary hover:bg-surface/70 transition-colors"
              href="https://dev.morfapp.app/"
              target="_blank"
            >
              Ver demo
            </a>
          </div>
          <div className="hero-child-5 flex items-center gap-6 pt-4 border-t border-outline-variant/40 w-full max-w-md">
            <div className="text-center">
              <p className="font-headline text-2xl font-bold text-on-surface">5 min</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">Para estar online</p>
            </div>
            <div className="w-px h-10 bg-outline-variant/50"></div>
            <div className="text-center">
              <p className="font-headline text-2xl font-bold text-on-surface">0%</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">De comisión</p>
            </div>
            <div className="w-px h-10 bg-outline-variant/50"></div>
            <div className="text-center">
              <p className="font-headline text-2xl font-bold text-on-surface">100%</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">Personalizable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient labels overlay — anchored to the right half (where the burger sits) on desktop */}
      <div className="absolute inset-y-0 right-0 left-0 lg:left-1/2 z-20 pointer-events-none">
        <BurgerLabels sectionRef={sectionRef} />
      </div>

      <style>{`
        .hero-section {
          min-height: 100vh;
        }
        .hero-headline {
          text-shadow: 0 2px 24px rgba(0,0,0,0.35);
        }
        .hero-subhead {
          text-shadow: 0 1px 12px rgba(0,0,0,0.4);
        }
        .hero-gradient {
          background:
            linear-gradient(to right,
              rgba(250, 245, 238, 0.92) 0%,
              rgba(250, 245, 238, 0.55) 35%,
              rgba(250, 245, 238, 0.0) 60%);
        }
        @media (max-width: 1023px) {
          .hero-gradient {
            background:
              linear-gradient(to bottom,
                rgba(250, 245, 238, 0.92) 0%,
                rgba(250, 245, 238, 0.55) 35%,
                rgba(250, 245, 238, 0.15) 65%,
                rgba(250, 245, 238, 0.0) 100%);
          }
        }
        .hero-left { animation: fadeInLeft .8s ease both; }
        .hero-child-1 { animation: fadeInUp .7s ease .05s both; }
        .hero-child-2 { animation: fadeInUp .7s ease .15s both; }
        .hero-child-3 { animation: fadeInUp .7s ease .25s both; }
        .hero-child-4 { animation: fadeInUp .7s ease .35s both; }
        .hero-child-5 { animation: fadeInUp .7s ease .45s both; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
