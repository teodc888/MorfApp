'use client';

import { useState, useRef } from 'react';
import { useScroll, useMotionValueEvent } from 'motion/react';

interface Testimonial {
  quote: string;
  role: string;
  author: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    quote: 'Tardé 10 minutos en cargar todo el menú. Mis clientes ya hacen pedidos solos y yo solo recibo el WhatsApp.',
    role: 'Dueña · La Hamburguesería del Centro — Córdoba',
    author: 'María Beatriz',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=faces&auto=format',
  },
  {
    quote: 'Antes pasaba horas tomando pedidos por teléfono. Ahora llegan solos al WhatsApp y yo me enfoco en cocinar.',
    role: 'Chef propietario · El Rincón Criollo — Mendoza',
    author: 'Roberto',
    avatar: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=80&h=80&fit=crop&crop=faces&auto=format',
  },
  {
    quote: 'Lo armé en una tarde y mis clientes ya estaban haciendo pedidos. No puedo creer lo fácil que fue.',
    role: 'Emprendedora · Pastas Luciana — Buenos Aires',
    author: 'Luciana',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces&auto=format',
  },
];

export function Testimonial() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedQuote, setDisplayedQuote] = useState(testimonials[0].quote);
  const [displayedRole, setDisplayedRole] = useState(testimonials[0].role);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    handleSelect(v < 0.33 ? 0 : v < 0.66 ? 1 : 2);
  });

  function handleSelect(index: number) {
    if (index === activeIndex || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setDisplayedQuote(testimonials[index].quote);
      setDisplayedRole(testimonials[index].role);
      setActiveIndex(index);
      setTimeout(() => setIsAnimating(false), 380);
    }, 260);
  }

  return (
    <>
      {/* Mobile version — muestra los tres testimonios apilados */}
      <section className="md:hidden bg-surface-container-low border-t border-outline-variant/30 py-8 px-5">
        <p className="font-body text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary mb-10 text-center">
          Lo que dicen nuestros clientes
        </p>
        <div className="mx-auto flex max-w-md flex-col">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`py-8 ${i > 0 ? 'border-t border-dashed border-outline-variant/50' : 'pt-0'}`}
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="font-headline italic font-semibold text-on-surface leading-relaxed text-[1.18rem] mb-4">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.author} className="w-9 h-9 flex-shrink-0 rounded-full object-cover" />
                <div>
                  <p className="font-body text-sm font-semibold leading-tight text-on-surface">{t.author}</p>
                  <p className="mt-0.5 font-body text-[0.65rem] leading-tight text-on-surface-variant">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Desktop version - 300vh sticky carousel */}
      <div
        ref={containerRef}
        id="testimonial"
        style={{ height: '100vh' }}
        className="hidden md:block relative bg-surface-container-low border-t border-outline-variant/30"
      >
        <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-6">
          <p className="font-body text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary mb-10">
            Lo que dicen nuestros clientes
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="relative px-20 max-w-3xl mx-auto mb-8 min-h-[160px] flex items-center justify-center">
              <span className="absolute -left-2 top-0 font-headline text-[8rem] leading-none text-primary/[0.15] font-bold select-none">"</span>
              <blockquote
                className="font-headline italic font-semibold text-on-surface leading-relaxed transition-all duration-[350ms] ease-out"
                style={{
                  fontSize: 'clamp(1.35rem, 2.8vw, 2.1rem)',
                  opacity: isAnimating ? 0 : 1,
                  filter: isAnimating ? 'blur(6px)' : 'none',
                  transform: isAnimating ? 'scale(0.975)' : 'scale(1)',
                }}
              >
                {displayedQuote}
              </blockquote>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <p
              className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant mb-8 transition-all duration-[400ms] ease-out text-center"
              style={{ opacity: isAnimating ? 0 : 1, transform: isAnimating ? 'translateY(8px)' : 'translateY(0)' }}
            >
              {displayedRole}
            </p>

            <div className="flex items-center justify-center gap-3 mb-8">
              {testimonials.map((t, i) => {
                const isActive = activeIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`flex items-center rounded-full border-none cursor-pointer
                      transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isActive ? 'bg-on-surface py-[3px] pl-[3px] pr-4' : 'bg-transparent p-[3px] hover:bg-surface-container'}`}
                  >
                    <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${isActive ? 'grid-cols-[1fr] opacity-100 ml-2' : 'grid-cols-[0fr] opacity-0 ml-0'}`}>
                      <div className="overflow-hidden">
                        <span className="font-body text-[0.82rem] font-semibold whitespace-nowrap block" style={{ color: '#faf5ee' }}>
                          {t.author}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {testimonials.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-[350ms] ease-out"
                  style={{
                    width: i === activeIndex ? 22 : 6,
                    background: i === activeIndex ? '#c2652a' : '#d8d0c8',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
