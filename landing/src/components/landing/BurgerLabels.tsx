'use client'

import { useEffect, useState, type RefObject } from 'react'

type Props = {
  sectionRef?: RefObject<HTMLElement | null>
}

type Ingredient = {
  id: string
  emoji: string
  name: string
  tag: string
  topPct: number
  threshold: number
  side: 'left' | 'right'
}

// Vertical positions approximate the visual position of each layer
// in the exploded 3D view (camera at z≈4.5, fov=42, centered at y=0)
const INGREDIENTS: Ingredient[] = [
  { id: 'bun-top', emoji: '🍞', name: 'Pan brioche',      tag: 'Artesanal',    topPct: 5,  threshold: 0.68, side: 'right' },
  { id: 'sauce',   emoji: '🫙', name: 'Salsa secreta',     tag: 'House recipe', topPct: 14, threshold: 0.56, side: 'left'  },
  { id: 'lettuce', emoji: '🥬', name: 'Lechuga manteca',   tag: 'Fresca diario',topPct: 27, threshold: 0.46, side: 'right' },
  { id: 'tomato',  emoji: '🍅', name: 'Tomate pera',       tag: 'Temporada',    topPct: 40, threshold: 0.35, side: 'left'  },
  { id: 'onion',   emoji: '🧅', name: 'Cebolla roja',      tag: 'Caramelizada', topPct: 52, threshold: 0.25, side: 'right' },
  { id: 'cheese',  emoji: '🧀', name: 'Cheddar artesanal', tag: 'Importado',    topPct: 63, threshold: 0.16, side: 'left'  },
  { id: 'patty',   emoji: '🥩', name: 'Medallón 300g',     tag: 'Premium',      topPct: 76, threshold: 0.09, side: 'right' },
  { id: 'bun-bot', emoji: '🍞', name: 'Pan de papa',       tag: 'Casero',       topPct: 89, threshold: 0.03, side: 'left'  },
]

export function BurgerLabels({ sectionRef }: Props = {}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const section = sectionRef?.current
      if (section) {
        const rect = section.getBoundingClientRect()
        const denom = Math.max(1, rect.height - window.innerHeight)
        setProgress(Math.min(1, Math.max(0, -rect.top / denom)))
      } else {
        setProgress(Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.85)))
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sectionRef])

  const pillText =
    progress > 0.72 ? '✨ Cada detalle, en tu menú' :
    progress > 0.02 ? '↓ Seguí explorando'         :
                      '↓ Scrolleá para explorar'

  return (
    <>
      {/* Scroll-progress pill */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          padding: '6px 16px',
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.16)',
          fontSize: '11px',
          fontFamily: 'Manrope, sans-serif',
          fontWeight: '600',
          color: 'rgba(255,255,255,0.80)',
          whiteSpace: 'nowrap',
          transition: 'color 0.4s ease',
          letterSpacing: '0.025em',
          pointerEvents: 'none',
        }}
      >
        {pillText}
      </div>

      {/* Ingredient label chips — appear in sequence as burger explodes */}
      {INGREDIENTS.map(ing => {
        const visible = progress >= ing.threshold
        const isRight = ing.side === 'right'
        return (
          <div
            key={ing.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: `${ing.topPct}%`,
              [isRight ? 'right' : 'left']: '8px',
              transform: `translateX(${visible ? '0px' : (isRight ? '18px' : '-18px')}) translateY(-50%)`,
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.40s ease, transform 0.40s cubic-bezier(0.22,1,0.36,1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px 5px 8px',
              background: 'rgba(12, 8, 4, 0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '22px',
              border: '1px solid rgba(255,255,255,0.10)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 25,
            }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{ing.emoji}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.25' }}>
              <span style={{ fontSize: '10px', fontFamily: 'Manrope, sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>
                {ing.name}
              </span>
              <span style={{ fontSize: '8.5px', fontFamily: 'Manrope, sans-serif', fontWeight: 700, color: '#e09050', letterSpacing: '0.06em' }}>
                {ing.tag.toUpperCase()}
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}
