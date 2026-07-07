import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

/**
 * Lectura de la página de configuración. NO guarda cambios para no alterar la
 * config real del tenant.
 */
test.describe('Admin — Configuración (lectura)', () => {
  test('muestra las secciones y el nombre del local cargado', async ({ page }) => {
    await page.goto('/admin/config')
    await expect(page.getByRole('heading', { name: 'Configuración', level: 1 })).toBeVisible()

    await expect(page.getByText('Mi local', { exact: true })).toBeVisible()
    await expect(page.getByText('Modo de venta', { exact: true })).toBeVisible()
    await expect(page.getByText('Horarios', { exact: true })).toBeVisible()

    // El nombre del local viene precargado
    await expect(page.locator('input.input').first()).toHaveValue('Demo PRE')

    // Botón de guardar presente (sin hacer click, para no alterar la config)
    await expect(page.getByRole('button', { name: /Guardar local/ })).toBeVisible()
  })

  test('el modo de venta "Ambos" muestra costos de envío y retiro', async ({ page }) => {
    await page.goto('/admin/config')
    await expect(page.getByText('Costo de envío')).toBeVisible()
    await expect(page.getByText('Dirección de retiro')).toBeVisible()
    await expect(page.getByText('Pedido mínimo')).toBeVisible()
  })
})
