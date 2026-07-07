import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

/**
 * Lectura de la gestión de pedidos. No confirma ni cancela pedidos para no
 * alterar el estado real (eso se cubre indirectamente vía checkout + verificación
 * en la DB).
 */
test.describe('Admin — Pedidos (lectura)', () => {
  test('muestra el header y las pestañas En curso / Historial', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page.getByRole('heading', { name: 'Pedidos', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'En curso' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Historial' })).toBeVisible()
  })

  test('la pestaña Historial expone filtros de estado, búsqueda y orden', async ({ page }) => {
    await page.goto('/admin/orders')
    await page.getByRole('button', { name: 'Historial' }).click()

    await expect(page.getByText('Estado', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('Nombre o teléfono...')).toBeVisible()

    // El select de estado ofrece Entregados / Cancelados
    const estado = page.locator('select').first()
    await expect(estado).toBeVisible()
    await expect(estado.locator('option', { hasText: 'Entregados' })).toHaveCount(1)
    await expect(estado.locator('option', { hasText: 'Cancelados' })).toHaveCount(1)
  })

  test('el panel de exportar CSV se abre y se cierra', async ({ page }) => {
    await page.goto('/admin/orders')
    await page.getByRole('button', { name: /Exportar CSV/ }).click()

    // Aparecen los campos de rango de fechas
    await expect(page.getByText('Desde')).toBeVisible()
    await expect(page.getByText('Hasta')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Desde')).toHaveCount(0)
  })

  test('la búsqueda en historial acepta texto y filtra la lista', async ({ page }) => {
    await page.goto('/admin/orders')
    await page.getByRole('button', { name: 'Historial' }).click()

    const search = page.getByPlaceholder('Nombre o teléfono...')
    await search.fill('zzz-cliente-inexistente-xyz')
    await expect(search).toHaveValue('zzz-cliente-inexistente-xyz')
    // La lista no debe mostrar filas de pedidos para ese término
    await expect(page.locator('text=/#[A-Z0-9]{6}/').first()).toHaveCount(0)
  })
})
