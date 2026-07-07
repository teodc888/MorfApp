import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

/**
 * Smoke de carga de todas las páginas del panel admin (tenant `pre`, plan Negocio
 * → insumos y proveedores disponibles). Cada página se identifica por un elemento
 * distintivo (heading o botón principal). Solo lectura, no escribe en la DB.
 */
const PAGES: { path: string; heading: string }[] = [
  { path: '/admin/orders',      heading: 'Pedidos' },
  { path: '/admin/metrics',     heading: 'Métricas' },
  { path: '/admin/menu',        heading: 'Carta' },
  { path: '/admin/modifiers',   heading: 'Opciones' },
  { path: '/admin/promotions',  heading: 'Promos' },
  { path: '/admin/proveedores', heading: 'Proveedores' },
  { path: '/admin/insumos',     heading: 'Insumos' },
  { path: '/admin/branding',    heading: 'Apariencia' },
  { path: '/admin/whatsapp',    heading: 'WhatsApp' },
  { path: '/admin/config',      heading: 'Configuración' },
]

test.describe('Admin — Smoke de todas las páginas', () => {
  for (const { path: url, heading } of PAGES) {
    test(`${url} carga y muestra "${heading}"`, async ({ page }) => {
      await page.goto(url)
      await expect(page).toHaveURL(new RegExp(url.replace(/\//g, '\\/')))
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible({ timeout: 12_000 })
    })
  }

  test('el sidebar navega entre secciones', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page.getByRole('heading', { name: 'Pedidos', level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Configuración' }).click()
    await expect(page).toHaveURL(/\/admin\/config/)
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Métricas' }).click()
    await expect(page).toHaveURL(/\/admin\/metrics/)
    await expect(page.getByRole('heading', { name: 'Métricas', level: 1 })).toBeVisible()
  })
})
