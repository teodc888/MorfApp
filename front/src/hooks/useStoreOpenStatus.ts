'use client'

import { useEffect, useRef, useState } from 'react'

// Mantiene el estado "abierto/cerrado" de la tienda al día en tiempo real,
// conectando al mismo WS que usa el admin pero sin JWT (identificado por slug).
// El backend solo empuja acá el evento store_status — nunca datos de pedidos.
export function useStoreOpenStatus(slug: string, initialIsOpen: boolean): boolean {
  const [isOpen, setIsOpen] = useState(initialIsOpen)
  const disposedRef = useRef(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    disposedRef.current = false

    const connect = () => {
      if (disposedRef.current) return

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const apiHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?/, protocol) ?? `${protocol}://${window.location.host}`
      const ws = new WebSocket(`${apiHost}/ws?tenantSlug=${encodeURIComponent(slug)}`)

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as { type?: string; Type?: string; data?: { isOpen?: boolean }; Data?: { isOpen?: boolean } }
          const type = raw.type || raw.Type
          const data = raw.data || raw.Data
          if (type === 'store_status' && typeof data?.isOpen === 'boolean') {
            setIsOpen(data.isOpen)
          }
        } catch {
          // mensaje no parseable, ignorar
        }
      }

      ws.onclose = () => {
        if (!disposedRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      disposedRef.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      const ws = wsRef.current
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
    }
  }, [slug])

  return isOpen
}
