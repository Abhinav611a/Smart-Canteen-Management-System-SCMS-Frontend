/**
 * useWebSocket.js
 * ───────────────
 * React hook that subscribes to real-time order updates via WebSocket.
 *
 * - Connects the STOMP client on mount (with JWT from localStorage)
 * - Calls onOrderUpdate(order) whenever an order status changes on the backend
 * - Disconnects cleanly on unmount
 *
 * Usage:
 *   const { isConnected } = useWebSocket({
 *     onOrderUpdate: (order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o))
 *   })
 */

import { useEffect, useState, useRef } from 'react'
import { websocketService } from '@/services/websocketService'

export function useWebSocket({ onOrderUpdate, enabled = true } = {}) {
  const [isConnected, setIsConnected]  = useState(false)
  const [lastUpdate,  setLastUpdate]   = useState(null)
  const callbackRef = useRef(onOrderUpdate)
  callbackRef.current = onOrderUpdate  // keep ref current without re-subscribing

  useEffect(() => {
    if (!enabled) return

    // Connect with current JWT
    const token = localStorage.getItem('canteen_jwt')
    websocketService.connect(token)

    // Poll connection state (STOMP doesn't expose events easily)
    const pollInterval = setInterval(() => {
      setIsConnected(websocketService.isConnected)
    }, 1000)

    // Subscribe to order updates
    const unsub = websocketService.subscribeToOrders((order) => {
      setLastUpdate({ order, at: Date.now() })
      callbackRef.current?.(order)
    })

    // Initial state
    setIsConnected(websocketService.isConnected)

    return () => {
      clearInterval(pollInterval)
      unsub()
      // Don't disconnect here — service is shared; other components may still be listening
    }
  }, [enabled])

  return { isConnected, lastUpdate }
}
