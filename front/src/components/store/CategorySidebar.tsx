'use client'

import { useEffect, useRef, useState } from 'react'
import type { Category } from '@/types/store'
import { STITCH } from '@/lib/stitch-theme'

type Props = {
  categories: Category[]
}

export function CategorySidebar({ categories }: Props) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? '')
  const isScrollingToRef = useRef(false)

  useEffect(() => {
    const sections = categories.map((cat) =>
      document.getElementById(`category-${cat.id}`),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToRef.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActiveId(entry.target.id.replace('category-', ''))
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    sections.forEach((el) => { if (el) observer.observe(el) })
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

  return (
    <nav className="rounded-2xl p-2 flex flex-col gap-0.5" style={{ backgroundColor: STITCH.surface, border: `1px solid ${STITCH.border}`, boxShadow: STITCH.shadow }}>
      {categories.map((cat) => {
        const isActive = cat.id === activeId
        return (
          <button
            key={cat.id}
            onClick={() => scrollTo(cat.id)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
              isActive
                ? 'font-semibold'
                : 'font-medium'
              }`}
              style={{ backgroundColor: isActive ? '#FFF1E8' : 'transparent', color: isActive ? STITCH.primary : STITCH.muted }}
            >
            <span className="text-lg w-7 text-center flex-shrink-0">{cat.emoji}</span>
            <span className="flex-1 truncate">{cat.name}</span>
            <span className="text-[11px] rounded-full px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: isActive ? '#FED7AA' : '#F4F2FD', color: isActive ? STITCH.tertiary : STITCH.muted }}>
              {cat.products.length}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
