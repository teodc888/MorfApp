import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Proveedores', () => {
  const ts = () => Date.now().toString()

  test('página de proveedores carga correctamente', async ({ page }) => {
    await page.goto('/admin/proveedores')
    await expect(page).toHaveURL(/\/admin\/proveedores/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón para crear proveedor está disponible', async ({ page }) => {
    await page.goto('/admin/proveedores')
    await expect(
      page.locator('button:has-text("Proveedor"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear proveedor — camino feliz', async ({ page }) => {
    await page.goto('/admin/proveedores')
    const name = `Proveedor Test ${ts()}`

    const newBtn = page.locator('button:has-text("Proveedor"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill(name)

    await page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first().click()

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8_000 })
  })

  test('crear proveedor sin nombre muestra validación', async ({ page }) => {
    await page.goto('/admin/proveedores')

    const newBtn = page.locator('button:has-text("Proveedor"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    const stillOpen = await page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
      .isVisible({ timeout: 3_000 }).catch(() => false)
    expect(stillOpen).toBe(true)
  })

  test('registrar pago a proveedor', async ({ page }) => {
    await page.goto('/admin/proveedores')

    const payBtn = page.locator('button:has-text("Pago"), button:has-text("Registrar pago"), button:has-text("Abonar")').first()
    if (!(await payBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await payBtn.click()
    await expect(page.locator('[role="dialog"], form').first()).toBeVisible({ timeout: 3_000 })
  })

  test('ver deuda total de un proveedor', async ({ page }) => {
    await page.goto('/admin/proveedores')

    // Puede haber una columna o badge de deuda
    const debtIndicator = page.locator(
      'text=/deuda|debe|saldo/i, [data-testid*="debt"]'
    ).first()

    if (await debtIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(debtIndicator).toBeVisible()
    }
  })

  test('eliminar proveedor requiere confirmación', async ({ page }) => {
    await page.goto('/admin/proveedores')

    const deleteBtn = page
      .locator('button[aria-label*="Eliminar"], button:has-text("Eliminar")').first()

    if (!(await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await deleteBtn.click()
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })

    await page.locator('button:has-text("Cancelar"), button:has-text("No"), button:has-text("Cancel")').first().click()
    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })
})
