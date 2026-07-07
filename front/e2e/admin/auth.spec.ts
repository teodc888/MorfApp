import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '../.auth/admin.json')

test.describe('Admin — Autenticación (sin sesión previa)', () => {
  // Estos tests corren con un contexto limpio (sin el storageState del setup).
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login con credenciales inválidas muestra error y no redirige', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', 'nadie@no.com')
    await page.fill('input[type="password"]', 'wrongpass123')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/Email o contraseña incorrectos/i)).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('el email es obligatorio (validación HTML5 impide submit)', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[type="password"]', 'alguna-pass')
    await page.click('button[type="submit"]')

    // El input required de email bloquea el submit → seguimos en login
    await expect(page).toHaveURL(/\/admin\/login/)
    const emailInvalid = await page.locator('input[type="email"]').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    )
    expect(emailInvalid).toBe(true)
  })

  test('una ruta protegida sin sesión redirige al login', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 })
  })
})

test.describe('Admin — Autenticación (con sesión)', () => {
  test.use({ storageState: AUTH_FILE })

  test('login exitoso deja entrar al panel', async ({ page }) => {
    await page.goto('/admin/menu')
    await expect(page).toHaveURL(/\/admin\/menu/)
    await expect(page.getByText('Administración')).toBeVisible()
  })

  test('un usuario autenticado que visita /admin/login es llevado al panel', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page).toHaveURL(/\/admin\/menu/, { timeout: 10_000 })
  })
})
