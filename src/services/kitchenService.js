/**
 * kitchenService.js
 * ─────────────────
 * Handles the KITCHEN role endpoints.
 *
 * Kitchen staff see all kitchen orders and can update status through:
 * PENDING → PREPARING → READY → COMPLETED
 *
 * Endpoints:
 *   GET   /kitchen/orders
 *   PATCH /kitchen/orders/{orderId}/status?status=PREPARING
 */

import api from './api'
import { ENDPOINTS } from '@/utils/constants'
import { normaliseOrder } from './orders'

export const kitchenService = {
  /** Fetch all kitchen-visible orders */
  async getOrders() {
    const raw = await api.get(ENDPOINTS.KITCHEN_ORDERS)

    if (Array.isArray(raw)) {
      return raw.map(normaliseOrder)
    }

    if (raw?.success && Array.isArray(raw?.data)) {
      return raw.data.map(normaliseOrder)
    }

    if (Array.isArray(raw?.data)) {
      return raw.data.map(normaliseOrder)
    }

    return []
  },

  /**
   * Update order status from kitchen
   * @param {number} orderId
   * @param {'PENDING'|'PREPARING'|'READY'|'COMPLETED'|'CANCELLED'} status
   */
  async updateOrderStatus(orderId, status) {
    const raw = await api.patch(
      `${ENDPOINTS.KITCHEN_ORDER_STATUS(orderId)}?status=${encodeURIComponent(status)}`
    )

    if (raw?.id) {
      return normaliseOrder(raw)
    }

    if (raw?.success && raw?.data) {
      return normaliseOrder(raw.data)
    }

    if (raw?.data) {
      return normaliseOrder(raw.data)
    }

    return null
  },

  // backward-compatible alias so existing code using updateStatus won't break
  async updateStatus(orderId, status) {
    return this.updateOrderStatus(orderId, status)
  },
}