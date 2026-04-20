import api from './api'

export function normalizePosOrder(raw) {
  if (!raw) return null

  return {
    id: raw.id,
    user: raw.user ?? null,
    items: Array.isArray(raw.items) ? raw.items : [],
    totalAmount: Number(raw.totalAmount ?? 0),
    status: raw.status ?? 'PENDING',
    orderType: raw.orderType ?? null,
    orderNumber: raw.orderNumber ?? null,
    statusLabel: raw.statusLabel ?? raw.status ?? 'Pending',
    formattedDate: raw.formattedDate ?? null,
    totalItems: Number(raw.totalItems ?? 0),
    shortDescription: raw.shortDescription ?? '',
    pickupCode: raw.pickupCode ?? null,
    showQr: Boolean(raw.showQr),
    createdAt: raw.createdAt ?? null,
  }
}

export async function placePosOrder(payload) {
  const response = await api.post('/admin/pos/orders', payload)
  const data = response?.data ?? response
  return normalizePosOrder(data)
}

export function buildPosOrderPayload(posItems, paymentMethod) {
  return {
    paymentMethod,
    items: posItems.map((item) => ({
      foodItemId: Number(item.foodItemId ?? item.id),
      quantity: Number(item.quantity ?? item.qty ?? 1),
    })),
  }
}

export function validatePosOrder(posItems, paymentMethod) {
  if (!Array.isArray(posItems) || posItems.length === 0) {
    throw new Error('Please add at least one item')
  }

  if (!paymentMethod) {
    throw new Error('Please select payment method')
  }

  for (const item of posItems) {
    const foodItemId = Number(item.foodItemId ?? item.id)
    const quantity = Number(item.quantity ?? item.qty ?? 1)

    if (!foodItemId || Number.isNaN(foodItemId)) {
      throw new Error('Invalid food item')
    }

    if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantity must be at least 1')
    }
  }
}