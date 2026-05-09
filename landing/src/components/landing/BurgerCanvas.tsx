'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState, type RefObject } from 'react'
import dynamic from 'next/dynamic'
import { ACESFilmicToneMapping } from 'three'
import { BurgerScene } from './BurgerScene'

const BurgerEffects = dynamic(() => import('./BurgerEffects'), { ssr: false })

type Props = {
  fullBleed?: boolean
  sectionRef?: RefObject<HTMLElement | null>
}

export function BurgerCanvas({ fullBleed = false, sectionRef }: Props) {
  const [enableFX, setEnableFX] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    setEnableFX(!reduceMotion && !isMobile)
  }, [])

  const wrapperStyle = fullBleed
    ? {
        position: 'absolute' as const,
        inset: 0,
        width: '100%',
        height: '100%',
        background:
          'radial-gradient(ellipse 70% 80% at 75% 55%, #fff1de 0%, #faf5ee 60%, #f3eadc 100%)',
      }
    : {
        width: '100%',
        height: 'clamp(360px, 52vw, 560px)',
        position: 'relative' as const,
        background:
          'radial-gradient(ellipse 80% 70% at 50% 55%, #fff1de 0%, #faf5ee 100%)',
        borderRadius: '20px',
        overflow: 'hidden' as const,
      }

  return (
    <div style={wrapperStyle}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.18, 3.2], fov: fullBleed ? 42 : 44 }}
        performance={{ min: 0.5 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
        }}
      >
        <Suspense fallback={null}>
          <BurgerScene sectionRef={sectionRef} fullBleed={fullBleed} />
          {enableFX && <BurgerEffects />}
        </Suspense>
      </Canvas>
    </div>
  )
}
