import { test, expect } from '@playwright/test'
import {
  TENANT,
  gotoStore,
  productCard,
  addProductToCart,
  openCart,
  headerCartButton,
  cartItemCount,
} from '../helpers'

/**
 * Flujos read-only del storefront (NO crean pedidos en la base).
 * Corren contra PRE (https://pre.morfapp.app) donde el proxy sirve el tenant `pre`
 * desde `/`. El checkout que escribe en la DB vive en checkout.spec.ts.
 */
test.describe('Storefront — menú y navegación', () => {
  test('la home carga con el nombre del comercio y el estado de apertura', async ({ page }) => {
    await gotoStore(page)
    await expect(page.getByRole('heading', { name: TENANT.name, level: 1 })).toBeVisible()
    // Badge de estado en el header: "Abierto" o "Cerrado"
    await expect(page.locator('header').getByText(/Abierto|Cerrado/)).toBeVisible()
  })

  test('el menú muestra las categorías y los productos reales con precio', async ({ page }) => {
    await gotoStore(page)

    // Categorías (headings de sección, nivel 2; el emoji va como prefijo del nombre)
    await expect(page.getByRole('heading', { level: 2, name: /Hamburgesas/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Lomito/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Papas/ })).toBeVisible()

    // Productos con su precio (formatPrice → "$5.000")
    const simple = productCard(page, TENANT.productos.hamburgesaSimple.name)
    await expect(simple).toBeVisible()
    await expect(simple).toContainText('5.000')

    await expect(productCard(page, TENANT.productos.lomitoDoble.name)).toContainText('9.000')
  })

  test('abrir un producto muestra su detalle y el botón agregar con el precio', async ({ page }) => {
    await gotoStore(page)
    await productCard(page, TENANT.productos.lomoSimple.name).click()

    const modal = page.getByRole('dialog', { name: TENANT.productos.lomoSimple.name })
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: TENANT.productos.lomoSimple.name })).toBeVisible()
    await expect(modal.getByRole('button', { name: /Agregar.*6\.000/ })).toBeVisible()

    // Cerrar con Escape
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('cambiar la cantidad en el modal actualiza el subtotal del botón', async ({ page }) => {
    await gotoStore(page)
    await productCard(page, TENANT.productos.hamburgesaSimple.name).click()
    const modal = page.getByRole('dialog', { name: TENANT.productos.hamburgesaSimple.name })

    // 1 unidad → $5.000
    await expect(modal.getByRole('button', { name: /Agregar.*5\.000/ })).toBeVisible()
    // 2 unidades → $10.000
    await modal.getByRole('button', { name: 'Aumentar cantidad' }).click()
    await expect(modal.getByRole('button', { name: /Agregar.*10\.000/ })).toBeVisible()
  })
})

test.describe('Storefront — carrito', () => {
  test('agregar un producto incrementa el contador del carrito', async ({ page }) => {
    await gotoStore(page)
    expect(await cartItemCount(page)).toBe(0)

    await addProductToCart(page, TENANT.productos.hamburgesaSimple.name)
    expect(await cartItemCount(page)).toBe(1)

    // La bottom bar "Ver carrito" aparece cuando hay ítems
    await expect(page.getByRole('button', { name: 'Ver carrito' }).last()).toBeVisible()
  })

  test('el carrito suma correctamente el subtotal de varios productos', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.hamburgesaDoble.name) // 8.000
    await addProductToCart(page, TENANT.productos.lomoSimple.name)      // 6.000

    const cart = await openCart(page)
    // En retiro no hay envío: el total del botón confirmar es el subtotal (14.000)
    await cart.getByRole('button', { name: /Retiro/ }).click()
    await expect(cart.getByRole('button', { name: /Confirmar.*14\.000/ })).toBeVisible()
  })

  test('aumentar la cantidad dentro del carrito actualiza el total', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.hamburgesaSimple.name) // 5.000

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Retiro/ }).click()
    await cart.getByRole('button', { name: 'Aumentar cantidad' }).first().click()
    // 2 × 5.000 = 10.000
    await expect(cart.getByRole('button', { name: /Confirmar.*10\.000/ })).toBeVisible()
  })

  test('eliminar el último ítem deja el carrito vacío', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.papasSimples.name)

    const cart = await openCart(page)
    await cart.getByRole('button', { name: 'Quitar del carrito' }).first().click()
    await expect(cart.getByText('Tu carrito está vacío')).toBeVisible()
  })

  test('el carrito persiste tras recargar la página', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomitoDoble.name)
    expect(await cartItemCount(page)).toBe(1)

    await page.reload()
    await expect(page.getByRole('heading', { name: TENANT.name, level: 1 })).toBeVisible()
    // El store (Zustand persist) rehidrata desde localStorage un tick después del reload
    await expect(headerCartButton(page)).toContainText(/1 ítem/, { timeout: 10_000 })
  })
})

