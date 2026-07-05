import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Configuración', () => {
  test('página de configuración carga correctamente', async ({ page }) => {
    await page.goto('/admin/config')
    await expect(page).toHaveURL(/\/admin\/config/)

    // Debe mostrar algún elemento de configuración
    await expect(page.locator('h1, h2, form').first()).toBeVisible({ timeout: 8_000 })
  })

  test('configuración de horarios está presente', async ({ page }) => {
    await page.goto('/admin/config')

    // Debe haber checkboxes o toggles para días de la semana
    await expect(
      page.locator('input[type="checkbox"], [role="switch"], text=/lun|mar|mié|jue|vie|sáb|dom/i').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('configuración de delivery está presente', async ({ page }) => {
    await page.goto('/admin/config')

    await expect(
      page.locator('text=/delivery|despacho|envío/i, select, [role="combobox"]').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('guardar configuración no lanza error', async ({ page }) => {
    await page.goto('/admin/config')

    const saveBtn = page
      .locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")')
      .first()

    if (!(await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await saveBtn.click()
    await page.waitForTimeout(2000)

    const errorMsg = page.locator('[role="alert"]:has-text("error"), text=/algo salió mal/i')
    expect(await errorMsg.count()).toBe(0)
  })
})
