import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Branding', () => {
  test('página de branding carga correctamente', async ({ page }) => {
    await page.goto('/admin/branding')
    await expect(page).toHaveURL(/\/admin\/branding/)

    // Debe mostrar campos de color o logo
    await expect(
      page.locator('input[type="color"], input[placeholder*="color"], text=/color/i').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('campos de branding son editables', async ({ page }) => {
    await page.goto('/admin/branding')

    // Debe haber algún input de texto (tagline, emoji, etc.)
    const textInput = page.locator('input[type="text"], textarea').first()
    await expect(textInput).toBeVisible({ timeout: 8_000 })
    await expect(textInput).toBeEditable()
  })

  test('guardar cambios de branding no lanza error', async ({ page }) => {
    await page.goto('/admin/branding')

    const saveBtn = page
      .locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")')
      .first()

    await expect(saveBtn).toBeVisible({ timeout: 8_000 })
    await saveBtn.click()

    // No debe aparecer mensaje de error
    await page.waitForTimeout(2000)
    const errorMsg = page.locator('text=/error/i, [role="alert"]')
    expect(await errorMsg.count()).toBe(0)
  })
})
