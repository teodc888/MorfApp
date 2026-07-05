import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'admin@dev.morfapp.app'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin'
const AUTH_FILE      = path.join(__dirname, '.auth/admin.json')

setup('autenticar admin y guardar estado', async ({ page }) => {
  // Crear carpeta si no existe
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/admin/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()

  await page.fill('input[type="email"]',    ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')

  // Esperar redirección al admin
  await page.waitForURL('**/admin**', { timeout: 10_000 })

  // Guardar estado de autenticación para reutilizar
  await page.context().storageState({ path: AUTH_FILE })
})
