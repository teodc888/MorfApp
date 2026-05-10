'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface InteractiveProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  logoUrl?: string;
  logoText?: string;
  title: string;
  description: string;
  price: string;
  children?: React.ReactNode;
  featured?: boolean;
}

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
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'translateZ(-24px) scale(1.08)' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,245,238,0.18)_0%,rgba(250,245,238,0.82)_48%,rgba(250,245,238,0.96)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(224,136,80,0.24),transparent_48%)]" />
      {featured && <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,31,26,0.82),rgba(42,31,26,0.96))]" />}

      <div className="relative z-10 flex h-full flex-1 flex-col p-5" style={{ transform: 'translateZ(36px)' }}>
        <div className="flex items-start justify-between gap-4 border border-white/25 bg-white/28 p-4 backdrop-blur-xl">
          <div>
            <h3 className={cn('font-headline text-2xl font-bold leading-none', featured ? 'text-surface-bright' : 'text-on-surface')}>
              {title}
            </h3>
            <p className={cn('mt-1 font-body text-xs', featured ? 'text-surface-bright/62' : 'text-on-surface-variant')}>
              {description}
            </p>
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="MorfApp" className="h-5 w-auto opacity-80" />
          ) : (
            <span className="font-body text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {logoText}
            </span>
          )}
        </div>

        <div className="mt-4 w-fit border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary backdrop-blur-xl">
          {price}
        </div>

        <div className="mt-auto pt-6">{children}</div>
      </div>
    </div>
  );
}
