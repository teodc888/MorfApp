'use client'

import { useEffect, useRef, useState } from 'react'
import type { Category } from '@/types/store'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  categories: Category[]
}

export function CategoryTabs({ categories }: Props) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? '')
  const tabsRef = useRef<HTMLDivElement>(null)
  const isScrollingToRef = useRef(false)

  useEffect(() => {
    const sections = categories.map((cat) =>
      document.getElementById(`category-${cat.id}`),
    )

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToRef.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('category-', '')
            setActiveId(id)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    sections.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [categories])

  const scrollTo = (catId: string) => {
    const el = document.getElementById(`category-${catId}`)
    if (!el) return
    isScrollingToRef.current = true
    setActiveId(catId)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { isScrollingToRef.current = false }, 800)
  }

  // Scroll the tab bar horizontally to center the active pill —
  // uses manual scrollTo on the container instead of scrollIntoView
  // to avoid triggering unintended page scroll on mobile.
  useEffect(() => {
    const container = tabsRef.current
    if (!container) return
    const tabEl = container.querySelector<HTMLElement>(`[data-tab="${activeId}"]`)
    if (!tabEl) return
    const containerRect = container.getBoundingClientRect()
    const tabRect = tabEl.getBoundingClientRect()
    const targetLeft =
      container.scrollLeft + tabRect.left - containerRect.left - (containerRect.width - tabRect.width) / 2
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [activeId])

  return (
    <div className="sticky top-16 z-20 md:hidden" style={{ backgroundColor: STITCH.surface, borderBottom: `1px solid ${STITCH.border}` }}>
      <div
        ref={tabsRef}
        className="flex gap-2 px-4 py-2.5 overflow-x-auto hide-scrollbar max-w-[520px] mx-auto"
        style={{ touchAction: 'pan-x pinch-zoom' }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeId
          return (
            <button
              key={cat.id}
              data-tab={cat.id}
              onClick={() => scrollTo(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                isActive
                ? 'text-white shadow-sm scale-[1.03]'
                : 'hover:bg-gray-100'
              }`}
              style={{ backgroundColor: isActive ? STITCH.primary : '#F4F2FD', color: isActive ? '#FFFFFF' : STITCH.muted }}
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
