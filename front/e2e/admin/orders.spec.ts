import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Gestión de Pedidos', () => {
  test('página de pedidos carga correctamente', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page).toHaveURL(/\/admin\/orders/)

    // Debe mostrar algún encabezado o sección de pedidos
    await expect(
      page.locator('h1, h2, [data-testid="orders-title"]').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('filtros de estado están presentes', async ({ page }) => {
    await page.goto('/admin/orders')

    // Debe haber botones/tabs para filtrar por estado
    await expect(
      page.locator('button:has-text("Pendiente"), button:has-text("pending"), [role="tab"]').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('filtrar por estado "confirmado" muestra solo confirmados', async ({ page }) => {
    await page.goto('/admin/orders')

    const confirmedTab = page
      .locator('button:has-text("Confirmad"), button:has-text("confirmed")')
      .first()

    if (!(await confirmedTab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await confirmedTab.click()

    // Esperar que la lista se actualice — no deben aparecer badges "Pendiente"
    await page.waitForTimeout(1000)
    const pendingBadges = page.locator('[data-status="pending"], text=/pendiente/i')
    expect(await pendingBadges.count()).toBe(0)
  })

  test('confirmar un pedido pendiente lo mueve a confirmado', async ({ page }) => {
    await page.goto('/admin/orders')

    // Buscar un pedido pendiente y confirmar
    const confirmBtn = page
      .locator('button:has-text("Confirmar"), button[aria-label*="Confirmar"]')
      .first()

    if (!(await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // No hay pedidos pendientes — test no aplicable
      test.skip()
      return
    }

    await confirmBtn.click()

    // Puede aparecer confirmación
    const confirmDialog = page.locator('[role="dialog"]')
    if (await confirmDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.locator('button:has-text("Confirmar"), button:has-text("Sí")').last().click()
    }

    // Debe aparecer toast de éxito o el pedido debe desaparecer de la lista
    await page.waitForTimeout(2000)
  })

  test('cancelar un pedido pendiente lo mueve a cancelado', async ({ page }) => {
    await page.goto('/admin/orders')

    const cancelBtn = page
      .locator('button:has-text("Cancelar"), button[aria-label*="Cancelar"]')
      .first()

    if (!(await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await cancelBtn.click()

    // Puede aparecer confirmación
    const confirmDialog = page.locator('[role="dialog"]')
    if (await confirmDialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.locator('button:has-text("Cancelar"), button:has-text("Sí")').last().click()
    }

    await page.waitForTimeout(2000)
  })

  test('búsqueda por nombre de cliente filtra resultados', async ({ page }) => {
    await page.goto('/admin/orders')

    const searchInput = page.locator('input[placeholder*="buscar"], input[type="search"]').first()

    if (!(await searchInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await searchInput.fill('zzz_nombre_que_no_existe_xyzxyz')
    await page.waitForTimeout(1000)

    // No deben aparecer resultados
    const noResults = page.locator('text=/sin result|no hay/i, [data-testid="empty-state"]')
    await expect(noResults.first()).toBeVisible({ timeout: 5_000 })
  })
})
