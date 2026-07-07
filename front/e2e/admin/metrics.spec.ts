import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Métricas (lectura)', () => {
  test('la página carga con el dashboard y el acceso a exportar', async ({ page }) => {
    await page.goto('/admin/metrics')
    await expect(page.getByRole('heading', { name: 'Métricas', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /Exportar CSV/ })).toBeVisible()
  })

  test('el panel de exportar métricas se abre y se cierra', async ({ page }) => {
    await page.goto('/admin/metrics')
    await page.getByRole('button', { name: /Exportar CSV/ }).click()

    await expect(page.getByText('Exportar métricas')).toBeVisible()
    await expect(page.getByText('Desde')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Exportar métricas')).toHaveCount(0)
  })
})
