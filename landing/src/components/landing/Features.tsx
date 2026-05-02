'use client';

import { useInView } from '@/hooks/useInView';

function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isVisible } = useInView();

  return (
    <div
      ref={ref}
      className={`reveal ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay * 80}ms` }}
    >
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section className="bg-surface-container-low py-24 border-y border-outline-variant/30" id="features">
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .6s ease, transform .6s ease;
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6">
        <div className="reveal text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-headline text-4xl lg:text-5xl font-bold text-on-surface mb-6">
            Simplicidad que vende
          </h2>
          <p className="font-body text-lg text-on-surface-variant">
            Diseñado para resaltar lo mejor de tu gastronomía sin complicaciones técnicas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: 'chat',
              title: 'Pedidos por WhatsApp',
              desc: 'Recibí órdenes formateadas directo en tu teléfono. Sin comisiones ocultas, comunicación directa con el cliente.',
            },
            {
              icon: 'palette',
              title: 'Tu Marca, Tu Estilo',
              desc: 'Personalizá colores, logo y banner. Un menú que se siente como una extensión natural de tu local.',
            },
            {
              icon: 'edit_document',
              title: 'Gestión Intuitiva',
              desc: 'Actualizá precios, ocultá productos agotados y agregá categorías en segundos desde cualquier dispositivo.',
            },
            {
              icon: 'schedule',
              title: 'Horarios Automáticos',
              desc: 'Configurá tus horarios de atención. El local se muestra abierto o cerrado automáticamente.',
            },
            {
              icon: 'motorcycle',
              title: 'Delivery y Takeaway',
              desc: 'Activá entrega a domicilio, retiro en local, o las dos opciones. Con costo de envío y mínimo de pedido.',
            },
            {
              icon: 'tune',
              title: 'Personalizaciones',
              desc: 'Creá modificadores (punto de cocción, extras, salsas) y asignalos a tus productos fácilmente.',
            },
          ].map((feature, i) => (
            <RevealCard key={i} delay={i}>
              <div className="bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center mb-6">
                  <span
                    className="material-symbols-outlined text-primary text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">{feature.title}</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">{feature.desc}</p>
              </div>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}
