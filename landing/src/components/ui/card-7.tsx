'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface InteractiveProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string;
  logoUrl?: string;
  logoText?: string;
  title: string;
  description: string;
  price: string;
  children?: React.ReactNode;
  featured?: boolean;
  tone?: 'light' | 'dark' | 'warm';
}

type CardTone = NonNullable<InteractiveProductCardProps['tone']>;

const headerClasses: Record<CardTone, string> = {
  light: 'border-white/18 bg-[#2a1f1a]/58 text-[#faf5ee]',
  dark: 'border-[#d4a96a]/35 bg-black/30 text-[#faf5ee]',
  warm: 'border-[#f1b16b]/24 bg-[#2a1f1a]/55 text-[#faf5ee]',
};

const logoClasses: Record<CardTone, string> = {
  light: 'text-primary',
  dark: 'text-accent-amber',
  warm: 'text-[#8f4218]',
};

const priceClasses: Record<CardTone, string> = {
  light: 'border-primary/35 bg-[#2a1f1a]/62 text-[#f4a261]',
  dark: 'border-accent-amber/40 bg-accent-amber/16 text-accent-amber',
  warm: 'border-[#f1b16b]/35 bg-[#2a1f1a]/58 text-[#f1b16b]',
};

const overlayClasses: Record<CardTone, string> = {
  light: 'bg-[linear-gradient(180deg,rgba(42,31,26,0.56)_0%,rgba(42,31,26,0.76)_42%,rgba(42,31,26,0.92)_100%)]',
  dark: 'bg-[linear-gradient(180deg,rgba(31,23,19,0.72)_0%,rgba(31,23,19,0.88)_48%,rgba(31,23,19,0.97)_100%)]',
  warm: 'bg-[linear-gradient(180deg,rgba(64,34,18,0.58)_0%,rgba(64,34,18,0.8)_48%,rgba(42,24,16,0.94)_100%)]',
};

export function InteractiveProductCard({
  className,
  imageUrl,
  logoUrl,
  logoText = 'MorfApp',
  title,
  description,
  price,
  children,
  featured,
  tone = featured ? 'dark' : 'light',
  ...props
}: InteractiveProductCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.matchMedia('(pointer: coarse)').matches) return;

    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;
    const rotateX = ((y - height / 2) / (height / 2)) * -6;
    const rotateY = ((x - width / 2) / (width / 2)) * 6;

    setStyle({
      transform: `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.025, 1.025, 1.025)`,
      transition: 'transform 0.1s ease-out',
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.45s cubic-bezier(.22,1,.36,1)',
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={cn(
        'relative flex min-h-[520px] w-full flex-col overflow-hidden border shadow-[0_18px_60px_rgba(58,48,42,0.12)]',
        'rounded-[1.35rem] border-[rgba(194,101,42,0.18)] bg-surface-bright',
        featured && 'border-[rgba(212,169,106,0.42)] shadow-[0_24px_80px_rgba(194,101,42,0.2)]',
        className
      )}
      {...props}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'translateZ(-24px) scale(1.08)' }}
        />
      )}
      <div className={cn('absolute inset-0', overlayClasses[tone])} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(224,136,80,0.22),transparent_48%)]" />
      <div className="absolute inset-3 rounded-[1rem] border border-white/20" />
      <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full border border-white/20 opacity-70" />
      <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full border border-primary/15 opacity-70" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]" />

      <div className="relative z-10 flex h-full flex-1 flex-col p-5" style={{ transform: 'translateZ(36px)' }}>
        <div className={cn('flex items-start justify-between gap-4 border p-4 shadow-[0_10px_34px_rgba(42,31,26,0.08)] backdrop-blur-xl', headerClasses[tone])}>
          <div>
            <h3 className="font-headline text-2xl font-bold leading-none text-[#faf5ee]">
              {title}
            </h3>
            <p className="mt-1 font-body text-xs text-[#f8ead9]/78">
              {description}
            </p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="MorfApp" className="h-5 w-auto opacity-80" />
          ) : (
            <span className={cn('font-body text-xs font-extrabold uppercase tracking-[0.16em]', logoClasses[tone])}>
              {logoText}
            </span>
          )}
        </div>

        <div className={cn('mt-4 w-fit border px-4 py-2 text-sm font-bold shadow-[0_8px_24px_rgba(42,31,26,0.08)] backdrop-blur-xl', priceClasses[tone])}>
          {price}
        </div>

        <div className="mt-auto pt-6">{children}</div>
      </div>
    </div>
  );
}
