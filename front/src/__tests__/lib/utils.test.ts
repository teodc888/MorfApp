import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getStoreClosedMessage } from '@/lib/utils'
import type { BusinessHour } from '@/types/store'

// 2026-07-06T12:00:00Z corresponde a 2026-07-06 09:00 en America/Argentina/Buenos_Aires (UTC-3),
// que es un día Lunes (dayOfWeek = 1).
const FIXED_MONDAY_09_00_UTC = '2026-07-06T12:00:00Z'

describe('getStoreClosedMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hoy cierra pero abre más tarde el mismo día', () => {
    vi.setSystemTime(new Date(FIXED_MONDAY_09_00_UTC))

    const businessHours: BusinessHour[] = [
      { dayOfWeek: 1, isOpen: true, opensAt: '10:00', closesAt: '23:00' },
    ]

    expect(getStoreClosedMessage(businessHours)).toBe(
      'Cerrado ahora — abrimos hoy a las 10:00'
    )
  })

  it('hoy ya no abre pero mañana sí', () => {
    vi.setSystemTime(new Date(FIXED_MONDAY_09_00_UTC))

    const businessHours: BusinessHour[] = [
      { dayOfWeek: 1, isOpen: true, opensAt: '08:00', closesAt: '23:00' },
      { dayOfWeek: 2, isOpen: true, opensAt: '11:00', closesAt: '23:00' },
    ]

    expect(getStoreClosedMessage(businessHours)).toBe(
      'Cerrado ahora — abrimos mañana a las 11:00'
    )
  })

  it('los próximos días están cerrados pero el N-ésimo día tiene isOpen true', () => {
    vi.setSystemTime(new Date(FIXED_MONDAY_09_00_UTC))

    // Hoy es Lunes (dayOfWeek 1). Solo el Jueves (dayOfWeek 4, offset 3) está abierto.
    const businessHours: BusinessHour[] = [
      { dayOfWeek: 4, isOpen: true, opensAt: '09:30', closesAt: '23:00' },
    ]

    expect(getStoreClosedMessage(businessHours)).toBe(
      'Cerrado ahora — abrimos el Jueves a las 09:30'
    )
  })

  it('devuelve el fallback genérico cuando todos los días están cerrados', () => {
    vi.setSystemTime(new Date(FIXED_MONDAY_09_00_UTC))

    const businessHours: BusinessHour[] = [
      { dayOfWeek: 0, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 1, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 2, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 3, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 4, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 5, isOpen: false, opensAt: null, closesAt: null },
      { dayOfWeek: 6, isOpen: false, opensAt: null, closesAt: null },
    ]

    expect(getStoreClosedMessage(businessHours)).toBe('Cerrado ahora')
  })
})
