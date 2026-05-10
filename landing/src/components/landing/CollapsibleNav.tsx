'use client';

import { useState, useEffect } from 'react';

export function CollapsibleNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('#hero');
    if (!hero) return;

    const handleScroll = () => {
      const heroRect = hero.getBoundingClientRect();
      const heroBottom = heroRect.bottom;
      setIsCollapsed(heroBottom <= 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  return (
    <div className="fixed top-5 left-5 z-50">
      <nav
        className={`
          bg-[rgba(42,31,26,0.95)] backdrop-blur-xl border border-[rgba(250,245,238,0.1)]
          rounded-full px-6 py-3 h-12 flex items-center gap-8 overflow-hidden
          transition-all duration-400 origin-left
          ${isCollapsed ? 'w-12 px-0 justify-center rounded-full' : 'w-auto justify-start'}
        `}
      >
        {/* Logo */}
        <div
          className={`
            text-xl font-bold text-primary whitespace-nowrap flex-shrink-0
            transition-opacity duration-300
            ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'}
          `}
        >
          MorfApp
        </div>

        {/* Nav Items */}
        <div
          className={`
            flex gap-8 items-center
            transition-opacity duration-300
            ${isCollapsed ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible'}
          `}
        >
          <a href="/#features" className="text-[#faf5ee] text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Funciones
          </a>
          <a href="/#pricing" className="text-[#faf5ee] text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Planes
          </a>
          <a href="/#testimonial" className="text-[#faf5ee] text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Testimonios
          </a>
          <a href="/contacto" className="text-[#faf5ee] text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Contacto
          </a>
        </div>

        {/* Menu Icon (collapsed state) */}
        <button
          onClick={handleMenuClick}
          className={`
            w-6 h-6 flex flex-col justify-between items-center flex-shrink-0
            transition-all duration-300 cursor-pointer
            ${isCollapsed ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-75'}
          `}
          aria-label="Expandir menú"
        >
          <span className="w-full h-0.5 bg-[#faf5ee] rounded"></span>
          <span className="w-full h-0.5 bg-[#faf5ee] rounded"></span>
          <span className="w-full h-0.5 bg-[#faf5ee] rounded"></span>
        </button>
      </nav>
    </div>
  );
}
