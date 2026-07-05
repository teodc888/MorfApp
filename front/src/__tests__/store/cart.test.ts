import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/store/cart'
import type { CartItem } from '@/types/store'

// Helper para crear un CartItem de prueba
const makeItem = (overrides?: Partial<CartItem>): CartItem => ({
  cartId:     overrides?.cartId     ?? `cart-${Math.random()}`,
  qty:        overrides?.qty        ?? 1,
  extraPrice: overrides?.extraPrice ?? 0,
  selections: overrides?.selections ?? {},
  product:    overrides?.product    ?? {
    id:          'prod-1',
    name:        'Pizza Muzzarella',
    description: null,
    price:       800,
    finalPrice:  null,
    discountPercent: null,
    emoji:       '🍕',
    imageUrl:    null,
    tags:        [],
    modifierGroups: [],
    isOutOfStock: false,
  },
})

describe('useCartStore', () => {
  beforeEach(() => {
    // Reiniciar el store antes de cada test
    useCartStore.setState({ items: [] })
  })

  // ── addItem ────────────────────────────────────────────────────────────────

  it('addItem agrega un item al carrito', () => {
    const item = makeItem({ cartId: 'c1' })
    useCartStore.getState().addItem(item)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cartId).toBe('c1')
  })

  it('addItem puede agregar múltiples items distintos', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1' }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c2' }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c3' }))

    expect(useCartStore.getState().items).toHaveLength(3)
  })

  it('addItem puede agregar el mismo producto dos veces (con cartIds distintos)', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1' }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c1-dup' }))

    expect(useCartStore.getState().items).toHaveLength(2)
  })

  // ── removeItem ─────────────────────────────────────────────────────────────

  it('removeItem elimina el item por cartId', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1' }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c2' }))
    useCartStore.getState().removeItem('c1')

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].cartId).toBe('c2')
  })

  it('removeItem con cartId inexistente no cambia el estado', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1' }))
    useCartStore.getState().removeItem('no-existe')

    expect(useCartStore.getState().items).toHaveLength(1)
  })

  // ── updateQty ──────────────────────────────────────────────────────────────

  it('updateQty actualiza la cantidad del item', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 1 }))
    useCartStore.getState().updateQty('c1', 3)

    expect(useCartStore.getState().items[0].qty).toBe(3)
  })

  it('updateQty con qty 0 elimina el item', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 2 }))
    useCartStore.getState().updateQty('c1', 0)

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updateQty con qty negativa elimina el item', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 1 }))
    useCartStore.getState().updateQty('c1', -1)

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updateQty con cartId inexistente no cambia nada', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 2 }))
    useCartStore.getState().updateQty('no-existe', 5)

    expect(useCartStore.getState().items[0].qty).toBe(2)
  })

  // ── clear ──────────────────────────────────────────────────────────────────

  it('clear vacía el carrito', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1' }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c2' }))
    useCartStore.getState().clear()

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clear en carrito vacío no lanza error', () => {
    expect(() => useCartStore.getState().clear()).not.toThrow()
  })

  // ── total ──────────────────────────────────────────────────────────────────

  it('total calcula precio correcto con precio base', () => {
    // producto sin descuento: price=800, qty=2, extraPrice=0
    useCartStore.getState().addItem(makeItem({ qty: 2, extraPrice: 0 }))
    expect(useCartStore.getState().total()).toBe(1600)
  })

  it('total usa finalPrice cuando está disponible', () => {
    // producto con descuento: finalPrice=640, qty=1
    const item = makeItem({
      qty:        1,
      extraPrice: 0,
      product:    {
        id: 'p1', name: 'X', description: null,
        price: 800, finalPrice: 640, discountPercent: 20,
        emoji: '🍕', imageUrl: null, tags: [], modifierGroups: [],
        isOutOfStock: false,
      },
    })
    useCartStore.getState().addItem(item)
    expect(useCartStore.getState().total()).toBe(640)
  })

  it('total suma extraPrice al precio base', () => {
    // precio base=800, extraPrice=100, qty=1 → 900
    useCartStore.getState().addItem(makeItem({ qty: 1, extraPrice: 100 }))
    expect(useCartStore.getState().total()).toBe(900)
  })

  it('total suma extraPrice a finalPrice si hay descuento', () => {
    // finalPrice=640, extraPrice=50, qty=2 → (640+50)*2 = 1380
    const item = makeItem({
      qty:        2,
      extraPrice: 50,
      product:    {
        id: 'p1', name: 'X', description: null,
        price: 800, finalPrice: 640, discountPercent: 20,
        emoji: '🍕', imageUrl: null, tags: [], modifierGroups: [],
        isOutOfStock: false,
      },
    })
    useCartStore.getState().addItem(item)
    expect(useCartStore.getState().total()).toBe(1380)
  })

  it('total de carrito vacío es 0', () => {
    expect(useCartStore.getState().total()).toBe(0)
  })

  it('total suma múltiples items', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 1, extraPrice: 0 })) // 800
    useCartStore.getState().addItem(makeItem({ cartId: 'c2', qty: 2, extraPrice: 50 })) // (800+50)*2 = 1700
    expect(useCartStore.getState().total()).toBe(2500)
  })

  // ── itemCount ──────────────────────────────────────────────────────────────

  it('itemCount retorna 0 para carrito vacío', () => {
    expect(useCartStore.getState().itemCount()).toBe(0)
  })

  it('itemCount suma las cantidades de todos los items', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 2 }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c2', qty: 3 }))
    expect(useCartStore.getState().itemCount()).toBe(5)
  })

  it('itemCount se actualiza correctamente después de removeItem', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 2 }))
    useCartStore.getState().addItem(makeItem({ cartId: 'c2', qty: 3 }))
    useCartStore.getState().removeItem('c1')
    expect(useCartStore.getState().itemCount()).toBe(3)
  })

  it('itemCount se actualiza después de updateQty', () => {
    useCartStore.getState().addItem(makeItem({ cartId: 'c1', qty: 2 }))
    useCartStore.getState().updateQty('c1', 5)
    expect(useCartStore.getState().itemCount()).toBe(5)
  })
})
