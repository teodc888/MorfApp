'use client';

import { useState, useEffect } from 'react';

export function Nav() {
  const [bgOpacity, setBgOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const opacity = Math.min(scrollY / 200, 1);
      setBgOpacity(opacity);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className="fixed top-0 w-full z-50 transition-shadow duration-300 border-b"
      style={{
        backgroundColor: `rgba(42, 31, 26, ${bgOpacity * 0.96})`,
        backdropFilter: bgOpacity > 0.1 ? 'blur(12px)' : 'none',
        borderColor: `rgba(250, 245, 238, ${bgOpacity * 0.1})`,
        boxShadow: bgOpacity > 0.1 ? `0 1px 0 rgba(250, 245, 238, ${bgOpacity * 0.08})` : 'none'
      }}
    >
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        <a className="text-2xl font-headline italic font-bold text-primary" href="/">
          MorfApp
        </a>
        <nav className="hidden md:flex gap-8 items-center">
          <a
            className="font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            style={{ color: '#faf5ee' }}
            href="/#features"
          >
            Funciones
          </a>
          <a
            className="font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            style={{ color: '#faf5ee' }}
            href="/#pricing"
          >
            Planes
          </a>
          <a
            className="font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            style={{ color: '#faf5ee' }}
            href="/contacto"
          >
            Contacto
          </a>
        </nav>
        <a
          className="hidden md:inline-flex items-center justify-center bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-surface-tint transition-colors font-body"
          href="/#pricing"
        >
          Empezar gratis
        </a>
        <button className="md:hidden text-primary">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </header>
  );
}
