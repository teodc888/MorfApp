'use client';

import { useEffect, useState } from 'react';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="bg-surface-bright text-on-surface font-body antialiased min-h-screen selection:bg-primary-container selection:text-on-primary-container">

      {/* ── NAV ── */}
      <header className="fixed top-0 w-full z-50 bg-[#faf5ee]/90 backdrop-blur-md border-b border-[#d8d0c8]/60 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <a className="text-2xl font-headline italic font-bold text-primary" href="#">MorfApp</a>
          <nav className="hidden md:flex gap-8 items-center">
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight" href="#features">Funciones</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight" href="#pricing">Planes</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight" href="#contact">Contacto</a>
          </nav>
          <a className="hidden md:inline-flex items-center justify-center bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-surface-tint transition-colors font-body" href="#pricing">
            Empezar gratis
          </a>
          <button
            className="md:hidden text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            <span className="material-symbols-outlined text-3xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#faf5ee] border-t border-[#d8d0c8]/60 px-6 py-4 flex flex-col gap-4">
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg" href="#features" onClick={() => setMobileMenuOpen(false)}>Funciones</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg" href="#pricing" onClick={() => setMobileMenuOpen(false)}>Planes</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg" href="#contact" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
            <a className="inline-flex items-center justify-center bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-surface-tint transition-colors font-body" href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Empezar gratis
            </a>
          </div>
        )}
      </header>

      <main className="pt-24">

        {/* ── HERO ── */}
        <section className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16 overflow-hidden">
          <div className="lg:w-1/2 flex flex-col items-start gap-8 z-10 hero-left">
            <div className="hero-child-1 inline-flex items-center gap-2 bg-primary-fixed px-4 py-2 rounded-full border border-primary-fixed-dim/60">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <span className="font-body text-xs font-bold text-primary tracking-widest uppercase">Primer mes gratis</span>
            </div>
            <h1 className="hero-child-2 font-headline text-5xl lg:text-7xl font-bold leading-[1.1] text-on-surface tracking-tight">
              Tu menú digital,<br />
              <span className="text-primary italic">tan irresistible</span><br />
              como tu cocina
            </h1>
            <p className="hero-child-3 font-body text-lg text-on-surface-variant max-w-lg leading-relaxed">
              Atrae más clientes y gestioná tus pedidos directamente por WhatsApp. Sin comisiones, sin complicaciones. Tu local online en minutos.
            </p>
            <div className="hero-child-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <a className="inline-flex items-center justify-center px-8 py-4 bg-primary text-on-primary rounded font-bold text-lg hover:bg-surface-tint transition-colors shadow-sm" href="#pricing">
                Ver planes
              </a>
              <a className="inline-flex items-center justify-center px-8 py-4 border-2 border-outline-variant text-on-surface rounded font-bold text-lg hover:border-primary hover:text-primary transition-colors" href="https://dev.morfapp.app/" target="_blank" rel="noopener noreferrer">
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
            {/* Blob decorativo */}
            <div className="blob-anim absolute inset-0 bg-surface-container rounded-full blur-3xl opacity-60"></div>

            {/* Phone mockup */}
            <div className="phone-float relative z-10" style={{ width: '280px' }}>
              <div style={{
                background: '#1c1917',
                borderRadius: '40px',
                padding: '14px',
                boxShadow: '0 32px 80px rgba(58,48,42,.28), 0 0 0 1px rgba(255,255,255,.07) inset',
                position: 'relative',
              }}>
                {/* Notch */}
                <div style={{
                  width: '90px', height: '26px',
                  background: '#1c1917',
                  borderRadius: '0 0 18px 18px',
                  position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#292524' }}></div>
                  <div style={{ width: '40px', height: '5px', borderRadius: '4px', background: '#292524' }}></div>
                </div>

                {/* Screen */}
                <div style={{ background: '#faf5ee', borderRadius: '28px', overflow: 'hidden', minHeight: '520px' }}>
                  {/* App header */}
                  <div style={{ background: '#c2652a', padding: '20px 18px 16px', paddingTop: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(255,255,255,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px',
                      }}>🍔</div>
                      <div>
                        <div style={{ color: '#fff', fontFamily: "'EB Garamond', serif", fontSize: '15px', fontWeight: 700, fontStyle: 'italic', lineHeight: 1 }}>La Hamburguesería</div>
                        <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '10px', fontFamily: 'Manrope, sans-serif', marginTop: '1px' }}>Abierto · Delivery disponible</div>
                      </div>
                    </div>
                    {/* Search bar */}
                    <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: '10px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                      <span style={{ color: 'rgba(255,255,255,.6)', fontSize: '13px' }}>🔍</span>
                      <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', fontFamily: 'Manrope, sans-serif' }}>Buscar en el menú...</span>
                    </div>
                  </div>

                  {/* Category pills */}
                  <div style={{ display: 'flex', gap: '8px', padding: '12px 14px 4px', overflow: 'hidden' }}>
                    <div style={{ background: '#c2652a', color: '#fff', fontSize: '10px', fontFamily: 'Manrope, sans-serif', fontWeight: 700, padding: '5px 12px', borderRadius: '999px', whiteSpace: 'nowrap' }}>🍔 Burgers</div>
                    <div style={{ background: '#ece6dc', color: '#605850', fontSize: '10px', fontFamily: 'Manrope, sans-serif', fontWeight: 600, padding: '5px 12px', borderRadius: '999px', whiteSpace: 'nowrap' }}>🍟 Papas</div>
                    <div style={{ background: '#ece6dc', color: '#605850', fontSize: '10px', fontFamily: 'Manrope, sans-serif', fontWeight: 600, padding: '5px 12px', borderRadius: '999px', whiteSpace: 'nowrap' }}>🥤 Bebidas</div>
                  </div>

                  {/* Products */}
                  <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { emoji: '🍔', name: 'Burger Clásica', desc: 'Cheddar, lechuga, tomate', price: '$9.900' },
                      { emoji: '🍔', name: 'Burger Doble', desc: 'Doble cheddar, bacon', price: '$13.500' },
                      { emoji: '🍟', name: 'Papas Crocantes', desc: 'Con dip de queso', price: '$5.500' },
                    ].map((item) => (
                      <div key={item.name} style={{ background: '#fff', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 8px rgba(58,48,42,.06)' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#fbe8d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{item.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'EB Garamond', serif", fontSize: '13px', fontWeight: 700, color: '#3a302a', lineHeight: 1.2 }}>{item.name}</div>
                          <div style={{ fontSize: '10px', color: '#9a9088', fontFamily: 'Manrope, sans-serif', marginTop: '2px' }}>{item.desc}</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#c2652a', fontFamily: "'EB Garamond', serif", marginTop: '4px' }}>{item.price}</div>
                        </div>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#c2652a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>+</div>
                      </div>
                    ))}
                  </div>

                  {/* Cart bar */}
                  <div style={{ margin: '8px 14px 14px', background: '#1c1917', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#c2652a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff' }}>2</div>
                      <span style={{ color: '#fff', fontSize: '11px', fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}>Ver carrito</span>
                    </div>
                    <span style={{ color: '#e08850', fontFamily: "'EB Garamond', serif", fontSize: '14px', fontWeight: 700 }}>$23.400</span>
                  </div>
                </div>
              </div>

              {/* Floating WhatsApp badge */}
              <div className="badge-right badge-whatsapp" style={{
                position: 'absolute', bottom: '-10px', right: '-18px',
                background: '#25d366', color: '#fff',
                borderRadius: '14px', padding: '8px 14px',
                fontSize: '11px', fontFamily: 'Manrope, sans-serif', fontWeight: 700,
                boxShadow: '0 4px 16px rgba(37,211,102,.35)',
                display: 'flex', alignItems: 'center', gap: '6px',
                whiteSpace: 'nowrap',
              }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a9.3 9.3 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L0 24l6.335-1.507A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.727.977.994-3.634-.234-.374A9.818 9.818 0 1112 21.818z" />
                </svg>
                ¡Pedido enviado!
              </div>

              {/* Floating rating badge */}
              <div className="badge-left" style={{
                position: 'absolute', top: '40px', left: '-22px',
                background: '#fff', color: '#3a302a',
                borderRadius: '12px', padding: '8px 12px',
                fontSize: '11px', fontFamily: 'Manrope, sans-serif', fontWeight: 600,
                boxShadow: '0 4px 16px rgba(58,48,42,.12)',
                display: 'flex', alignItems: 'center', gap: '5px',
                border: '1px solid #ece6dc',
              }}>
                ⭐ <span style={{ fontWeight: 800 }}>4.9</span> <span style={{ color: '#9a9088' }}>· 120 pedidos</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="bg-surface-container-low py-24 border-y border-outline-variant/30" id="features">
          <div className="max-w-7xl mx-auto px-6">
            <div className="reveal text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-headline text-4xl lg:text-5xl font-bold text-on-surface mb-6">Simplicidad que vende</h2>
              <p className="font-body text-lg text-on-surface-variant">Diseñado para resaltar lo mejor de tu gastronomía sin complicaciones técnicas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              <div className="reveal stagger-1 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Pedidos por WhatsApp</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Recibí órdenes formateadas directo en tu teléfono. Sin comisiones ocultas, comunicación directa con el cliente.</p>
              </div>

              <div className="reveal stagger-2 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-secondary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Tu Marca, Tu Estilo</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Personalizá colores, logo y banner. Un menú que se siente como una extensión natural de tu local.</p>
              </div>

              <div className="reveal stagger-3 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-primary-fixed rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>edit_document</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Gestión Intuitiva</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Actualizá precios, ocultá productos agotados y agregá categorías en segundos desde cualquier dispositivo.</p>
              </div>

              <div className="reveal stagger-4 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Horarios Automáticos</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Configurá tus horarios de atención. El local se muestra abierto o cerrado automáticamente.</p>
              </div>

              <div className="reveal stagger-5 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-secondary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>motorcycle</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Delivery y Takeaway</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Activá entrega a domicilio, retiro en local, o las dos opciones. Con costo de envío y mínimo de pedido.</p>
              </div>

              <div className="reveal stagger-6 bg-surface-bright p-10 rounded-lg shadow-[0_2px_16px_rgba(58,48,42,0.02)] border border-surface-container hover:shadow-[0_4px_24px_rgba(58,48,42,0.07)] transition-shadow">
                <div className="w-14 h-14 bg-primary-fixed rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">Personalizaciones</h3>
                <p className="font-body text-on-surface-variant leading-relaxed">Creá modificadores (punto de cocción, extras, salsas) y asignalos a tus productos fácilmente.</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <Pricing />

        {/* ── TESTIMONIAL ── */}
        <section className="bg-surface-container py-24 px-6 border-t border-outline-variant/30">
          <div className="reveal max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-surface-bright px-4 py-2 rounded-full border border-outline-variant/50 mb-8 shadow-sm">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-container border-2 border-surface-bright flex items-center justify-center text-xs font-bold text-primary">M</div>
                <div className="w-8 h-8 rounded-full bg-secondary-container border-2 border-surface-bright flex items-center justify-center text-xs font-bold text-on-surface">R</div>
                <div className="w-8 h-8 rounded-full bg-primary-fixed border-2 border-surface-bright flex items-center justify-center text-xs font-bold text-primary">L</div>
              </div>
              <span className="font-body text-sm font-medium text-on-surface-variant ml-2">Primeros locales en la plataforma</span>
            </div>
            <h2 className="font-headline text-3xl md:text-5xl font-bold text-on-surface italic mb-8 max-w-3xl mx-auto leading-tight">
              &ldquo;Tardé 10 minutos en cargar todo el menú. Mis clientes ya hacen pedidos solos y yo solo recibo el WhatsApp.&rdquo;
            </h2>
            <div className="flex flex-col items-center gap-1">
              <span className="font-body font-bold text-on-surface text-lg">La Hamburguesería del Centro</span>
              <span className="font-body text-on-surface-variant text-sm uppercase tracking-widest">Córdoba, Argentina</span>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6 max-w-5xl mx-auto" id="contact">
          <div className="reveal scale bg-surface-container-low rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 border border-outline-variant shadow-[0_4px_32px_rgba(58,48,42,0.05)] relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
            <div className="md:w-2/3 relative z-10">
              <h2 className="font-headline text-4xl font-bold text-on-surface mb-4">¿Dudas? Hablemos.</h2>
              <p className="font-body text-lg text-on-surface-variant">
                Escribinos por WhatsApp y te ayudamos a tener tu menú digital online en menos de 10 minutos. Sin costo, sin compromiso.
              </p>
            </div>
            <div className="md:w-1/3 w-full flex justify-center md:justify-end relative z-10">
              <a
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded font-bold text-lg hover:bg-[#20bd5a] transition-colors shadow-sm font-body"
                href="https://wa.me/5493512550311?text=Hola!%20Quiero%20probar%20MorfApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L0 24l6.335-1.507A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.727.977.994-3.634-.234-.374A9.818 9.818 0 1112 21.818z" />
                </svg>
                Contactar ahora
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full py-12 px-6 border-t border-[#d8d0c8]/60 bg-[#faf5ee]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-xl font-headline italic text-primary">MorfApp</span>
            <p className="text-on-surface-variant font-body text-sm tracking-wide">© 2026 MorfApp — Todos los derechos reservados.</p>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-end gap-6 font-body text-sm tracking-wide">
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Política de privacidad</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Términos de uso</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#contact">Soporte</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Panel admin</a>
          </nav>
        </div>
      </footer>

    </div>
  );
}
