import api from './api'
import { ENDPOINTS, ORDER_STATUS } from '@/utils/constants'
import { normaliseOrder } from './orders'

function unwrapListResponse(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.data?.data)) return raw.data.data
  return []
}

function unwrapItemResponse(raw) {
  return raw?.data?.data ?? raw?.data ?? raw ?? null
}

export const managerService = {
  async getMonitor() {
    const query = [
      `statuses=${encodeURIComponent(ORDER_STATUS.PAYMENT_PENDING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.PENDING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.PREPARING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.READY)}`,
    ].join('&')

    const raw = await api.get(`${ENDPOINTS.MANAGER_ORDERS}?${query}`)
    return unwrapListResponse(raw).map(normaliseOrder)
  },

  async getReady() {
    const query = `statuses=${encodeURIComponent(ORDER_STATUS.READY)}`
    const raw = await api.get(`${ENDPOINTS.MANAGER_ORDERS}?${query}`)
    return unwrapListResponse(raw).map(normaliseOrder)
  },

  async markReady() {
    return api.post(ENDPOINTS.MANAGER_CANTEEN_READY)
  },

  async complete(orderId) {
    const raw = await api.patch(ENDPOINTS.MANAGER_ORDER_COMPLETE(orderId))
    return normaliseOrder(unwrapItemResponse(raw))
  },
}
