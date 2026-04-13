/**
 * useWebSocket.js
 * ───────────────
 * Lightweight React hook for subscribing to websocket events.
 *
 * Usage:
 *   useWebSocket('user:orders', (order) => {
 *     setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
 *   })
 *
 *   const { isConnected, lastUpdate } = useWebSocket('admin:orders', (order) => {
 *     refetchOrders()
 *   })
 */

import { useEffect, useRef, useState } from 'react'
import { websocketService } from '@/services/websocketService'

export function useWebSocket(eventName, handler, enabled = true) {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected)
  const [lastUpdate, setLastUpdate] = useState(null)
  const handlerRef = useRef(handler)

  handlerRef.current = handler

  useEffect(() => {
    if (!enabled || !eventName) return

    const unsubscribeEvent = websocketService.subscribe(eventName, (payload) => {
      setLastUpdate({
        eventName,
        payload,
        at: Date.now(),
      })

      if (typeof handlerRef.current === 'function') {
        handlerRef.current(payload)
      }
    })

    const unsubscribeConnection = websocketService.subscribe(
      'connection:change',
      (value) => {
        setIsConnected(Boolean(value))
      }
    )

    setIsConnected(websocketService.isConnected)

    return () => {
      unsubscribeEvent?.()
      unsubscribeConnection?.()
    }
  }, [eventName, enabled])

  return { isConnected, lastUpdate }
}