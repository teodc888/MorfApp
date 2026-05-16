'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 192;
const HERO_BACKGROUND = '#faf5ee';

const frameUrl = (frameNumber: number) =>
  `/hero-sequence/frame_${String(frameNumber).padStart(4, '0')}.png`;

export function BurgerScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatWrapperRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const scrollRafRef = useRef<number>(0);

  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    let img = frames[frameIndex];

    if (!img?.complete || !img.naturalWidth) {
      for (let i = frameIndex - 1; i >= 0; i--) {
        const fallback = frames[i];
        if (fallback?.complete && fallback.naturalWidth) {
          img = fallback;
          break;
        }
      }
    }

    if (!canvas || !img?.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, []);

  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const index = i;
      images[index] = img;

      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));

        if (index === 0) {
          setLoaded(true);
          requestAnimationFrame(() => {
            updateCanvasSize();
            drawFrame(0);
          });
        }
      };

      img.onerror = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
      };

      img.src = frameUrl(i + 1);
    }

    framesRef.current = images;
  }, [drawFrame, updateCanvasSize]);

  useEffect(() => {
    if (!loaded) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let rafId: number;

    const handleMouseMove = (event: MouseEvent) => {
      mouseTargetX = (event.clientX / window.innerWidth - 0.5) * 12;
      mouseTargetY = (event.clientY / window.innerHeight - 0.5) * 8;
    };

    const animate = () => {
      mouseX += (mouseTargetX - mouseX) * 0.045;
      mouseY += (mouseTargetY - mouseY) * 0.045;

      if (floatWrapperRef.current) {
        floatWrapperRef.current.style.transform = `translate(${mouseX}px, ${mouseY * 0.45}px)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loaded]);

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container || !framesRef.current.length) return;

      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));
      const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES));

      if (frameIndex === currentFrameRef.current) return;

      currentFrameRef.current = frameIndex;
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [drawFrame]);

  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
      drawFrame(currentFrameRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame, updateCanvasSize]);

  return (
    <div ref={containerRef} className="h-[300vh]">
      <div
        className="sticky top-0 h-[100svh] w-full overflow-hidden md:h-screen"
        style={{ background: HERO_BACKGROUND }}
      >
        <div ref={floatWrapperRef} className="absolute inset-0 md:-left-[2vw] md:-right-[2vw] will-change-transform">
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            style={{ background: HERO_BACKGROUND }}
          />
        </div>

        {!loaded && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
            style={{ background: HERO_BACKGROUND }}
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/15 border-t-primary/60" />
            <p className="font-body text-sm uppercase tracking-widest text-on-surface-variant/60">
              Cargando...
            </p>
          </div>
        )}

        {loaded && loadProgress < 100 && (
          <div className="absolute inset-x-0 bottom-0 z-20 h-0.5 bg-primary/10">
            <div
              className="h-full bg-primary/45 transition-[width] duration-500"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
