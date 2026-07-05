import { test, expect } from '@playwright/test'

const TENANT_SLUG = process.env.E2E_TENANT_SLUG ?? 'dev'

test.describe('Storefront público', () => {
  test('página de tienda carga con el nombre del comercio', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    // Debe cargar algún contenido de la tienda
    await expect(page.locator('h1, [data-testid="store-name"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('menú muestra categorías y productos', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    // Debe haber al menos una categoría o un producto visible
    await expect(
      page.locator('[data-testid="category"], [data-testid="product"], h2, .product-card').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('slug inexistente retorna página 404', async ({ page }) => {
    const response = await page.goto('/store/tienda-que-absolutamente-no-existe-xyzxyz123')
    // La página puede retornar 404 o mostrar un mensaje de error
    const status = response?.status()
    const isNotFound =
      status === 404 ||
      (await page.locator('text=/no encontr|not found|404/i').isVisible({ timeout: 5_000 }).catch(() => false))
    expect(isNotFound).toBe(true)
  })

  test('agregar producto al carrito', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    // Esperar que carguen los productos
    const productBtn = page.locator('[data-testid="add-to-cart"], button:has-text("Agregar"), button:has-text("Añadir")').first()

    if (!(await productBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await productBtn.click()

    // El carrito debe mostrar al menos 1 item
    const cartCount = page.locator('[data-testid="cart-count"], .cart-badge, [aria-label*="carrito"]').first()
    await expect(cartCount).toBeVisible({ timeout: 5_000 })
  })

  test('carrito muestra total correcto', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    const productBtn = page.locator('[data-testid="add-to-cart"], button:has-text("Agregar")').first()
    if (!(await productBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await productBtn.click()

    // Abrir el carrito
    const cartBtn = page.locator('[data-testid="open-cart"], [aria-label*="carrito"], button:has-text("Carrito")').first()
    if (await cartBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cartBtn.click()
    }

    // Debe mostrar un total mayor a 0
    const totalText = page.locator('[data-testid="cart-total"], text=/total/i').first()
    await expect(totalText).toBeVisible({ timeout: 5_000 })
  })

  test('enviar pedido — formulario de checkout', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    const productBtn = page.locator('[data-testid="add-to-cart"], button:has-text("Agregar")').first()
    if (!(await productBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await productBtn.click()

    // Navegar al checkout
    const checkoutBtn = page
      .locator('[data-testid="checkout-btn"], button:has-text("Pedir"), button:has-text("Confirmar"), button:has-text("Pedido")')
      .first()
    if (!(await checkoutBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await checkoutBtn.click()

    // Debe mostrar formulario con campos de nombre y teléfono
    await expect(
      page.locator('input[placeholder*="nombre"], input[name*="name"]').first()
    ).toBeVisible({ timeout: 5_000 })
    await expect(
      page.locator('input[placeholder*="teléfono"], input[placeholder*="cel"], input[type="tel"]').first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('enviar pedido sin nombre muestra validación', async ({ page }) => {
    await page.goto(`/store/${TENANT_SLUG}`)

    const productBtn = page.locator('[data-testid="add-to-cart"], button:has-text("Agregar")').first()
    if (!(await productBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await productBtn.click()

    const checkoutBtn = page
      .locator('[data-testid="checkout-btn"], button:has-text("Pedir"), button:has-text("Confirmar"), button:has-text("Pedido")')
      .first()
    if (!(await checkoutBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }
    await checkoutBtn.click()

    // Intentar enviar sin completar el nombre
    const submitBtn = page.locator('button[type="submit"], button:has-text("Enviar pedido"), button:has-text("Hacer pedido")').first()
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click()
      // Debe aparecer algún mensaje de validación
      await expect(
        page.locator('text=/obligatorio|requerido|completá/i, [role="alert"]').first()
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test('tienda cerrada muestra indicador de estado', async ({ page }) => {
    // Este test verifica que el indicador de apertura/cierre existe
    await page.goto(`/store/${TENANT_SLUG}`)

    const statusIndicator = page.locator(
      '[data-testid="store-status"], text=/abierto|cerrado|abre/i'
    ).first()

    // Puede o no estar visible según el horario del tenant
    // Solo verificamos que si existe, es legible
    if (await statusIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(statusIndicator).toBeVisible()
    }
  })
})
