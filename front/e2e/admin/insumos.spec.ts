import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Insumos (lectura)', () => {
  test('la página carga con el resumen de stock', async ({ page }) => {
    await page.goto('/admin/insumos')
    await expect(page.getByRole('heading', { name: 'Insumos', level: 1 })).toBeVisible()
    await expect(page.getByText('Stock Total')).toBeVisible()
  })

  test('el modal de nuevo insumo expone el campo de nombre y se cierra', async ({ page }) => {
    await page.goto('/admin/insumos')
    await page.getByRole('button', { name: 'Nuevo', exact: true }).click()

    await expect(page.getByPlaceholder('Nombre del insumo')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByPlaceholder('Nombre del insumo')).toHaveCount(0)
  })
})
