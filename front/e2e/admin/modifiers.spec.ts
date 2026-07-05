import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Modificadores', () => {
  const ts = () => Date.now().toString()

  test('página de modificadores carga correctamente', async ({ page }) => {
    await page.goto('/admin/modifiers')
    await expect(page).toHaveURL(/\/admin\/modifiers/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
  })

  test('botón para crear grupo de modificadores está disponible', async ({ page }) => {
    await page.goto('/admin/modifiers')
    await expect(
      page.locator('button:has-text("Grupo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear grupo de modificadores — camino feliz', async ({ page }) => {
    await page.goto('/admin/modifiers')
    const groupName = `Grupo Test ${ts()}`

    const newBtn = page.locator('button:has-text("Grupo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill(groupName)

    await page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first().click()

    await expect(page.locator(`text=${groupName}`)).toBeVisible({ timeout: 8_000 })
  })

  test('crear grupo sin nombre muestra validación', async ({ page }) => {
    await page.goto('/admin/modifiers')

    const newBtn = page.locator('button:has-text("Grupo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await saveBtn.click()

    const stillOpen = await page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
      .isVisible({ timeout: 3_000 }).catch(() => false)
    expect(stillOpen).toBe(true)
  })

  test('agregar opción a un grupo existente', async ({ page }) => {
    await page.goto('/admin/modifiers')

    const editBtn = page
      .locator('button[aria-label*="Edit"], button[aria-label*="editar"], button:has-text("Editar")').first()

    if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await editBtn.click()

    const addOptionBtn = page.locator('button:has-text("Opción"), button:has-text("opción"), button:has-text("Agregar opción")').first()
    if (!(await addOptionBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await addOptionBtn.click()

    // Debe aparecer un campo para el nombre de la opción
    const optionInput = page.locator('input[placeholder*="opción"], input[placeholder*="Opción"]').last()
    await expect(optionInput).toBeVisible({ timeout: 3_000 })
    await optionInput.fill(`Opción ${ts()}`)
  })

  test('tipo Single / Multiple se puede seleccionar', async ({ page }) => {
    await page.goto('/admin/modifiers')

    const newBtn = page.locator('button:has-text("Grupo"), button:has-text("Nuevo"), button:has-text("Agregar")').first()
    await newBtn.click()

    // Debe haber selector de tipo Single/Multiple
    const typeSelect = page.locator('select, [role="combobox"], button:has-text("Single"), button:has-text("Multiple")').first()
    await expect(typeSelect).toBeVisible({ timeout: 5_000 })
  })

  test('eliminar grupo requiere confirmación', async ({ page }) => {
    await page.goto('/admin/modifiers')

    const deleteBtn = page
      .locator('button[aria-label*="Eliminar"], button[aria-label*="Delete"], button:has-text("Eliminar")').first()

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
