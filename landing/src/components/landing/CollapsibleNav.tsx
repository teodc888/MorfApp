'use client';

import { useEffect, useState } from 'react';

const links = [
  { href: '/#features', label: 'Funciones' },
  { href: '/#pricing', label: 'Planes' },
  { href: '/#testimonial', label: 'Testimonios' },
  { href: '/contacto', label: 'Contacto' },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function CollapsibleNav() {
  const [foldProgress, setFoldProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('#hero');
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsCompactViewport(media.matches);

    updateViewport();
    media.addEventListener('change', updateViewport);

    if (!hero) return;

    const handleScroll = () => {
      const rect = hero.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / total);
      const startsNearFeatures = clamp((progress - 0.72) / 0.22);

      setFoldProgress(startsNearFeatures);

      if (startsNearFeatures < 0.92) {
        setIsOpen(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      media.removeEventListener('change', updateViewport);
    };
  }, []);

  const isFolded = foldProgress > 0.94;
  const menuProgress = isCompactViewport ? 1 : foldProgress;
  const linkOpacity = Math.max(0, 1 - foldProgress * 1.55);
  const logoScale = 1 - foldProgress * 0.1;

  return (
    <div className="fixed left-0 right-0 top-0 z-50">
      <nav
        className="relative flex h-16 items-center overflow-hidden border-b border-r border-[rgba(194,101,42,0.14)] bg-[rgba(250,245,238,0.56)] shadow-[0_18px_60px_rgba(194,101,42,0.08)] backdrop-blur-2xl transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          width: isCompactViewport
            ? '100%'
            : `calc(${100 - foldProgress * 100}% + ${64 * foldProgress}px)`,
          minWidth: 64,
          borderRadius: 0,
        }}
        aria-label="Navegacion principal"
      >
        <a
          href="/"
          className="ml-5 flex-shrink-0 font-body text-lg font-extrabold tracking-[0.01em] text-primary transition-transform duration-500 md:ml-8"
          style={{ transform: `scale(${logoScale})`, opacity: Math.max(0, 1 - foldProgress * 2.2) }}
        >
          MorfApp
        </a>

        <div
          className="ml-auto hidden items-center gap-8 pr-5 transition-all duration-500 md:flex"
          style={{
            opacity: linkOpacity,
            transform: `translateX(${-foldProgress * 18}px)`,
            pointerEvents: isFolded ? 'none' : 'auto',
          }}
        >
          {links.slice(0, 3).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap font-body text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant/80 transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/contacto"
            className="inline-flex items-center justify-center border border-primary/25 bg-primary/10 px-5 py-2.5 font-body text-xs font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-on-primary"
          >
            Contacto
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center transition-opacity duration-300"
          style={{
            opacity: menuProgress,
            pointerEvents: isCompactViewport || isFolded || foldProgress > 0.2 ? 'auto' : 'none',
          }}
          aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
        >
          <span className="relative h-4 w-5">
            <span
              className="absolute left-0 top-0 h-0.5 w-full rounded bg-primary transition-transform duration-300"
              style={{ transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'translateY(0) rotate(0)' }}
            />
            <span
              className="absolute left-0 top-[7px] h-0.5 w-full rounded bg-primary transition-opacity duration-200"
              style={{ opacity: isOpen ? 0 : 1 }}
            />
            <span
              className="absolute left-0 top-[14px] h-0.5 w-full rounded bg-primary transition-transform duration-300"
              style={{ transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'translateY(0) rotate(0)' }}
            />
          </span>
        </button>
      </nav>

      <div
        className="absolute left-0 top-16 w-64 overflow-hidden border-b border-r border-[rgba(194,101,42,0.16)] bg-[rgba(250,245,238,0.74)] shadow-[0_24px_70px_rgba(194,101,42,0.12)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col p-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="px-5 py-4 font-body text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
