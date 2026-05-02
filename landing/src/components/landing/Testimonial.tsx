'use client';

import { useInView } from '@/hooks/useInView';

export function Testimonial() {
  const { ref, isVisible } = useInView();

  return (
    <section className="bg-surface-container py-24 px-6 border-t border-outline-variant/30">
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
      `}</style>
      <div ref={ref} className={`reveal max-w-4xl mx-auto text-center ${isVisible ? 'visible' : ''}`}>
        <div className="inline-flex items-center gap-2 bg-surface-bright px-4 py-2 rounded-full border border-outline-variant/50 mb-8 shadow-sm">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary-container border-2 border-surface-bright flex items-center justify-center text-xs font-bold text-primary">M</div>
            <div className="w-8 h-8 rounded-full bg-secondary-container border-2 border-surface-bright flex items-center justify-center text-xs font-bold">R</div>
            <div className="w-8 h-8 rounded-full bg-primary-fixed border-2 border-surface-bright flex items-center justify-center text-xs font-bold text-primary">L</div>
          </div>
          <span className="font-body text-sm font-medium text-on-surface-variant ml-2">Primeros locales en la plataforma</span>
        </div>
        <h2 className="font-headline text-3xl md:text-5xl font-bold text-on-surface italic mb-8 max-w-3xl mx-auto leading-tight">
          "Tardé 10 minutos en cargar todo el menú. Mis clientes ya hacen pedidos solos y yo solo recibo el WhatsApp."
        </h2>
        <div className="flex flex-col items-center gap-1">
          <span className="font-body font-bold text-on-surface text-lg">La Hamburguesería del Centro</span>
          <span className="font-body text-on-surface-variant text-sm uppercase tracking-widest">Córdoba, Argentina</span>
        </div>
      </div>
    </section>
  );
}
