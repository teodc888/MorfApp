import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/types/store'

type CartState = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (cartId: string) => void
  updateQty: (cartId: string, qty: number) => void
  clear: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),

      removeItem: (cartId) =>
        set((state) => ({ items: state.items.filter((i) => i.cartId !== cartId) })),

      updateQty: (cartId, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.cartId === cartId ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        })),

      clear: () => set({ items: [] }),

      total: () => {
        const { items } = get()
        return items.reduce(
          (sum, item) => sum + ((item.product.finalPrice ?? item.product.price) + item.extraPrice) * item.qty,
          0,
        )
      },

      itemCount: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.qty, 0)
      },
    }),
    {
      name: 'morfapp-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
