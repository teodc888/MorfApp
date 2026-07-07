import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Opciones / Modificadores (lectura)', () => {
  test('la página carga con su encabezado', async ({ page }) => {
    await page.goto('/admin/modifiers')
    await expect(page.getByRole('heading', { name: 'Opciones', level: 1 })).toBeVisible()
  })

  test('el modal de nuevo grupo expone el campo de nombre y se cierra', async ({ page }) => {
    await page.goto('/admin/modifiers')
    await page.getByRole('button', { name: /Nueva/ }).click()

    await expect(page.getByPlaceholder(/Punto de cocción/)).toBeVisible()

    // Cerrar sin guardar
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByPlaceholder(/Punto de cocción/)).toHaveCount(0)
  })
})
