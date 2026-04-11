import api from './api'
import { ENDPOINTS, ORDER_STATUS } from '@/utils/constants'
import { normaliseOrder } from './orders'

export const managerService = {
  async getMonitor() {
    const query = [
      `statuses=${encodeURIComponent(ORDER_STATUS.PAYMENT_PENDING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.PENDING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.PREPARING)}`,
      `statuses=${encodeURIComponent(ORDER_STATUS.READY)}`,
    ].join('&')

    const raw = await api.get(`${ENDPOINTS.MANAGER_ORDERS}?${query}`)
    const list = raw?.data?.data ?? raw?.data ?? raw ?? []
    return (Array.isArray(list) ? list : []).map(normaliseOrder)
  },

  async getReady() {
    const raw = await api.get(
      `${ENDPOINTS.MANAGER_ORDERS}?status=${encodeURIComponent(ORDER_STATUS.READY)}`
    )

    const list = raw?.data?.data ?? raw?.data ?? raw ?? []
    return (Array.isArray(list) ? list : []).map(normaliseOrder)
  },

  async complete(orderId) {
    const raw = await api.patch(ENDPOINTS.MANAGER_ORDER_COMPLETE(orderId))
    const data = raw?.data?.data ?? raw?.data ?? raw
    return normaliseOrder(data)
  },
}