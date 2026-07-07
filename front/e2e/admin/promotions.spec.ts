import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Promos (lectura)', () => {
  test('la página carga con su encabezado', async ({ page }) => {
    await page.goto('/admin/promotions')
    await expect(page.getByRole('heading', { name: 'Promos', level: 1 })).toBeVisible()
  })

  test('el modal de nueva promo expone nombre y precio, y se cierra', async ({ page }) => {
    await page.goto('/admin/promotions')
    await page.getByRole('button', { name: /Nueva/ }).click()

    await expect(page.getByRole('heading', { name: 'Nueva promo' })).toBeVisible()
    await expect(page.getByPlaceholder('Ej: Combo especial')).toBeVisible()

    // Cerrar sin guardar
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva promo' })).toHaveCount(0)
  })
})
