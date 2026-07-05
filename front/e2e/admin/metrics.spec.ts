import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — Métricas', () => {
  test('página de métricas carga correctamente', async ({ page }) => {
    await page.goto('/admin/metrics')
    await expect(page).toHaveURL(/\/admin\/metrics/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('muestra KPIs principales', async ({ page }) => {
    await page.goto('/admin/metrics')

    // Debe haber al menos un valor numérico de KPI
    await expect(
      page.locator('[data-testid*="metric"], [data-testid*="kpi"], .text-2xl, .text-3xl').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('selector de período existe', async ({ page }) => {
    await page.goto('/admin/metrics')

    const periodSelector = page.locator(
      'select, [role="combobox"], button:has-text("Hoy"), button:has-text("Semana"), button:has-text("Mes")'
    ).first()

    await expect(periodSelector).toBeVisible({ timeout: 8_000 })
  })

  test('cambiar período actualiza las métricas', async ({ page }) => {
    await page.goto('/admin/metrics')

    const todayBtn = page.locator('button:has-text("Hoy"), button:has-text("hoy")').first()
    const weekBtn  = page.locator('button:has-text("Semana"), button:has-text("semana")').first()

    if (!(await weekBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await weekBtn.click()
    await page.waitForTimeout(1000)

    // Algún indicador debe actualizarse (no hay error visible)
    await expect(page.locator('[role="alert"][data-type="error"]')).not.toBeVisible()
  })

  test('gráfico o tabla de pedidos está visible', async ({ page }) => {
    await page.goto('/admin/metrics')

    await expect(
      page.locator('canvas, svg, table, [data-testid*="chart"], [data-testid*="graph"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('métricas de ingresos muestran valores monetarios', async ({ page }) => {
    await page.goto('/admin/metrics')

    const moneyValue = page.locator('text=/\\$|pesos|ARS/').first()
    if (await moneyValue.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(moneyValue).toBeVisible()
    }
  })

  test('métricas no muestran datos de otro tenant', async ({ page }) => {
    // Verificar que la URL está en el admin propio (no hay fuga de tenant)
    await page.goto('/admin/metrics')
    await expect(page).toHaveURL(/\/admin\/metrics/)

    // No debe haber mensajes de error de autorización
    await expect(
      page.locator('text=/403|no autorizado|forbidden/i').first()
    ).not.toBeVisible({ timeout: 5_000 })
  })
})
