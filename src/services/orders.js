import api, { apiClient } from './api'
import { ENDPOINTS } from '@/utils/constants'

function normaliseOrderItem(item) {
  const food = item?.foodItem ?? item?.menuItem ?? item

  return {
    id: item?.id ?? food?.id,
    foodItemId: item?.foodItemId ?? food?.id,
    cartItemId: item?.cartItemId ?? item?.id,
    name: item?.name ?? food?.name ?? 'Item',
    category:
      item?.foodCategory ??
      item?.category ??
      food?.foodCategory ??
      food?.category ??
      'MAIN',
    price: Number(item?.price ?? food?.price ?? 0),
    quantity: Number(item?.quantity ?? item?.qty ?? 1),
    qty: Number(item?.quantity ?? item?.qty ?? 1),
    available: item?.available ?? food?.available ?? true,
  }
}

export function normaliseOrder(raw) {
  if (!raw) return null

  const items = (raw.orderItems ?? raw.items ?? []).map(normaliseOrderItem)
  const user = raw.user ?? raw.student ?? null

  return {
    id: raw.id,
    user,
    studentName: user?.name ?? raw.studentName ?? 'Unknown',
    studentEmail: user?.email ?? raw.studentEmail ?? '',
    items,
    total: Number(raw.totalAmount ?? raw.total ?? 0),
    totalAmount: Number(raw.totalAmount ?? raw.total ?? 0),
    status: raw.status,
    createdAt: raw.createdAt ?? raw.orderTime ?? raw.createdDate,
    txHash: null,
    orderNumber: raw.orderNumber ?? `#${raw.id}`,
    statusLabel: raw.statusLabel ?? raw.status,
    formattedDate: raw.formattedDate ?? null,
    totalItems:
      raw.totalItems ??
      items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    shortDescription: raw.shortDescription ?? '',
    canReorder: raw.canReorder ?? true,
    canDownloadInvoice: raw.canDownloadInvoice ?? true,
    elapsedSeconds: raw.elapsedSeconds ?? 0,
    timeStatus: raw.timeStatus ?? '',
  }
}

function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) return quotedMatch[1]

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i)
  if (plainMatch?.[1]) return plainMatch[1].trim()

  return fallback
}

export const ordersService = {
  async getAll() {
    const list = await api.get(ENDPOINTS.ORDERS)
    return (Array.isArray(list) ? list : []).map(normaliseOrder)
  },

  async getMy() {
    const list = await api.get(ENDPOINTS.MY_ORDERS)
    return (Array.isArray(list) ? list : []).map(normaliseOrder)
  },

  async getById(id) {
    const raw = await api.get(ENDPOINTS.ORDER(id))
    return normaliseOrder(raw)
  },

  async reorder(orderId) {
    return api.post(ENDPOINTS.REORDER(orderId))
  },

  async downloadInvoice(orderId) {
    const response = await apiClient.get(ENDPOINTS.INVOICE(orderId), {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    })

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/pdf',
    })

    const fallbackName = `invoice-order-${orderId}.pdf`
    const filename = extractFilename(
      response.headers['content-disposition'],
      fallbackName,
    )

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    return true
  },

  async getInvoice(orderId) {
    return this.downloadInvoice(orderId)
  },

  async delete(id) {
    return api.delete(ENDPOINTS.ORDER(id))
  },
}