test.describe('Storefront — reglas de delivery y pago', () => {
  test('por debajo del mínimo de pedido, el botón muestra el faltante', async ({ page }) => {
    await gotoStore(page)
    // Papas Simples $4.000 < mínimo $5.000 → faltan $1.000
    await addProductToCart(page, TENANT.productos.papasSimples.name)

    const cart = await openCart(page)
    await expect(cart.getByRole('button', { name: /Mínimo.*1\.000/ })).toBeVisible()
  })

  test('en modo delivery se cobra el envío y se puede cambiar a retiro', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomoSimple.name) // 6.000 > mínimo

    const cart = await openCart(page)

    // Modo delivery: subtotal 6.000 + envío 5.000 = total 11.000
    await cart.getByRole('button', { name: /Delivery/ }).click()
    await expect(cart.getByText('Envío')).toBeVisible()
    await expect(cart.getByRole('button', { name: /Confirmar.*11\.000/ })).toBeVisible()

    // Cambiar a retiro: desaparece el campo de dirección y el envío
    await cart.getByRole('button', { name: /Retiro/ }).click()
    await expect(cart.getByPlaceholder(/Dirección/)).toHaveCount(0)
  })

  test('el envío es gratis al superar el umbral de envío gratis', async ({ page }) => {
    await gotoStore(page)
    // Hamburgesa Doble $8.000 × 4 = 32.000 ≥ 30.000 → envío gratis
    await addProductToCart(page, TENANT.productos.hamburgesaDoble.name, { qty: 4 })

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Delivery/ }).click()
    await expect(cart.getByText('Gratis')).toBeVisible()
  })

  test('ofrece los métodos de pago configurados', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomoSimple.name)

    const cart = await openCart(page)
    await expect(cart.getByText('Forma de pago')).toBeVisible()
    await expect(cart.getByRole('button', { name: /Efectivo/ })).toBeVisible()
    await expect(cart.getByRole('button', { name: /Transferencia/ })).toBeVisible()
    await expect(cart.getByRole('button', { name: /Tarjeta/ })).toBeVisible()
  })
})

test.describe('Storefront — validación del checkout', () => {
  test('el botón confirmar está deshabilitado sin nombre y teléfono válidos', async ({ page }) => {
    await gotoStore(page)
    await addProductToCart(page, TENANT.productos.lomoSimple.name) // 6.000 > mínimo

    const cart = await openCart(page)
    await cart.getByRole('button', { name: /Retiro/ }).click()

    const confirm = cart.getByRole('button', { name: /Confirmar/ })
    await expect(confirm).toBeDisabled()

    // Con nombre pero teléfono inválido, sigue deshabilitado
    await cart.getByPlaceholder(/Tu nombre/).fill('Tester E2E')
    await cart.getByPlaceholder(/Teléfono/).fill('123')
    await expect(confirm).toBeDisabled()

    // Teléfono válido (≥8 dígitos) → habilitado
    await cart.getByPlaceholder(/Teléfono/).fill('3511234567')
    await expect(confirm).toBeEnabled()
  })
})
