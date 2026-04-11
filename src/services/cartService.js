import api from './api'
import { ENDPOINTS, LS_KEYS } from '@/utils/constants'
import { normaliseOrder } from './orders'

function normaliseCartItem(item) {
  const food = item?.foodItem ?? item?.menuItem ?? item
  const qty = Number(item?.quantity ?? item?.qty ?? 1)
  return {
    id: food?.id ?? item?.foodItemId ?? item?.id,
    cartItemId: item?.id,
    foodItemId: food?.id ?? item?.foodItemId ?? item?.id,
    name: food?.name ?? item?.name ?? 'Item',
    category: food?.foodCategory ?? food?.category ?? item?.foodCategory ?? item?.category ?? 'MAIN',
    price: Number(food?.price ?? item?.price ?? 0),
    available: food?.available ?? item?.available ?? true,
    emoji: item?.emoji,
    description: food?.description ?? item?.description ?? '',
    qty,
    quantity: qty,
  }
}

function normaliseCart(raw) {
  const items = Array.isArray(raw)
    ? raw.map(normaliseCartItem)
    : (raw?.items ?? raw?.cartItems ?? []).map(normaliseCartItem)

  return {
    id: raw?.id,
    items,
    total: Number(
      raw?.totalAmount ??
        raw?.total ??
        items.reduce((sum, item) => sum + item.price * item.qty, 0),
    ),
    count: items.reduce((sum, item) => sum + item.qty, 0),
  }
}

function hasToken() {
  return Boolean(localStorage.getItem(LS_KEYS.JWT))
}

export const cartService = {
  isBackendEnabled() {
    return hasToken()
  },

  async getCart() {
    const raw = await api.get(ENDPOINTS.CART)
    return normaliseCart(raw)
  },

  async addItem(item, quantity = 1) {
    await api.post(ENDPOINTS.CART_ADD, {
      foodItemId: item.foodItemId ?? item.id,
      quantity,
    })
    return this.getCart()
  },

  async updateItem(item, quantity) {
    const cartItemId = item.cartItemId ?? item.id
    await api.put(ENDPOINTS.CART_ITEM(cartItemId), { quantity })
    return this.getCart()
  },

  async removeItem(item) {
    const cartItemId = item.cartItemId ?? item.id
    await api.delete(ENDPOINTS.CART_ITEM(cartItemId))
    return this.getCart()
  },

  async clearCart(items = []) {
    await Promise.all(
      items.map((item) => {
        const cartItemId = item.cartItemId ?? item.id
        return api.delete(ENDPOINTS.CART_ITEM(cartItemId)).catch(() => null)
      }),
    )
    return { items: [], total: 0, count: 0 }
  },

  async checkout(data = {}) {
    const raw = await api.post(ENDPOINTS.CART_CHECKOUT, data)
    return normaliseOrder(raw)
  },
}