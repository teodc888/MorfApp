import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Datos reales del tenant de prueba en PRE (slug `pre`, "Demo PRE").
 * Sirven como fixtures para asserts fuertes en los E2E. Si el menú del tenant
 * cambia, actualizar acá. Verificado contra https://api-pre.morfapp.app/api/store/pre.
 */
export const TENANT = {
  slug: 'pre',
  name: 'Demo PRE',
  delivery: {
    mode: 'both' as const,
    deliveryCost: 5000,
    freeDeliveryFrom: 30000,
    minOrderAmount: 5000,
  },
  productos: {
    hamburgesaSimple: { name: 'Hamburgesa Simple', price: 5000 },
    hamburgesaDoble: { name: 'Hamburgesa Doble', price: 8000 },
    lomoSimple: { name: 'Lomo Simple', price: 6000 },
    lomitoDoble: { name: 'Lomito Doble', price: 9000 },
    papasSimples: { name: 'Papas Simples', price: 4000 },
    papasChedar: { name: 'Papas Chedar', price: 9000 },
  },
}

/**
 * Home del storefront. Contra un subdominio de tenant (pre.morfapp.app) el proxy
 * ya reescribe a /store/pre, así que se navega desde `/`. Contra localhost habría
 * que usar `/store/pre`, pero los E2E corren contra PRE por defecto.
 */
export function storeHome(): string {
  return '/'
}

/** Abre la home del store y espera a que cargue el header con el nombre del comercio. */
export async function gotoStore(page: Page): Promise<void> {
  await page.goto(storeHome())
  await expect(page.getByRole('heading', { name: TENANT.name, level: 1 })).toBeVisible()
}

/** Card de producto en el menú, localizado por su nombre visible. */
export function productCard(page: Page, name: string): Locator {
  return page.getByRole('button').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

/**
 * Abre el modal de un producto y lo agrega al carrito.
 * Si el producto tiene modificadores obligatorios, el caller debe seleccionarlos
 * antes vía el callback `beforeAdd`.
 */
export async function addProductToCart(
  page: Page,
  name: string,
  opts: { qty?: number; beforeAdd?: (modal: Locator) => Promise<void> } = {},
): Promise<void> {
  await productCard(page, name).click()
  const modal = page.getByRole('dialog', { name })
  await expect(modal).toBeVisible()

  if (opts.qty && opts.qty > 1) {
    const plus = modal.getByRole('button', { name: 'Aumentar cantidad' })
    for (let i = 1; i < opts.qty; i++) await plus.click()
  }

  if (opts.beforeAdd) await opts.beforeAdd(modal)

  await modal.getByRole('button', { name: /^Agregar/ }).click()
  await expect(modal).not.toBeVisible()
}

/** Botón del carrito en el header (aria-label "Ver carrito"), no el de la bottom bar. */
export function headerCartButton(page: Page): Locator {
  return page.locator('header').getByRole('button', { name: 'Ver carrito' })
}

/** Abre el carrito desde el botón del header. */
export async function openCart(page: Page): Promise<Locator> {
  await headerCartButton(page).click()
  const cart = page.getByRole('dialog', { name: 'Tu pedido' })
  await expect(cart).toBeVisible()
  return cart
}

/** Cuenta de ítems que muestra el botón del carrito en el header, 0 si está vacío. */
export async function cartItemCount(page: Page): Promise<number> {
  const label = await headerCartButton(page).innerText()
  const m = label.match(/(\d+)\s+ítem/)
  return m ? parseInt(m[1], 10) : 0
}
