import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type WebSocketEventType = 'new_order' | 'order_confirmed' | 'order_cancelled'

interface WebSocketMessage {
  type: WebSocketEventType
  data?: Record<string, unknown>
}

export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('morf_access_token')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const apiHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?/, protocol) ?? `${protocol}://${window.location.host}`
    const wsUrl = `${apiHost}/ws?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as any
        // Handle both camelCase and PascalCase from backend
        const message: WebSocketMessage = {
          type: (raw.type || raw.Type) as WebSocketEventType,
          data: raw.data || raw.Data
        }
        console.log('[WebSocket] Message received:', message.type)

        if (message.type === 'new_order') {
          console.log('[WebSocket] new_order - refetching all orders queries (same as Actualizar button)')

          // Refetch ALL orders queries - same as clicking "Actualizar" button
          queryClient.refetchQueries({ queryKey: ['orders'] })

          console.log('[WebSocket] new_order - refetching metrics')
          queryClient.refetchQueries({ queryKey: ['metrics'] })
        } else if (message.type === 'order_confirmed' || message.type === 'order_cancelled') {
          console.log('[WebSocket] order status change:', message.type)

          // Refetch immediately, just like the button would
          queryClient.refetchQueries({ queryKey: ['orders'] })
          queryClient.refetchQueries({ queryKey: ['metrics'] })
        }
      } catch (e) {
        console.error('[WebSocket] Parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected')
      // Reconectar después de 3 segundos
      setTimeout(connect, 3000)
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }

    wsRef.current = ws
  }, [queryClient])

  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [connect])
}
