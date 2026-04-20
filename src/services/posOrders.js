import api from './api'
import { ENDPOINTS, ORDER_STATUS_LABELS } from '@/utils/constants'
import { getApiErrorMessage } from '@/utils/getApiErrorMessage'

const POS_PAYMENT_METHODS = new Set(['CASH', 'UPI'])

function toOptionalNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getPosFoodItemId(item = {}) {
  return (
    toOptionalNumber(item.foodItemId) ??
    toOptionalNumber(item.id) ??
    toOptionalNumber(item.foodItem?.id) ??
    toOptionalNumber(item.menuItem?.id) ??
    null
  )
}

function getPosQuantity(item = {}) {
  return toOptionalNumber(item.quantity ?? item.qty)
}

function getPaymentMethod(paymentMethod = '') {
  return String(paymentMethod || '').trim().toUpperCase()
}

function createValidationError(issues) {
  const error = new Error(issues[0] || 'Invalid POS order.')
  error.validationIssues = issues
  return error
}

function normalisePosOrderItem(item = {}) {
  return {
    id: item?.id ?? item?.foodItemId ?? null,
    foodItemId: item?.foodItemId ?? item?.id ?? null,
    name: item?.name ?? 'Item',
    price: Number(item?.price ?? 0),
    quantity: Number(item?.quantity ?? item?.qty ?? 1),
  }
}

function normalisePosOrder(raw = {}) {
  const status = String(raw?.status || '').trim().toUpperCase()
  const pickupCode = String(raw?.pickupCode || '').trim()

  return {
    id: raw?.id ?? null,
    orderNumber: raw?.orderNumber ?? (raw?.id != null ? `#${raw.id}` : 'POS Order'),
    status,
    statusLabel:
      raw?.statusLabel ??
      ORDER_STATUS_LABELS[status] ??
      (status ? status.replace(/_/g, ' ') : 'Unknown'),
    total: Number(raw?.totalAmount ?? raw?.total ?? 0),
    totalAmount: Number(raw?.totalAmount ?? raw?.total ?? 0),
    createdAt: raw?.createdAt ?? null,
    paymentMethod: getPaymentMethod(raw?.paymentMethod),
    showQr: raw?.showQr === true,
    pickupCode,
    shortDescription: raw?.shortDescription ?? '',
    items: Array.isArray(raw?.items) ? raw.items.map(normalisePosOrderItem) : [],
  }
}

export function validatePosOrder(posItems = [], paymentMethod = '') {
  const issues = []
  const items = Array.isArray(posItems) ? posItems : []
  const normalizedPaymentMethod = getPaymentMethod(paymentMethod)

  if (!items.length) {
    issues.push('Add at least one item before placing a POS order.')
  }

  if (!normalizedPaymentMethod) {
    issues.push('Select a payment method before placing the POS order.')
  } else if (!POS_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
    issues.push('Unsupported payment method selected for POS order.')
  }

  items.forEach((item, index) => {
    const foodItemId = getPosFoodItemId(item)
    const quantity = getPosQuantity(item)

    if (!Number.isFinite(foodItemId) || foodItemId <= 0) {
      issues.push(`POS item ${index + 1} has an invalid foodItemId.`)
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      issues.push(`POS item ${index + 1} has an invalid quantity.`)
    }
  })

  return issues
}

export function buildPosOrderPayload(posItems = [], paymentMethod = '') {
  const issues = validatePosOrder(posItems, paymentMethod)
  if (issues.length) {
    throw createValidationError(issues)
  }

  return {
    paymentMethod: getPaymentMethod(paymentMethod),
    items: posItems.map((item) => ({
      foodItemId: Number(getPosFoodItemId(item)),
      quantity: Number(getPosQuantity(item)),
    })),
  }
}

export async function placePosOrder(payload) {
  try {
    const raw = await api.post(ENDPOINTS.ADMIN_POS_ORDERS, payload)
    return normalisePosOrder(raw)
  } catch (error) {
    error.message = getApiErrorMessage(
      error,
      'Unable to place the POS order right now.',
    )
    throw error
  }
}
