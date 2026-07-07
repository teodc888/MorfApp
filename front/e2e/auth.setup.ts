import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Credenciales del admin de PRE (tenant `pre`). Se pueden sobreescribir por env.
const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@pre.morfapp.app'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin1234!'
const AUTH_FILE      = path.join(__dirname, '.auth/admin.json')

setup('autenticar admin y guardar estado', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/admin/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()

  await page.fill('input[type="email"]',    ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')

  // El login exitoso hace router.replace('/admin/menu') y guarda tokens en localStorage.
  await expect(page).toHaveURL(/\/admin\/menu/, { timeout: 15_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
