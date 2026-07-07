import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getStoreClosedMessage, buildStorePath, buildStoreUrl } from '@/lib/utils'
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

describe('buildStorePath', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'morfapp.app')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('en un subdominio real de tenant devuelve el path SIN el prefijo /store/{slug} (el proxy ya lo antepuso)', () => {
    expect(buildStorePath('burger', '/success?orderId=1&total=100', 'burger.morfapp.app')).toBe(
      '/success?orderId=1&total=100'
    )
  })

  it('en un subdominio real, el path home ("") se resuelve a "/"', () => {
    expect(buildStorePath('burger', '', 'burger.morfapp.app')).toBe('/')
  })

  it('en un subdominio real de tenant sin path inicial (pre.morfapp.app) también funciona', () => {
    expect(buildStorePath('pre', '/order/abc123', 'pre.morfapp.app')).toBe('/order/abc123')
  })

  it('en localhost devuelve el path completo con el prefijo /store/{slug}', () => {
    expect(buildStorePath('burger', '/success?orderId=1&total=100', 'localhost')).toBe(
      '/store/burger/success?orderId=1&total=100'
    )
  })

  it('en 127.0.0.1 devuelve el path completo con el prefijo /store/{slug}', () => {
    expect(buildStorePath('burger', '/order/abc123', '127.0.0.1')).toBe('/store/burger/order/abc123')
  })

  it('en el dominio raíz sin subdominio (acceso directo por path) devuelve el path completo', () => {
    expect(buildStorePath('burger', '/success', 'morfapp.app')).toBe('/store/burger/success')
  })

  it('en el subdominio admin (no es un tenant) devuelve el path completo con prefijo', () => {
    expect(buildStorePath('burger', '/success', 'admin.morfapp.app')).toBe('/store/burger/success')
  })

  it('agrega "/" al path si no viene con barra inicial', () => {
    expect(buildStorePath('burger', 'success', 'localhost')).toBe('/store/burger/success')
  })
})

describe('buildStoreUrl', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'morfapp.app')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('en un subdominio real arma la URL absoluta sin duplicar el prefijo /store/{slug}', () => {
    expect(
      buildStoreUrl('pre', '/order/abc123', 'pre.morfapp.app', 'https://pre.morfapp.app')
    ).toBe('https://pre.morfapp.app/order/abc123')
  })

  it('en localhost arma la URL absoluta con el prefijo /store/{slug}', () => {
    expect(
      buildStoreUrl('burger', '/order/abc123', 'localhost', 'http://localhost:3000')
    ).toBe('http://localhost:3000/store/burger/order/abc123')
  })
})
