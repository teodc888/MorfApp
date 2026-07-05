import { test, expect } from '@playwright/test'

test.describe('Admin — Autenticación', () => {
  test('login con credenciales inválidas muestra mensaje de error', async ({ page }) => {
    await page.goto('/admin/login')

    await page.fill('input[type="email"]',    'nadie@no.com')
    await page.fill('input[type="password"]', 'wrongpass123')
    await page.click('button[type="submit"]')

    // Debe aparecer algún mensaje de error — toast o texto en pantalla
    await expect(
      page.locator('text=/credencial|inválid|error/i').first()
    ).toBeVisible({ timeout: 5_000 })

    // Debe quedarse en la página de login
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('login con email vacío no submittea', async ({ page }) => {
    await page.goto('/admin/login')

    await page.fill('input[type="password"]', 'alguna-pass')
    await page.click('button[type="submit"]')

    // No se redirige
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('login exitoso redirige al panel admin', async ({ page }) => {
    const email    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@test.com'
    const password = process.env.E2E_ADMIN_PASSWORD ?? 'Test1234!'

    await page.goto('/admin/login')
    await page.fill('input[type="email"]',    email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/admin**', { timeout: 10_000 })
    await expect(page).not.toHaveURL(/\/admin\/login/)
  })

  test('usuario autenticado que visita /admin/login es redirigido', async ({ page }) => {
    // Este test requiere estar ya autenticado (usa el storageState del setup)
    const email    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@test.com'
    const password = process.env.E2E_ADMIN_PASSWORD ?? 'Test1234!'

    await page.goto('/admin/login')
    await page.fill('input[type="email"]',    email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin**', { timeout: 10_000 })

    // Volver a login — debe redirigir de vuelta al admin
    await page.goto('/admin/login')
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 5_000 })
  })
})
