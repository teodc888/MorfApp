'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const TOTAL_FRAMES = 192;
const IDLE_FRAMES = 10;   // oscila entre frame 0 y frame 9 en idle
const BG = '#EBEBEB';

const frameUrl = (i: number) =>
  `/secuencia/${String(i).padStart(5, '0')}.png`;

interface Overlay {
  start: number;
  end: number;
  hAlign: 'left' | 'right';
  vAlign: 'top' | 'bottom';
  heading: string;
  body?: string;
  cta?: boolean;
}

const OVERLAYS: Overlay[] = [
  {
    start: 0,
    end: 0.18,
    hAlign: 'left',
    vAlign: 'top',
    heading: 'Tu restaurante,\nonline.',
    body: 'La plataforma que tus clientes van a amar.',
  },
  {
    start: 0.24,
    end: 0.44,
    hAlign: 'right',
    vAlign: 'top',
    heading: 'Menú digital\nen minutos.',
    body: 'Creá tu carta y empezá a recibir pedidos hoy mismo.',
  },
  {
    start: 0.52,
    end: 0.72,
    hAlign: 'left',
    vAlign: 'bottom',
    heading: 'Cada capa,\nperfecta.',
    body: 'Así de detallada es la experiencia que le dás a tus clientes.',
  },
  {
    start: 0.82,
    end: 1.0,
    hAlign: 'right',
    vAlign: 'bottom',
    heading: 'Listo para\ncrecer.',
    cta: true,
  },
];

export function BurgerScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatWrapperRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const scrollRafRef = useRef<number>(0);
  const isIdleRef = useRef(true);

  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<number>(0);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    const img = frames[frameIndex];
    if (!canvas || !img?.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = W / H;

    // cover fit — sin barras
    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgRatio > canvasRatio) {
      drawH = H;
      drawW = H * imgRatio;
      drawX = (W - drawW) / 2;
      drawY = 0;
    } else {
      drawW = W;
      drawH = W / imgRatio;
      drawX = 0;
      drawY = (H - drawH) / 2;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // Preload all frames
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const index = i;
      const onDone = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          framesRef.current = images;
          setLoaded(true);
          // Ensure canvas size is correct after images load
          setTimeout(() => {
            updateCanvasSize();
            requestAnimationFrame(() => drawFrame(0));
          }, 0);
        }
      };
      img.onload = onDone;
      img.onerror = onDone;
      img.src = frameUrl(i + 1);
      images[index] = img;
    }
  }, [drawFrame, updateCanvasSize]);

  // Idle animation: frame oscillation + float bob + mouse parallax
  useEffect(() => {
    if (!loaded) return;

    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let idleRafId: number;
    const startTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 22;
      mouseTargetY = (e.clientY / window.innerHeight - 0.5) * 14;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const animate = (now: number) => {
      const t = (now - startTime) / 1000;

      // Lerp mouse para suavidad
      mouseX += (mouseTargetX - mouseX) * 0.05;
      mouseY += (mouseTargetY - mouseY) * 0.05;

      // Float bob: ±9px, ciclo ~3.5s
      const floatY = Math.sin(t * 1.8) * 9;

      const wrapper = floatWrapperRef.current;
      if (wrapper) {
        wrapper.style.transform = `translate(${mouseX}px, ${floatY + mouseY * 0.45}px)`;
      }

      // Frame oscillation solo en idle (0 → IDLE_FRAMES → 0)
      if (isIdleRef.current && framesRef.current.length > 0) {
        // 0..1 oscilante cada ~2s
        const osc = (Math.sin(t * 3.2) + 1) / 2;
        const frameIndex = Math.round(osc * (IDLE_FRAMES - 1));
        if (frameIndex !== currentFrameRef.current) {
          currentFrameRef.current = frameIndex;
          drawFrame(frameIndex);
        }
      }

      idleRafId = requestAnimationFrame(animate);
    };

    idleRafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(idleRafId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loaded, drawFrame]);

  // Scroll → frame mapping
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container || !framesRef.current.length) return;

      const rect = container.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = rect.height - window.innerHeight;
      const progress = Math.max(0, Math.min(1, scrolled / total));

      // Pasar de idle a scroll cuando el usuario mueve
      isIdleRef.current = progress === 0;

      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(progress * TOTAL_FRAMES)
      );

      if (!isIdleRef.current && frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
      }

      const idx = OVERLAYS.findIndex(
        (o) => progress >= o.start && progress <= o.end
      );
      setActiveOverlay(idx >= 0 ? idx : -1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [drawFrame]);

  // Resize & mount
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
      drawFrame(currentFrameRef.current);
    };

    // Ensure correct size on mount (important for mobile)
    setTimeout(() => handleResize(), 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame, updateCanvasSize]);

  return (
    <div ref={containerRef} style={{ height: '500vh' }}>
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ background: BG }}
      >
        {/* Wrapper que recibe float + parallax via ref */}
        <div ref={floatWrapperRef} className="absolute inset-0 will-change-transform">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ background: BG }}
          />
        </div>

        {/* Loading */}
        {!loaded && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
            style={{ background: BG }}
          >
            <div className="w-8 h-8 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
            <p className="text-black/40 text-sm tracking-widest uppercase">
              Cargando… {loadProgress}%
            </p>
          </div>
        )}

        {/* Overlays */}
        {loaded &&
          OVERLAYS.map((overlay, i) => (
            <OverlayText
              key={i}
              overlay={overlay}
              visible={activeOverlay === i}
            />
          ))}
      </div>
    </div>
  );
}

function OverlayText({
  overlay,
  visible,
}: {
  overlay: Overlay;
  visible: boolean;
}) {
  const hPos =
    overlay.hAlign === 'left'
      ? 'left-8 md:left-14 lg:left-20'
      : 'right-8 md:right-14 lg:right-20';

  const vPos =
    overlay.vAlign === 'top'
      ? 'top-24 md:top-28'
      : 'bottom-10 md:bottom-16';

  const textAlign = overlay.hAlign === 'left' ? 'text-left' : 'text-right';
  const slideY = overlay.vAlign === 'top' ? '-18px' : '18px';

  return (
    <div
      className={`absolute ${vPos} ${hPos} max-w-[260px] md:max-w-sm pointer-events-none z-10`}
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? '0px' : slideY})`,
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div className={`flex flex-col gap-2 md:gap-3 ${textAlign}`}>
        <h2
          className="font-headline font-bold tracking-tight text-black/90 whitespace-pre-line"
          style={{ fontSize: 'clamp(1.4rem, 3vw, 2.75rem)', lineHeight: 1.1 }}
        >
          {overlay.heading}
        </h2>
        {overlay.body && (
          <p className="font-body text-black/55 text-sm md:text-base leading-relaxed">
            {overlay.body}
          </p>
        )}
        {overlay.cta && (
          <a
            href="#pricing"
            className="mt-2 inline-flex items-center justify-center px-7 py-3.5 bg-orange-500 hover:bg-orange-400 text-white rounded-full font-semibold text-base md:text-lg transition-colors shadow-lg shadow-orange-500/25"
          >
            Comenzá gratis
          </a>
        )}
      </div>
    </div>
  );
}
