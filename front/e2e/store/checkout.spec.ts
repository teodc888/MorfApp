import { test, expect } from '@playwright/test'
import { TENANT, gotoStore, addProductToCart, openCart } from '../helpers'

/**
 * Flujo completo de checkout — CREA PEDIDOS REALES en la base que usa la API de PRE.
 * Marcados con @writes-db para poder excluirlos:
 *   npx playwright test --grep-invert @writes-db   (no toca la DB)
 *   npx playwright test --grep @writes-db           (solo estos)
 *
 * Cada pedido usa un nombre único ("E2E <timestamp>") para localizarlo luego en la DB.
 */
test.describe('Checkout @writes-db', () => {
  test('pedido con retiro en local se guarda y redirige a la confirmación', async ({ page }) => {
    const customerName = `E2E Pickup ${Date.now()}`

    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.hamburgesaDoble.name) // 8.000 > mínimo

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Retiro/ }).click()
    await cart.getByPlaceholder(/Tu nombre/).fill(customerName)
    await cart.getByPlaceholder(/Teléfono/).fill('3511234567')
    await cart.getByRole('button', { name: /Efectivo/ }).click()

    const confirm = cart.getByRole('button', { name: /Confirmar/ })
    await expect(confirm).toBeEnabled()
    await confirm.click()

    // Redirige a /success con el orderId real generado por el backend
    await expect(page).toHaveURL(/\/success\?orderId=/, { timeout: 20_000 })
    const orderId = new URL(page.url()).searchParams.get('orderId')
    expect(orderId).toBeTruthy()

    // La página de éxito muestra el total y el acceso al seguimiento
    await expect(page.getByRole('heading', { name: /Pedido enviado/ })).toBeVisible()
    await expect(page.getByText('8.000')).toBeVisible()
    await expect(page.getByRole('link', { name: /Seguir mi pedido/ })).toBeVisible()

    // Registrar el orderId para la verificación posterior en la DB
    test.info().annotations.push({ type: 'orderId', description: `${orderId} | ${customerName}` })
  })

  test('el seguimiento del pedido muestra el estado inicial y el detalle', async ({ page }) => {
    const customerName = `E2E Track ${Date.now()}`

    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomoSimple.name) // 6.000 > mínimo

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Retiro/ }).click()
    await cart.getByPlaceholder(/Tu nombre/).fill(customerName)
    await cart.getByPlaceholder(/Teléfono/).fill('3511234567')
    await cart.getByRole('button', { name: /Efectivo/ }).click()
    await cart.getByRole('button', { name: /Confirmar/ }).click()

    await expect(page).toHaveURL(/\/success\?orderId=/, { timeout: 20_000 })
    const orderId = new URL(page.url()).searchParams.get('orderId')!

    // Ir al seguimiento
    await page.getByRole('link', { name: /Seguir mi pedido/ }).click()
    await expect(page).toHaveURL(new RegExp(`/order/${orderId}`), { timeout: 15_000 })

    // Timeline con el estado inicial "Pendiente" y el detalle del pedido
    await expect(page.getByRole('heading', { name: /Seguimiento de tu pedido/ })).toBeVisible()
    await expect(page.getByText('Pendiente')).toBeVisible()
    await expect(page.getByText(TENANT.productos.lomoSimple.name)).toBeVisible()
    await expect(page.getByText(customerName)).toBeVisible()

    test.info().annotations.push({ type: 'orderId', description: `${orderId} | ${customerName}` })
  })

  test('pedido con delivery exige dirección y suma el envío al total', async ({ page }) => {
    const customerName = `E2E Delivery ${Date.now()}`

    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomoSimple.name) // 6.000

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Delivery/ }).click()

    // Sin dirección el confirmar está deshabilitado
    await cart.getByPlaceholder(/Tu nombre/).fill(customerName)
    await cart.getByPlaceholder(/Teléfono/).fill('3511234567')
    const confirm = cart.getByRole('button', { name: /Confirmar/ })
    await expect(confirm).toBeDisabled()

    // Con dirección → habilitado; total incluye envío (6.000 + 5.000 = 11.000)
    await cart.getByPlaceholder(/Dirección/).fill('Av. Siempre Viva 742')
    await expect(confirm).toBeEnabled()
    await expect(confirm).toContainText('11.000')
    await confirm.click()

    await expect(page).toHaveURL(/\/success\?orderId=/, { timeout: 20_000 })
    const orderId = new URL(page.url()).searchParams.get('orderId')
    expect(orderId).toBeTruthy()
    await expect(page.getByText('11.000')).toBeVisible()

    test.info().annotations.push({ type: 'orderId', description: `${orderId} | ${customerName}` })
  })
})
