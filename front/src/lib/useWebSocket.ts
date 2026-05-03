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
    const token = localStorage.getItem('access_token')
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
        const message: WebSocketMessage = JSON.parse(event.data)
        console.log('[WebSocket] Message:', message)

        if (message.type === 'new_order') {
          // Invalidar queries de órdenes y métricas para refetch automático
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          queryClient.invalidateQueries({ queryKey: ['metrics'] })
        } else if (message.type === 'order_confirmed' || message.type === 'order_cancelled') {
          // Invalidar queries de órdenes y métricas
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          queryClient.invalidateQueries({ queryKey: ['metrics'] })
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
