'use client';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'hero',        label: 'Inicio' },
  { id: 'features',   label: 'Funciones' },
  { id: 'pricing',    label: 'Planes' },
  { id: 'testimonial', label: 'Clientes' },
  { id: 'contact',    label: 'Contacto' },
];

export function ScrollIndicator() {
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const observers = SECTIONS.map(({ id }) => {
      const el = document.getElementById(id) ?? document.getElementById(id + '-scroll');
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(id); },
        { threshold: 0.25 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2.5">
      {SECTIONS.map(({ id, label }) => (
        <div key={id} className="relative flex items-center justify-end group">
          <span className="absolute right-4 font-body text-[0.68rem] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap
            opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none
            transition-all duration-200"
            style={{ background: '#2a1f1a', color: '#faf5ee' }}>
            {label}
          </span>
          <a
            href={`#${id}`}
            className={`w-2 h-2 rounded-full border-[1.5px] block transition-all duration-300
              ${active === id ? 'bg-primary border-primary scale-[1.5]' : 'bg-outline-variant border-outline-variant'}`}
          />
        </div>
      ))}
    </nav>
  );
}
