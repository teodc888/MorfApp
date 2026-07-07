import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Proveedores (lectura)', () => {
  test('la página carga con su encabezado', async ({ page }) => {
    await page.goto('/admin/proveedores')
    await expect(page.getByRole('heading', { name: 'Proveedores', level: 1 })).toBeVisible()
  })

  test('el modal de nuevo proveedor expone el campo de nombre y se cierra', async ({ page }) => {
    await page.goto('/admin/proveedores')
    // El botón del header trae un icono ("add Nuevo"), por eso match por substring
    await page.getByRole('button', { name: /Nuevo/ }).first().click()

    await expect(page.getByPlaceholder('Ej: La Huerta Orgánica')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByPlaceholder('Ej: La Huerta Orgánica')).toHaveCount(0)
  })
})
