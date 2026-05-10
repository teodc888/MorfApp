'use client';

import { useEffect, useState } from 'react';
import { useInView } from '@/hooks/useInView';

interface Feature {
  icon: string;
  tag: string;
  title: string;
  desc: string;
}

const features: Feature[] = [
  { icon: 'chat',          tag: 'Comunicación directa',  title: 'Pedidos por WhatsApp',   desc: 'Recibí órdenes formateadas directo en tu teléfono. Sin comisiones ocultas, comunicación directa con el cliente.' },
  { icon: 'palette',       tag: 'Identidad de marca',    title: 'Tu Marca, Tu Estilo',    desc: 'Personalizá colores, logo y banner. Un menú que se siente como una extensión natural de tu local.' },
  { icon: 'edit_document', tag: 'Sin fricción técnica',  title: 'Gestión Intuitiva',      desc: 'Actualizá precios, ocultá productos agotados y agregá categorías en segundos desde cualquier dispositivo.' },
  { icon: 'schedule',      tag: 'Automatización',        title: 'Horarios Automáticos',   desc: 'Configurá tus horarios de atención. El local se muestra abierto o cerrado automáticamente.' },
  { icon: 'motorcycle',    tag: 'Logística flexible',    title: 'Delivery y Takeaway',    desc: 'Activá entrega a domicilio, retiro en local, o las dos opciones. Con costo de envío y mínimo de pedido.' },
  { icon: 'tune',          tag: 'Experiencia de compra', title: 'Personalizaciones',      desc: 'Creá modificadores (punto de cocción, extras, salsas) y asignalos a tus productos fácilmente.' },
];

function FeatureRow({
  feature,
  index,
  isActive,
}: {
  feature: Feature;
  index: number;
  isActive: boolean;
}) {
  const { ref, isVisible } = useInView();
  const isEven = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 md:grid-cols-2 items-center relative
        ${index > 0 ? 'border-t border-dashed border-outline-variant/50' : ''}
        ${isEven ? 'reveal-left' : 'reveal-right'} ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Contenido */}
      <div className={`px-6 py-8 md:p-12 ${!isEven ? 'md:order-2' : ''}`}>
        <p className="font-body text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary mb-2">{feature.tag}</p>
        <h3 className="font-headline text-[1.55rem] font-bold text-on-surface mb-3 leading-tight md:text-[1.8rem]">{feature.title}</h3>
        <p className="font-body text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
      </div>

      {/* Ícono */}
      <div className={`px-6 pb-8 md:p-12 flex justify-start md:justify-center items-center ${!isEven ? 'md:order-1' : ''}`}>
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_8px_28px_rgba(194,101,42,0.28)] md:h-20 md:w-20">
          <span className="material-symbols-outlined text-white" style={{ fontSize: 30, fontVariationSettings: "'FILL' 1" }}>
            {feature.icon}
          </span>
        </div>
      </div>

      {/* Número decorativo */}
      <span
        className="absolute top-1/2 -translate-y-1/2 font-headline font-bold leading-none pointer-events-none select-none hidden md:block"
        style={{
          fontSize: '9rem',
          color: isActive ? 'rgba(194,101,42,0.92)' : 'rgba(194,101,42,0.055)',
          textShadow: isActive
            ? '0 0 18px rgba(224,136,80,0.42), 0 0 46px rgba(212,169,106,0.34), 0 14px 40px rgba(194,101,42,0.18)'
            : 'none',
          transition: 'color 360ms ease, text-shadow 360ms ease, transform 360ms ease',
          transform: `translateY(-50%) scale(${isActive ? 1.035 : 1})`,
          [isEven ? 'right' : 'left']: '4px',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
}

export function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const spine = document.getElementById('featureSpine');
    if (!spine) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { spine.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(spine);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-feature-row]'));
    if (!rows.length) return;

    let rafId = 0;

    const updateActiveFeature = () => {
      const activationY = window.innerHeight * 0.52;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      rows.forEach((row, index) => {
        const rect = row.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
        const distance = Math.abs(rowCenter - activationY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveFeature((current) => (current === closestIndex ? current : closestIndex));
    };

    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateActiveFeature();
      });
    };

    updateActiveFeature();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return (
    <section id="features" className="bg-surface-container-low border-b border-outline-variant/30">
      <div className="text-center max-w-xl mx-auto px-5 pt-12 pb-12 reveal visible md:px-6 md:pt-20 md:pb-20">
        <h2 className="font-headline text-[2.15rem] lg:text-5xl font-bold text-on-surface mb-4 leading-tight">Simplicidad que vende</h2>
        <p className="font-body text-base text-on-surface-variant md:text-lg">Diseñado para resaltar lo mejor de tu gastronomía sin complicaciones técnicas.</p>
      </div>

      <div className="relative mx-auto max-w-[880px] px-3 pb-16 md:px-0 md:pb-24">
        <div className="features-spine" id="featureSpine" />
        {features.map((f, i) => (
          <div key={i} data-feature-row>
            <FeatureRow feature={f} index={i} isActive={activeFeature === i} />
          </div>
        ))}
      </div>
    </section>
  );
}
