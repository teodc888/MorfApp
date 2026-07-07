import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Carta (lectura)', () => {
  test('muestra las categorías y productos existentes del tenant', async ({ page }) => {
    await page.goto('/admin/menu')
    await expect(page.getByRole('heading', { name: 'Carta', level: 1 })).toBeVisible()

    // Categorías reales del tenant pre
    await expect(page.getByText('Hamburgesas', { exact: true })).toBeVisible()
    await expect(page.getByText('Lomito', { exact: true })).toBeVisible()

    // Un producto con su precio formateado
    await expect(page.getByText('Hamburgesa Doble', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('$8.000').first()).toBeVisible()
  })

  test('el modal de nueva categoría valida que el nombre es obligatorio', async ({ page }) => {
    await page.goto('/admin/menu')
    await page.getByRole('button', { name: /Categoría/ }).click()

    await expect(page.getByRole('heading', { name: 'Nueva categoría' })).toBeVisible()
    // Sin nombre, el botón crear está deshabilitado
    await expect(page.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()

    await page.getByPlaceholder('Ej: Entradas').fill('Prueba')
    await expect(page.getByRole('button', { name: 'Crear categoría' })).toBeEnabled()
  })
})

test.describe('Admin — Carta CRUD @writes-db', () => {
  test('crear una categoría, verla en la lista y eliminarla', async ({ page }) => {
    const catName = `E2E Cat ${Date.now()}`
    await page.goto('/admin/menu')

    // Crear
    await page.getByRole('button', { name: /Categoría/ }).click()
    await expect(page.getByRole('heading', { name: 'Nueva categoría' })).toBeVisible()
    await page.getByPlaceholder('Ej: Entradas').fill(catName)
    await page.getByRole('button', { name: 'Crear categoría' }).click()

    // Aparece en la lista
    await expect(page.getByText(catName, { exact: true })).toBeVisible({ timeout: 10_000 })

    // Eliminar: abrir el menú de la categoría (botón more_horiz de su card)
    const card = page.locator('.card').filter({ hasText: catName })
    await card.getByRole('button', { name: 'more_horiz' }).click()
    await expect(page.getByRole('heading', { name: 'Editar categoría' })).toBeVisible()
    await page.getByRole('button', { name: /Eliminar categoría/ }).click()

    // Confirmar en el diálogo de borrado
    await expect(page.getByRole('heading', { name: /Eliminar categoría/ })).toBeVisible()
    await page.getByRole('button', { name: 'Eliminar', exact: false }).last().click()

    // Ya no está en la lista
    await expect(page.getByText(catName, { exact: true })).toHaveCount(0, { timeout: 10_000 })
  })
})
