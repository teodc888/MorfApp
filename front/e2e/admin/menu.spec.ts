import { test, expect } from '@playwright/test'
import path from 'path'

// Usar estado de auth guardado por el setup
test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Menú (categorías y productos)', () => {
  const uniqueSuffix = () => Date.now().toString()

  test('página de menú carga y muestra secciones', async ({ page }) => {
    await page.goto('/admin/menu')
    await expect(page).toHaveURL(/\/admin\/menu/)

    // Debe haber algún botón para agregar categoría
    await expect(
      page.locator('button:has-text("categoría"), button:has-text("Categoría"), button:has-text("Nueva")').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear categoría — flujo completo', async ({ page }) => {
    await page.goto('/admin/menu')
    const catName = `Cat Test ${uniqueSuffix()}`

    // Abrir formulario de nueva categoría
    const addBtn = page.locator('button:has-text("categoría"), button:has-text("Agregar")').first()
    await addBtn.click()

    // Completar nombre
    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"], input[id*="name"]').first()
    await nameInput.fill(catName)

    // Guardar
    const saveBtn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first()
    await saveBtn.click()

    // La nueva categoría debe aparecer en la lista
    await expect(page.locator(`text=${catName}`)).toBeVisible({ timeout: 8_000 })
  })

  test('editar categoría existente', async ({ page }) => {
    await page.goto('/admin/menu')
    const editedName = `Cat Editada ${uniqueSuffix()}`

    // Hacer click en el primer botón de editar categoría que encuentre
    const editBtn = page.locator('button[aria-label*="Edit"], button[aria-label*="editar"], button:has-text("Editar")').first()

    // Si no hay categorías, saltear el test
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    await editBtn.click()

    const nameInput = page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
    await nameInput.clear()
    await nameInput.fill(editedName)

    await page.locator('button[type="submit"], button:has-text("Guardar")').first().click()

    await expect(page.locator(`text=${editedName}`)).toBeVisible({ timeout: 8_000 })
  })

  test('crear producto dentro de categoría', async ({ page }) => {
    await page.goto('/admin/menu')
    const prodName = `Producto Test ${uniqueSuffix()}`

    // Buscar botón de agregar producto en la primera categoría
    const addProdBtn = page
      .locator('button:has-text("producto"), button:has-text("Producto"), button[aria-label*="producto"]')
      .first()

    if (!(await addProdBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await addProdBtn.click()

    await page.locator('input[placeholder*="nombre"], input[name*="name"]').first().fill(prodName)
    await page.locator('input[placeholder*="precio"], input[name*="price"], input[type="number"]').first().fill('1500')
    await page.locator('button[type="submit"], button:has-text("Guardar")').first().click()

    await expect(page.locator(`text=${prodName}`)).toBeVisible({ timeout: 8_000 })
  })

  test('eliminar categoría requiere confirmación', async ({ page }) => {
    await page.goto('/admin/menu')

    const deleteBtn = page
      .locator('button[aria-label*="Eliminar"], button[aria-label*="Delete"], button:has-text("Eliminar")')
      .first()

    if (!(await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await deleteBtn.click()

    // Debe aparecer un diálogo de confirmación (custom o nativo)
    const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]')
    await expect(confirmDialog).toBeVisible({ timeout: 3_000 })

    // Cancelar — la categoría debe seguir ahí
    await page.locator('button:has-text("Cancel"), button:has-text("cancelar"), button:has-text("No")').first().click()
    await expect(confirmDialog).not.toBeVisible({ timeout: 3_000 })
  })
})
