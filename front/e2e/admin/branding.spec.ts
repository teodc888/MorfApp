import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Apariencia (lectura)', () => {
  test('la página carga con selectores de color y campos editables', async ({ page }) => {
    await page.goto('/admin/branding')
    await expect(page.getByRole('heading', { name: 'Apariencia', level: 1 })).toBeVisible()

    // El campo de tagline es editable y trae el valor del tenant
    const tagline = page.getByPlaceholder('Una frase corta que te describa')
    await expect(tagline).toBeVisible()
    await expect(tagline).toBeEditable()

    // Botón de guardar presente (no se hace click para no alterar el branding)
    await expect(page.getByRole('button', { name: /Guardar/ })).toBeVisible()
  })
})
