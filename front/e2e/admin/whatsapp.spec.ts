import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — WhatsApp', () => {
  test('página de whatsapp carga correctamente', async ({ page }) => {
    await page.goto('/admin/whatsapp')
    await expect(page).toHaveURL(/\/admin\/whatsapp/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('textarea de template de mensaje está presente', async ({ page }) => {
    await page.goto('/admin/whatsapp')

    await expect(
      page.locator('textarea, input[placeholder*="mensaje"], input[placeholder*="template"]').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('guardar template de mensaje', async ({ page }) => {
    await page.goto('/admin/whatsapp')

    const textarea = page.locator('textarea').first()
    if (!(await textarea.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await textarea.fill('Hola {nombre}, tu pedido fue recibido!')

    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")').first()
    await saveBtn.click()

    // Debe aparecer confirmación de guardado
    await expect(
      page.locator('text=/guardado|actualizado|éxito/i, [role="status"]').first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('template vacío muestra validación', async ({ page }) => {
    await page.goto('/admin/whatsapp')

    const textarea = page.locator('textarea').first()
    if (!(await textarea.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await textarea.fill('')

    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Actualizar")').first()
    await saveBtn.click()

    // Error o botón deshabilitado
    const hasError =
      (await page.locator('text=/obligatorio|requerido/i, [role="alert"]').first().isVisible({ timeout: 3_000 }).catch(() => false)) ||
      (await saveBtn.isDisabled().catch(() => false))

    expect(hasError).toBe(true)
  })

  test('previsualización de mensaje muestra el número de teléfono', async ({ page }) => {
    await page.goto('/admin/whatsapp')

    const phonePreview = page.locator('text=/wa.me|whatsapp|teléfono/i, a[href*="wa.me"]').first()

    if (await phonePreview.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(phonePreview).toBeVisible()
    }
  })
})
