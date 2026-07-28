'use client';

import { useInView } from '@/hooks/useInView';

export function CTA() {
  const { ref, isVisible } = useInView();

  return (
    <section className="py-12 px-4 relative overflow-hidden md:px-6 md:py-16" id="contact">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(194,101,42,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        ref={ref}
        className={`reveal relative max-w-5xl mx-auto rounded-2xl overflow-hidden
          flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0 p-6 sm:p-8 md:p-16 ${
          isVisible ? 'visible' : ''
        }`}
        style={{
          background: 'radial-gradient(ellipse at 70% 50%, #fbe8d8 0%, #faf5ee 65%)',
          border: '1.5px solid rgba(194,101,42,0.15)',
          boxShadow: '0 4px 48px rgba(194,101,42,0.08), 0 2px 16px rgba(58,48,42,0.06)',
        }}
      >
        <div className="absolute -top-32 -right-24 w-64 h-64 rounded-full pointer-events-none md:-right-16 md:w-80 md:h-80"
             style={{ background: 'radial-gradient(circle, rgba(194,101,42,0.1) 0%, transparent 70%)' }} />

        <div className="md:w-2/3 relative z-10">
          <h2 className="font-headline text-[2.1rem] md:text-4xl font-bold text-on-surface mb-4 leading-tight">
            Empezá hoy,<br className="hidden md:block" /> cobrá mañana.
          </h2>
          <p className="font-body text-base md:text-lg text-on-surface-variant">
            En 10 minutos tenés tu menú online. Te acompañamos en el proceso y si hace falta, te derivamos directo a WhatsApp.
          </p>
        </div>

        <div className="md:w-1/3 flex flex-col items-center md:items-end gap-3 relative z-10 w-full">
          <a
            href="/contacto"
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4
              bg-[#25D366] text-white rounded-lg font-bold text-base md:text-lg hover:bg-[#20bd5a] transition-colors shadow-sm font-body"
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.3 9.3 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            Contactar ahora
          </a>
          <p className="font-body text-xs text-on-surface-variant text-center md:text-right opacity-70">
            Sin comisiones. Sin complicaciones.
          </p>
        </div>
      </div>
    </section>
  );
}
