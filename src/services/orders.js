import api, { apiClient } from './api'
import { ENDPOINTS } from '@/utils/constants'

export function canAccessInvoice(order) {
  if (!order) return false

  return Boolean(order.id || order.orderNumber)
}

export function extractQrCodeValue(scannedValue = '') {
  const raw = String(scannedValue || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const codeParam =
      url.searchParams.get('code') ||
      url.searchParams.get('token') ||
      url.searchParams.get('qr') ||
      url.searchParams.get('qrCode')
    if (codeParam) return codeParam.trim()
  } catch {
    // Not a URL; use the raw scanned value as-is.
  }

  return raw
}

export function getQrVerifyErrorMessage(error) {
  const status = error?.response?.status
  const backendMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    ''
  const message = String(backendMessage || '').trim()
  const normalizedMessage = message.toLowerCase()

  if (status === 409) {
    if (
      normalizedMessage.includes('already used') ||
      normalizedMessage.includes('already completed') ||
      normalizedMessage.includes('already picked') ||
      normalizedMessage.includes('picked up') ||
      normalizedMessage.includes('collected') ||
      normalizedMessage.includes('verified')
    ) {
      return 'This order is already picked up'
    }

    if (
      normalizedMessage.includes('not ready') ||
      normalizedMessage.includes('not yet ready')
    ) {
      return 'Order is not ready yet'
    }

    return message || 'Order cannot be verified right now'
  }

  if (status === 410) return 'QR expired'
  if (status === 400) return 'Invalid QR code'

  return 'Unable to verify QR. Please try again.'
}

function normaliseOrderItem(item) {
  const food = item?.foodItem ?? item?.menuItem ?? item
  const parsedQuantity = Number(item?.quantity ?? item?.qty)
  const quantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1

  return {
    id: item?.foodItemId ?? food?.id ?? item?.id,
    foodItemId: item?.foodItemId ?? food?.id ?? item?.id,
    cartItemId: item?.cartItemId ?? null,
    name: item?.name ?? food?.name ?? 'Item',
    category:
      item?.foodCategory ??
      item?.category ??
      food?.foodCategory ??
      food?.category ??
      'MAIN',
    price: Number(item?.price ?? food?.price ?? 0),
    quantity,
    qty: quantity,
    available: item?.available ?? food?.available ?? true,
  }
}

export function normaliseOrder(raw) {
  if (!raw) return null

  const sourceItems = Array.isArray(raw.items)
    ? raw.items
    : (raw.orderItems ?? [])
  const items = sourceItems.map(normaliseOrderItem)
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
    canDownloadInvoice: canAccessInvoice(raw),
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

function getFallbackInvoiceFilename(orderId) {
  return `invoice-${orderId}.pdf`
}

function createInvoiceBlob(response) {
  return new Blob([response.data], {
    type: response.headers['content-type'] || 'application/pdf',
  })
}

function resolveInvoiceFilename(orderId, headers = {}) {
  return extractFilename(
    headers['content-disposition'],
    getFallbackInvoiceFilename(orderId),
  )
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

  async verifyOrderQr(code) {
    const normalizedCode = extractQrCodeValue(code)

    return api.post(ENDPOINTS.ORDER_VERIFY, { code: normalizedCode })
  },

  async verifyOrder(code) {
    return this.verifyOrderQr(code)
  },

  async fetchInvoiceAsset(orderId) {
    const response = await apiClient.get(ENDPOINTS.INVOICE(orderId), {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
      },
    })

    return {
      blob: createInvoiceBlob(response),
      filename: resolveInvoiceFilename(orderId, response.headers),
    }
  },

  async fetchInvoiceBlob(orderId) {
    const { blob } = await this.fetchInvoiceAsset(orderId)
    return blob
  },

  downloadInvoiceBlob(blob, orderId, filename = getFallbackInvoiceFilename(orderId)) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    try {
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
    } finally {
      link.remove()
      window.URL.revokeObjectURL(url)
    }

    return true
  },

  async downloadInvoice(orderId) {
    const { blob, filename } = await this.fetchInvoiceAsset(orderId)
    return this.downloadInvoiceBlob(blob, orderId, filename)
  },

  async getInvoice(orderId) {
    return this.downloadInvoice(orderId)
  },

  async cancel(id) {
    return api.patch(ENDPOINTS.ORDER_CANCEL(id))
  },

  async delete(id) {
    return api.patch(ENDPOINTS.ORDER_CANCEL(id))
  },
}
