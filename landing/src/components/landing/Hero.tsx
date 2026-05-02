'use client';

export function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16 overflow-hidden pt-24">
      <div className="lg:w-1/2 flex flex-col items-start gap-8 z-10 hero-left">
        <div className="hero-child-1 inline-flex items-center gap-2 bg-primary-fixed px-4 py-2 rounded-full border border-primary-fixed-dim/60">
          <span className="material-symbols-outlined text-primary text-sm" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span className="font-body text-xs font-bold text-primary tracking-widest uppercase">Primer mes gratis</span>
        </div>
        <h1 className="hero-child-2 font-headline text-5xl lg:text-7xl font-bold leading-[1.1] text-on-surface tracking-tight">
          Tu menú digital,<br />
          <span className="text-primary italic">tan irresistible</span>
          <br />
          como tu cocina
        </h1>
        <p className="hero-child-3 font-body text-lg text-on-surface-variant max-w-lg leading-relaxed">
          Atrae más clientes y gestioná tus pedidos directamente por WhatsApp. Sin comisiones, sin complicaciones. Tu local online en minutos.
        </p>
        <div className="hero-child-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <a
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-on-primary rounded font-bold text-lg hover:bg-surface-tint transition-colors shadow-sm"
            href="#pricing"
          >
            Ver planes
          </a>
          <a
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-outline-variant text-on-surface rounded font-bold text-lg hover:border-primary hover:text-primary transition-colors"
            href="https://dev.morfapp.app/"
            target="_blank"
          >
            Ver demo
          </a>
        </div>
        <div className="hero-child-5 flex items-center gap-6 pt-2 border-t border-outline-variant/40 w-full">
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

      <div className="lg:w-1/2 w-full relative flex items-center justify-center py-8 hero-right">
        <div className="blob-anim absolute inset-0 bg-surface-container rounded-full blur-3xl opacity-60"></div>

        <div className="phone-float relative z-10" style={{ width: '280px' }}>
          <div
            style={{
              background: '#1c1917',
              borderRadius: '40px',
              padding: '14px',
              boxShadow: '0 32px 80px rgba(58,48,42,.28), 0 0 0 1px rgba(255,255,255,.07) inset',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '90px',
                height: '26px',
                background: '#1c1917',
                borderRadius: '0 0 18px 18px',
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#292524' }}></div>
              <div style={{ width: '40px', height: '5px', borderRadius: '4px', background: '#292524' }}></div>
            </div>

            <div
              style={{
                background: '#faf5ee',
                borderRadius: '28px',
                overflow: 'hidden',
                minHeight: '520px',
              }}
            >
              <div style={{ background: '#c2652a', padding: '20px 18px 16px', paddingTop: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    🍔
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontFamily: "'EB Garamond',serif", fontSize: '15px', fontWeight: '700', fontStyle: 'italic', lineHeight: '1' }}>
                      La Hamburguesería
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '10px', fontFamily: 'Manrope,sans-serif', marginTop: '1px' }}>
                      Abierto · Delivery disponible
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { emoji: '🍔', name: 'Burger Clásica', desc: 'Cheddar, lechuga, tomate', price: '$9.900' },
                  { emoji: '🍔', name: 'Burger Doble', desc: 'Doble cheddar, bacon', price: '$13.500' },
                  { emoji: '🍟', name: 'Papas Crocantes', desc: 'Con dip de queso', price: '$5.500' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 1px 8px rgba(58,48,42,.06)',
                    }}
                  >
                    <div style={{ fontSize: '24px' }}>{item.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'EB Garamond',serif", fontSize: '13px', fontWeight: '700', color: '#3a302a' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9a9088', fontFamily: 'Manrope,sans-serif', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#c2652a', fontFamily: "'EB Garamond',serif", marginTop: '4px' }}>
                        {item.price}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        background: '#c2652a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '700',
                      }}
                    >
                      +
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ margin: '8px 14px 14px', background: '#1c1917', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#c2652a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#fff' }}>
                    2
                  </div>
                  <span style={{ color: '#fff', fontSize: '11px', fontFamily: 'Manrope,sans-serif', fontWeight: '600' }}>
                    Ver carrito
                  </span>
                </div>
                <span style={{ color: '#e08850', fontFamily: "'EB Garamond',serif", fontSize: '14px', fontWeight: '700' }}>
                  $23.400
                </span>
              </div>
            </div>
          </div>

          <div
            className="badge-right badge-whatsapp"
            style={{
              position: 'absolute',
              bottom: '-10px',
              right: '-18px',
              background: '#25d366',
              color: '#fff',
              borderRadius: '14px',
              padding: '8px 14px',
              fontSize: '11px',
              fontFamily: 'Manrope,sans-serif',
              fontWeight: '700',
              boxShadow: '0 4px 16px rgba(37,211,102,.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ ¡Pedido enviado!
          </div>

          <div
            className="badge-left"
            style={{
              position: 'absolute',
              top: '40px',
              left: '-22px',
              background: '#fff',
              color: '#3a302a',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '11px',
              fontFamily: 'Manrope,sans-serif',
              fontWeight: '600',
              boxShadow: '0 4px 16px rgba(58,48,42,.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              border: '1px solid #ece6dc',
            }}
          >
            ⭐ <span style={{ fontWeight: '800' }}>4.9</span> <span style={{ color: '#9a9088' }}>· 120 pedidos</span>
          </div>
        </div>
      </div>

      <style>{`
        .hero-left { animation: fadeInLeft .8s ease both; }
        .hero-right { animation: fadeInRight .8s ease .2s both; }
        .hero-child-1 { animation: fadeInUp .7s ease .05s both; }
        .hero-child-2 { animation: fadeInUp .7s ease .15s both; }
        .hero-child-3 { animation: fadeInUp .7s ease .25s both; }
        .hero-child-4 { animation: fadeInUp .7s ease .35s both; }
        .hero-child-5 { animation: fadeInUp .7s ease .45s both; }
        .phone-float { animation: float 4s ease-in-out infinite; }
        .badge-right { animation: float-badge-right 3.5s ease-in-out infinite; animation-delay: .4s; }
        .badge-left { animation: float-badge-left 4.2s ease-in-out infinite; animation-delay: .8s; }
        .badge-whatsapp { animation: pulse-green 2.5s ease-in-out infinite; }
        .blob-anim { animation: blob-drift 8s ease-in-out infinite; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-badge-right {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes float-badge-left {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 4px 16px rgba(37,211,102,.35); }
          50% { box-shadow: 0 4px 28px rgba(37,211,102,.55); }
        }
        @keyframes blob-drift {
          0%, 100% { transform: translate(24px, 32px) scale(1); }
          50% { transform: translate(32px, 20px) scale(1.05); }
        }
      `}</style>
    </section>
  );
}
