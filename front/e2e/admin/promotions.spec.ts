import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Promociones', () => {
  const ts = () => Date.now().toString()

  test('página de promociones carga correctamente', async ({ page }) => {
    await page.goto('/admin/promotions')
    await expect(page).toHaveURL(/\/admin\/promotions/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón de nueva promoción está disponible', async ({ page }) => {
    await page.goto('/admin/promotions')
    await expect(
      page.locator('button:has-text("Promoción"), button:has-text("Nueva"), button:has-text("Agregar")').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear promoción — camino feliz', async ({ page }) => {
    await page.goto('/admin/promotions')
    const name = `Promo Test ${ts()}`

    const newBtn = page.locator('button:has-text("Promoción"), button:has-text("Nueva"), button:has-text("Agregar")').first()
    await newBtn.click()

    // Modal o formulario debe abrirse
    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"], input[id*="name"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill(name)

    // Descuento
    const discountInput = page.locator('input[placeholder*="descuento"], input[name*="discount"], input[type="number"]').first()
    if (await discountInput.isVisible().catch(() => false)) {
      await discountInput.fill('10')
    }

    await page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first().click()

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8_000 })
  })

  test('crear promoción sin nombre muestra validación', async ({ page }) => {
    await page.goto('/admin/promotions')

    const newBtn = page.locator('button:has-text("Promoción"), button:has-text("Nueva"), button:has-text("Agregar")').first()
    await newBtn.click()

    // Intentar guardar sin nombre
    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    // Debe aparecer algún error o el formulario no debe cerrar
    const errorOrStillOpen = await Promise.race([
      page.locator('text=/obligatorio|requerido|completá/i, [role="alert"]').first().isVisible({ timeout: 3_000 }),
      page.locator('input[placeholder*="nombre"]').first().isVisible({ timeout: 3_000 }),
    ]).catch(() => false)

    expect(errorOrStillOpen).toBe(true)
  })

  test('activar / desactivar promoción', async ({ page }) => {
    await page.goto('/admin/promotions')

    const toggle = page.locator('input[type="checkbox"], button[role="switch"]').first()
    if (!(await toggle.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    const initialChecked = await toggle.isChecked().catch(() => false)
    await toggle.click()
    await page.waitForTimeout(500)

    const newChecked = await toggle.isChecked().catch(() => false)
    expect(newChecked).not.toBe(initialChecked)
  })

  test('eliminar promoción requiere confirmación', async ({ page }) => {
    await page.goto('/admin/promotions')

    const deleteBtn = page
      .locator('button[aria-label*="Eliminar"], button[aria-label*="Delete"], button:has-text("Eliminar")').first()

    if (!(await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await deleteBtn.click()
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    // Cancelar — no debe eliminarse
    await page.locator('button:has-text("Cancelar"), button:has-text("No"), button:has-text("Cancel")').first().click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })
})
