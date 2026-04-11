/**
 * useOrders.js
 * ─────────────
 * Fetches orders for all roles using the correct endpoint per scope.
 *
 * scope values and their backend endpoints:
 *   'my'      → GET /orders/my-orders   (USER / student)
 *   'all'     → GET /orders             (ADMIN)
 *   'kitchen' → GET /kitchen/orders     (KITCHEN)
 *   'monitor' → GET /manager/orders     (MANAGER)
 *   'ready'   → GET /manager/orders     (MANAGER, filtered by status=READY)
 */

import { useState, useEffect, useCallback } from 'react'
import { ordersService } from '@/services/orders'
import { kitchenService } from '@/services/kitchenService'
import { managerService } from '@/services/managerService'

export function useOrders(scope = 'all') {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let data = []

      switch (scope) {
        case 'my':
          data = await ordersService.getMy()
          break
        case 'all':
          data = await ordersService.getAll()
          break
        case 'kitchen':
          data = await kitchenService.getOrders()
          break
        case 'monitor':
          data = await managerService.getMonitor()
          break
        case 'ready':
          data = await managerService.getReady()
          break
        default:
          data = []
      }

      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const applyRealtimeUpdate = useCallback((updatedOrder) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id)

      if (exists) {
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      }

      return [updatedOrder, ...prev]
    })
  }, [])

  const updateKitchenStatus = useCallback(async (orderId, status) => {
    const updated = await kitchenService.updateStatus(orderId, status)
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
    return updated
  }, [])

  const completeOrder = useCallback(async (orderId) => {
    const updated = await managerService.complete(orderId)
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    return updated
  }, [])

  const updateStatus = useCallback(async (orderId, status) => {
    return updateKitchenStatus(orderId, status)
  }, [updateKitchenStatus])

  const addOrder = useCallback((order) => {
    setOrders((prev) => [order, ...prev])
  }, [])

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    applyRealtimeUpdate,
    updateStatus,
    updateKitchenStatus,
    completeOrder,
    addOrder,
    setOrders,
  }
}