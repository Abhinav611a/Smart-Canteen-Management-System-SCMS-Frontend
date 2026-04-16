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
    category:
      food?.foodCategory ??
      food?.category ??
      item?.foodCategory ??
      item?.category ??
      'MAIN',
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

function getAuthStorage() {
  return sessionStorage
}

function hasToken() {
  return Boolean(getAuthStorage().getItem(LS_KEYS.JWT))
}

function isCartMissingError(error) {
  const status = error?.response?.status
  const message = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      '',
  ).toLowerCase()

  return (
    status === 404 ||
    status === 400 ||
    status === 500 ||
    message.includes('cart not found') ||
    message.includes('cart is empty') ||
    message.includes('empty cart')
  )
}

export function createCartSnapshot(cartLike = []) {
  const items = Array.isArray(cartLike) ? cartLike : cartLike?.items ?? []

  return items
    .map(normaliseCartItem)
    .map((item) => ({
      cartItemId: String(item.cartItemId ?? ''),
      foodItemId: String(item.foodItemId ?? item.id ?? ''),
      qty: Number(item.qty ?? item.quantity ?? 0),
      price: Number(item.price ?? 0),
    }))
    .sort((a, b) => {
      const aKey = `${a.foodItemId}:${a.cartItemId}`
      const bKey = `${b.foodItemId}:${b.cartItemId}`
      return aKey.localeCompare(bKey)
    })
}

export function cartSnapshotsMatch(a, b) {
  const left = createCartSnapshot(a)
  const right = createCartSnapshot(b)

  if (left.length !== right.length) return false

  return left.every((item, index) => {
    const other = right[index]

    return (
      item.cartItemId === other.cartItemId &&
      item.foodItemId === other.foodItemId &&
      item.qty === other.qty &&
      item.price === other.price
    )
  })
}

export function isCartMismatchError(error) {
  const status = error?.response?.status
  const message = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      '',
  ).toLowerCase()

  return (
    status === 409 ||
    (status === 400 &&
      message.includes('cart') &&
      (message.includes('mismatch') ||
        message.includes('match') ||
        message.includes('stale') ||
        message.includes('changed') ||
        message.includes('updated'))) ||
    message.includes('cart mismatch') ||
    message.includes('does not match') ||
    message.includes('latest server state') ||
    message.includes('stale cart') ||
    message.includes('cart has changed') ||
    message.includes('cart was updated')
  )
}

export const cartService = {
  isBackendEnabled() {
    return hasToken()
  },

  async getCart() {
    try {
      const raw = await api.get(ENDPOINTS.CART)
      return normaliseCart(raw)
    } catch (error) {
      if (isCartMissingError(error)) {
        return { id: null, items: [], total: 0, count: 0 }
      }
      throw error
    }
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
    const results = await Promise.allSettled(
      items.map((item) => {
        const cartItemId = item.cartItemId ?? item.id
        return api.delete(ENDPOINTS.CART_ITEM(cartItemId))
      }),
    )

    const cart = await this.getCart()
    const failed = results.find((result) => result.status === 'rejected')

    if (failed && cart.items.length > 0) {
      const reason = failed.reason
      const error =
        reason instanceof Error ? reason : new Error('Failed to clear cart.')

      error.latestCart = cart
      throw error
    }

    return cart
  },

  async checkout(data = {}) {
    const cart = await this.getCart()

    if (!cart?.items?.length) {
      const error = new Error('Cart not found or empty')
      error.code = 'CART_EMPTY'
      throw error
    }

    const raw = await api.post(ENDPOINTS.CART_CHECKOUT, data)
    return normaliseOrder(raw)
  },
}
