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
import { ORDER_STATUS } from '@/utils/constants'

function normalizeRealtimeOrder(order = {}) {
  const items = Array.isArray(order.items) ? order.items : []

  return {
    ...order,
    studentName: order.studentName || order.user?.name || 'Customer',
    studentEmail: order.studentEmail || order.user?.email || '',
    total:
      typeof order.total === 'number'
        ? order.total
        : Number(order.totalAmount ?? 0),
    totalAmount:
      typeof order.totalAmount === 'number'
        ? order.totalAmount
        : Number(order.total ?? 0),
    items,
    totalItems:
      typeof order.totalItems === 'number'
        ? order.totalItems
        : items.reduce((sum, item) => {
            const qty = Number(item?.quantity ?? item?.qty ?? 1)
            return sum + qty
          }, 0),
    orderNumber: order.orderNumber || `#${order.id}`,
    statusLabel: order.statusLabel || order.status || 'UNKNOWN',
  }
}

function matchesScope(order, scope) {
  const status = String(order?.status || '').toUpperCase()

  switch (scope) {
    case 'ready':
      return status === ORDER_STATUS.READY

    case 'monitor':
      return [
        ORDER_STATUS.PAYMENT_PENDING,
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PREPARING,
        ORDER_STATUS.READY,
      ].includes(status)

    case 'kitchen':
      return [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PREPARING,
        ORDER_STATUS.READY,
      ].includes(status)

    case 'my':
    case 'all':
    default:
      return true
  }
}

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

  const applyRealtimeUpdate = useCallback(
    (incomingOrder) => {
      const updatedOrder = normalizeRealtimeOrder(incomingOrder)

      setOrders((prev) => {
        const shouldBeInThisScope = matchesScope(updatedOrder, scope)

        if (!shouldBeInThisScope) {
          return prev.filter((o) => o.id !== updatedOrder.id)
        }

        const exists = prev.some((o) => o.id === updatedOrder.id)

        if (exists) {
          return prev.map((o) =>
            o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
          )
        }

        return [updatedOrder, ...prev]
      })
    },
    [scope]
  )

  const updateKitchenStatus = useCallback(async (orderId, status) => {
    const updated = await kitchenService.updateStatus(orderId, status)
    const normalized = normalizeRealtimeOrder(updated)

    setOrders((prev) => {
      const shouldBeInThisScope = matchesScope(normalized, scope)

      if (!shouldBeInThisScope) {
        return prev.filter((o) => o.id !== orderId)
      }

      return prev.map((o) =>
        o.id === orderId ? { ...o, ...normalized } : o
      )
    })

    return normalized
  }, [scope])

  const completeOrder = useCallback(async (orderId) => {
    const updated = await managerService.complete(orderId)
    // Let WebSocket handle the update to prefer backend/WebSocket as source of truth
    return updated
  }, [])

  const updateStatus = useCallback(
    async (orderId, status) => {
      return updateKitchenStatus(orderId, status)
    },
    [updateKitchenStatus]
  )

  const addOrder = useCallback((order) => {
    const normalized = normalizeRealtimeOrder(order)

    setOrders((prev) => {
      const shouldBeInThisScope = matchesScope(normalized, scope)
      if (!shouldBeInThisScope) return prev
      return [normalized, ...prev]
    })
  }, [scope])

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