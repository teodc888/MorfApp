'use client';

import { useInView } from '@/hooks/useInView';

export function CTA() {
  const { ref, isVisible } = useInView();

  return (
    <section className="py-24 px-6 max-w-5xl mx-auto" id="contact">
      <style>{`
        .reveal { opacity: 0; transform: scale(.95); transition: opacity .6s ease, transform .6s ease; }
        .reveal.visible { opacity: 1; transform: scale(1); }
      `}</style>
      <div
        ref={ref}
        className={`reveal scale bg-surface-container-low rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 border border-outline-variant shadow-[0_4px_32px_rgba(58,48,42,0.05)] relative overflow-hidden ${
          isVisible ? 'visible' : ''
        }`}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
        <div className="md:w-2/3 relative z-10">
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-4">¿Dudas? Hablemos.</h2>
          <p className="font-body text-lg text-on-surface-variant">
            Escribinos y te ayudamos a tener tu menú digital online en menos de 10 minutos. Si hace falta, te derivamos directo a WhatsApp. Sin costo, sin compromiso.
          </p>
        </div>
        <div className="md:w-1/3 w-full flex justify-center md:justify-end relative z-10">
          <a
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded font-bold text-lg hover:bg-[#20bd5a] transition-colors shadow-sm font-body"
            href="/contacto"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.3 9.3 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            Contactar ahora
          </a>
        </div>
      </div>
    </section>
  );
}
