import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/admin.json') })

test.describe('Admin — WhatsApp (lectura)', () => {
  test('la página carga con la vista previa y el textarea del template', async ({ page }) => {
    await page.goto('/admin/whatsapp')
    await expect(page.getByRole('heading', { name: 'WhatsApp', level: 1 })).toBeVisible()

    await expect(page.getByText('Vista previa')).toBeVisible()

    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeEditable()

    // Botón de guardar presente (no se hace click para no alterar el template)
    await expect(page.getByRole('button', { name: /Guardar/ })).toBeVisible()
  })
})
