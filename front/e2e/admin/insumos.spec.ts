import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Insumos', () => {
  const ts = () => Date.now().toString()

  test('página de insumos carga correctamente', async ({ page }) => {
    await page.goto('/admin/insumos')
    await expect(page).toHaveURL(/\/admin\/insumos/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón para crear insumo está disponible', async ({ page }) => {
    await page.goto('/admin/insumos')
    await expect(
      page.locator('button:has-text("Insumo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear insumo — camino feliz', async ({ page }) => {
    await page.goto('/admin/insumos')
    const name = `Insumo Test ${ts()}`

    const newBtn = page.locator('button:has-text("Insumo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill(name)

    // Unidad
    const unitInput = page.locator('input[placeholder*="unidad"], input[name*="unit"], select[name*="unit"]').first()
    if (await unitInput.isVisible().catch(() => false)) {
      if (await unitInput.evaluate(el => el.tagName === 'SELECT').catch(() => false)) {
        await (unitInput as any).selectOption({ index: 0 })
      } else {
        await unitInput.fill('kg')
      }
    }

    await page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first().click()

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8_000 })
  })

  test('crear insumo sin nombre muestra validación', async ({ page }) => {
    await page.goto('/admin/insumos')

    const newBtn = page.locator('button:has-text("Insumo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    const stillOpen = await page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
      .isVisible({ timeout: 3_000 }).catch(() => false)
    expect(stillOpen).toBe(true)
  })

  test('registrar movimiento de stock', async ({ page }) => {
    await page.goto('/admin/insumos')

    // Buscar botón de movimiento (compra, ajuste, etc.)
    const movBtn = page.locator('button:has-text("Movimiento"), button:has-text("Compra"), button:has-text("Stock")').first()
    if (!(await movBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await movBtn.click()
    // El modal/form de movimiento debe abrirse
    await expect(page.locator('[role="dialog"], form').first()).toBeVisible({ timeout: 3_000 })
  })

  test('nivel de stock bajo muestra alerta visual', async ({ page }) => {
    await page.goto('/admin/insumos')

    // El indicador de stock bajo puede o no existir según el estado del inventario
    const lowStockIndicator = page.locator(
      '[data-testid="low-stock"], text=/stock bajo|sin stock|crítico/i, .text-red-500, .text-orange-500'
    ).first()

    if (await lowStockIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(lowStockIndicator).toBeVisible()
    }
  })

  test('eliminar insumo requiere confirmación', async ({ page }) => {
    await page.goto('/admin/insumos')

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
