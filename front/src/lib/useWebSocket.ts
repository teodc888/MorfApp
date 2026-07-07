import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type WebSocketEventType = 'new_order' | 'order_confirmed' | 'order_cancelled' | 'order_preparing' | 'order_ready' | 'order_delivered'

interface WebSocketMessage {
  type: WebSocketEventType
  data?: Record<string, unknown>
}

export type NewOrderPayload = { orderId?: string; customerName?: string | null; totalPrice?: number }

export type UseWebSocketOptions = {
  onNewOrder?: (data: NewOrderPayload) => void
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const onNewOrderRef = useRef<UseWebSocketOptions['onNewOrder']>(options?.onNewOrder)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disposedRef = useRef(false)

  useEffect(() => {
    onNewOrderRef.current = options?.onNewOrder
  })

  const connect = useCallback(() => {
    const token = localStorage.getItem('morf_access_token')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const apiHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?/, protocol) ?? `${protocol}://${window.location.host}`
    const wsUrl = `${apiHost}/ws?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // conectado
    }

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as { type?: string; Type?: string; data?: Record<string, unknown>; Data?: Record<string, unknown> }
        // Handle both camelCase and PascalCase from backend
        const message: WebSocketMessage = {
          type: (raw.type || raw.Type) as WebSocketEventType,
          data: raw.data || raw.Data
        }

        if (message.type === 'new_order') {
          // Refetch ALL orders queries - same as clicking "Actualizar" button
          queryClient.refetchQueries({ queryKey: ['orders'] })
          queryClient.refetchQueries({ queryKey: ['metrics'] })

          onNewOrderRef.current?.((message.data ?? {}) as NewOrderPayload)
        } else if (
          message.type === 'order_confirmed' ||
          message.type === 'order_cancelled' ||
          message.type === 'order_preparing' ||
          message.type === 'order_ready' ||
          message.type === 'order_delivered'
        ) {
          // Refetch immediately, just like the button would
          queryClient.refetchQueries({ queryKey: ['orders'] })
          queryClient.refetchQueries({ queryKey: ['metrics'] })
        }
      } catch (e) {
        console.error('[WebSocket] Parse error:', e)
      }
    }

    ws.onclose = () => {
      // Reconectar después de 3 segundos, salvo que el componente ya se haya desmontado
      if (!disposedRef.current) {
        // eslint-disable-next-line react-hooks/immutability
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }

    wsRef.current = ws
  }, [queryClient])

  useEffect(() => {
    disposedRef.current = false
    connect()

    return () => {
      disposedRef.current = true

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      const ws = wsRef.current
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
    }
  }, [connect])
}
