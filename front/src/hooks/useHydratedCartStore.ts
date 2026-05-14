'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'

export function useItemCount() {
  const [itemCount, setItemCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const count = useCartStore.getState().itemCount()
    setItemCount(count)

    const unsubscribe = useCartStore.subscribe(
      (state) => state.items,
      () => {
        setItemCount(useCartStore.getState().itemCount())
      },
    )

    return unsubscribe
  }, [])

  return mounted ? itemCount : 0
}

export function useCartTotal() {
  const [total, setTotal] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const currentTotal = useCartStore.getState().total()
    setTotal(currentTotal)

    const unsubscribe = useCartStore.subscribe(
      (state) => state.items,
      () => {
        setTotal(useCartStore.getState().total())
      },
    )

    return unsubscribe
  }, [])

  return mounted ? total : 0
}
