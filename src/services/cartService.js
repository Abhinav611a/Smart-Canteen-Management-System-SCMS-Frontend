import api from './api'
import { ENDPOINTS, LS_KEYS } from '@/utils/constants'
import { normaliseOrder } from './orders'
import { normaliseCartItem, normaliseCartItems } from '@/utils/cart'

const CHECKOUT_INVALID_MESSAGE =
  'Some cart items could not be checked out. We refreshed your cart. Please review it and try again.'
const CHECKOUT_EMPTY_AFTER_SANITIZE_MESSAGE =
  'No valid cart items remain for checkout. We refreshed your cart. Please review it and try again.'

function normaliseCart(raw) {
  const items = normaliseCartItems(
    Array.isArray(raw) ? raw : raw?.items ?? raw?.cartItems ?? [],
  )

  console.debug('[cartService] normalized cart items', items)

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

function getRawCartItems(rawCart) {
  return Array.isArray(rawCart) ? rawCart : rawCart?.items ?? rawCart?.cartItems ?? []
}

function summariseNormalizedCartItems(items = []) {
  return normaliseCartItems(items).map((item, index) => ({
    index,
    cartItemId: item.cartItemId ?? null,
    foodItemId: item.foodItemId ?? null,
    name: item.name,
    price: Number(item.price ?? 0),
    quantity: Number(item.quantity ?? item.qty ?? 0),
    imageUrl: item.imageUrl ?? null,
    hasValidFoodItemId:
      Number.isFinite(Number(item.foodItemId)) && Number(item.foodItemId) > 0,
    hasValidQuantity:
      Number.isFinite(Number(item.quantity ?? item.qty)) &&
      Number(item.quantity ?? item.qty) > 0,
    foodItemMatchesCartItem:
      item.cartItemId != null &&
      Number(item.foodItemId) === Number(item.cartItemId),
    usedFallbackName: item.name === 'Item',
  }))
}

function getDuplicateFoodItemIds(items = []) {
  const counts = items.reduce((map, item) => {
    const id = Number(item.foodItemId)
    if (Number.isFinite(id)) {
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, new Map())

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([foodItemId, count]) => ({ foodItemId, count }))
}

function stringifyCheckoutDebug(value) {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch (error) {
    return `[unserializable checkout debug value: ${error.message}]`
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
      cartItemId: String(item.id ?? item.cartItemId ?? ''),
      foodItemId: String(item.foodItemId ?? ''),
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

function normalisePaymentMethod(paymentMethod = 'CASH') {
  const normalized = String(paymentMethod || 'CASH').trim().toUpperCase()

  if (normalized === 'CASH') {
    return 'CASH'
  }

  const error = new Error('Online payments must use the Razorpay payment flow.')
  error.code = 'ONLINE_PAYMENT_REQUIRES_RAZORPAY'
  error.paymentMethod = normalized
  throw error
}

function toOptionalNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getNestedFoodItemId(item = {}) {
  return (
    toOptionalNumber(item?.foodItem?.id) ??
    toOptionalNumber(item?.menuItem?.id) ??
    toOptionalNumber(item?.food?.id) ??
    toOptionalNumber(item?.foodDetails?.id) ??
    toOptionalNumber(item?.foodResponse?.id) ??
    toOptionalNumber(item?.foodItemResponseDTO?.id) ??
    toOptionalNumber(item?.foodItemResponseDto?.id) ??
    toOptionalNumber(item?.item?.id)
  )
}

function getCheckoutItemName(item = {}) {
  return (
    item?.name ??
    item?.foodName ??
    item?.itemName ??
    item?.foodItem?.name ??
    item?.menuItem?.name ??
    item?.food?.name ??
    item?.foodDetails?.name ??
    item?.foodResponse?.name ??
    item?.foodItemResponseDTO?.name ??
    item?.foodItemResponseDto?.name ??
    item?.item?.name ??
    'Item'
  )
}

function getCheckoutItemCartRowId(item = {}) {
  return (
    toOptionalNumber(item?.id) ??
    toOptionalNumber(item?.cartItemId) ??
    toOptionalNumber(item?.cartItem?.id) ??
    null
  )
}

function getCheckoutFoodItemId(item = {}) {
  return (
    toOptionalNumber(item?.foodItemId) ??
    toOptionalNumber(item?.foodId) ??
    getNestedFoodItemId(item)
  )
}

function createOrderItemCandidates(cartItems = []) {
  return (Array.isArray(cartItems) ? cartItems : []).map((item, index) => {
    const foodItemId = getCheckoutFoodItemId(item)
    const quantity = Number(item?.quantity ?? item?.qty ?? 1)
    const issues = []

    if (!Number.isFinite(foodItemId) || foodItemId <= 0) {
      issues.push('invalid foodItemId')
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      issues.push('invalid quantity')
    }

    return {
      index,
      cartItemId: getCheckoutItemCartRowId(item),
      itemId: toOptionalNumber(item?.id),
      foodItemId,
      quantity,
      name: getCheckoutItemName(item),
      issues,
      rawItem: item,
    }
  })
}

export function buildOrderItems(cartItems = []) {
  return createOrderItemCandidates(cartItems)
    .filter((item) => item.issues.length === 0)
    .map(({ rawItem: _rawItem, issues: _issues, ...item }) => item)
}

function getDroppedCheckoutItems(cartItems = []) {
  return createOrderItemCandidates(cartItems)
    .filter((item) => item.issues.length > 0)
    .map(({ rawItem, ...item }) => ({
      ...item,
      rawItem,
    }))
}

function createCartEmptyError() {
  const error = new Error('Cart not found or empty')
  error.code = 'CART_EMPTY'
  return error
}

function createInvalidCheckoutError(cart, invalidItems, message = CHECKOUT_INVALID_MESSAGE) {
  const error = new Error(message)
  error.code = 'INVALID_CART_ITEMS'
  error.latestCart = cart
  error.invalidItems = invalidItems
  return error
}

export function buildCheckoutPayload(cart, data = {}) {
  const sanitizedItems = buildOrderItems(getRawCartItems(cart))

  const payload = {
    items: sanitizedItems.map((item) => ({
      foodItemId: Number(item.foodItemId),
      quantity: Number(item.quantity),
    })),
    paymentMethod: normalisePaymentMethod(data.paymentMethod),
  }

  return payload
}

function getCheckoutPayloadIssues(payload) {
  const issues = []
  const payloadKeys = Object.keys(payload ?? {}).sort().join(',')

  if (payloadKeys !== 'items,paymentMethod') {
    issues.push('Checkout payload must only contain "items" and "paymentMethod".')
  }

  if (!Array.isArray(payload?.items) || payload.items.length === 0) {
    issues.push('Checkout payload must contain at least one item.')
  }

  payload?.items?.forEach((item, index) => {
    const itemKeys = Object.keys(item ?? {}).sort().join(',')

    if (itemKeys !== 'foodItemId,quantity') {
      issues.push(
        `Checkout item ${index + 1} must only contain "foodItemId" and "quantity".`,
      )
    }

    if (!Number.isFinite(item?.foodItemId) || item.foodItemId <= 0) {
      issues.push(`Checkout item ${index + 1} has an invalid foodItemId.`)
    }

    if (!Number.isFinite(item?.quantity) || item.quantity <= 0) {
      issues.push(`Checkout item ${index + 1} has an invalid quantity.`)
    }
  })

  return issues
}

function createCheckoutDebugEntry({
  rawCart,
  cart,
  normalizedItems,
  payload,
  invalidItems,
  payloadIssues,
  duplicateFoodItemIds,
  requestedPaymentMethod,
  paymentMethod,
}) {
  return {
    timestamp: new Date().toISOString(),
    endpoint: ENDPOINTS.ORDERS,
    rawBackendCart: rawCart,
    normalizedCartItems: normalizedItems,
    requestedPaymentMethod,
    paymentMethod,
    payload,
    invalidItems,
    payloadIssues,
    duplicateFoodItemIds,
    cartSummary: {
      count: cart?.count ?? 0,
      total: cart?.total ?? 0,
    },
  }
}

function stashCheckoutDebug(debugEntry) {
  if (typeof window !== 'undefined') {
    window.__SCMS_LAST_CHECKOUT_DEBUG__ = debugEntry
  }
}

function logCheckoutDebug(debugEntry) {
  console.debug(
    '[cartService] raw backend cart used for checkout',
    debugEntry.rawBackendCart,
  )
  console.debug(
    '[cartService] raw backend cart JSON\n' +
      stringifyCheckoutDebug(debugEntry.rawBackendCart),
  )
  console.debug(
    '[cartService] normalized cart items used for checkout',
    debugEntry.normalizedCartItems,
  )
  console.debug(
    '[cartService] requested checkout payment method',
    debugEntry.requestedPaymentMethod,
  )
  console.debug('[cartService] checkout payment method', debugEntry.paymentMethod)
  console.debug('[cartService] final checkout payload', debugEntry.payload)
  console.debug(
    '[cartService] final checkout payload JSON\n' +
      stringifyCheckoutDebug(debugEntry.payload),
  )
  console.debug(
    '[cartService] invalid checkout items JSON\n' +
      stringifyCheckoutDebug(debugEntry.invalidItems),
  )
  console.debug(
    '[cartService] checkout payload issues JSON\n' +
      stringifyCheckoutDebug(debugEntry.payloadIssues),
  )
  console.debug(
    '[cartService] duplicate foodItemIds JSON\n' +
      stringifyCheckoutDebug(debugEntry.duplicateFoodItemIds),
  )

  if (debugEntry.invalidItems.length > 0) {
    console.warn(
      '[cartService] dropped invalid cart items before checkout',
      debugEntry.invalidItems,
    )
  }

  if (debugEntry.duplicateFoodItemIds.length > 0) {
    console.warn(
      '[cartService] duplicate foodItemId values detected in checkout payload',
      debugEntry.duplicateFoodItemIds,
    )
  }

  if (debugEntry.payloadIssues.length > 0) {
    console.warn(
      '[cartService] checkout payload contract issues detected',
      debugEntry.payloadIssues,
    )
  }
}

async function fetchCartSnapshot() {
  const rawCart = await api.get(ENDPOINTS.CART)
  const cart = normaliseCart(rawCart)

  return { rawCart, cart }
}

export const cartService = {
  isBackendEnabled() {
    return hasToken()
  },

  async getCart() {
    try {
      const { cart } = await fetchCartSnapshot()
      return cart
    } catch (error) {
      if (isCartMissingError(error)) {
        return { id: null, items: [], total: 0, count: 0, amount: 0 }
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
    const cartItemId = Number(item?.id)

    if (!cartItemId || cartItemId <= 0) {
      console.error('Invalid cartItemId for cart update:', item)
      throw new Error('Invalid cartItemId for cart update')
    }

    await api.put(ENDPOINTS.CART_ITEM(cartItemId), { quantity })
    return this.getCart()
  },

  async removeItem(item) {
    const cartItemId = Number(item?.id)

    if (!cartItemId || cartItemId <= 0) {
      console.error('Invalid cartItemId for cart remove:', item)
      throw new Error('Invalid cartItemId for cart remove')
    }

    await api.delete(ENDPOINTS.CART_ITEM(cartItemId))
    return this.getCart()
  },

  async clearCart(items = [], { refetch = true } = {}) {
    const results = await Promise.allSettled(
      items.map((item) => {
        const cartItemId = Number(item?.id)

        if (!cartItemId || cartItemId <= 0) {
          console.error('Invalid cartItemId for cart clear:', item)
          throw new Error('Invalid cartItemId for cart clear')
        }

        return api.delete(ENDPOINTS.CART_ITEM(cartItemId))
      }),
    )

    const failed = results.find((result) => result.status === 'rejected')

    if (!refetch && !failed) {
      return { id: null, items: [], total: 0, count: 0, amount: 0 }
    }

    const cart = await this.getCart()

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
    const { rawCart, cart } = await fetchCartSnapshot()

    if (!cart?.items?.length) {
      throw createCartEmptyError()
    }

    const rawCartItems = getRawCartItems(rawCart)
    const payload = buildCheckoutPayload(rawCart, data)
    const normalizedItems = summariseNormalizedCartItems(rawCartItems)
    const invalidItems = getDroppedCheckoutItems(rawCartItems)
    const payloadIssues = getCheckoutPayloadIssues(payload)
    const duplicateFoodItemIds = getDuplicateFoodItemIds(payload.items)
    const debugEntry = createCheckoutDebugEntry({
      rawCart,
      cart,
      normalizedItems,
      payload,
      invalidItems,
      payloadIssues,
      duplicateFoodItemIds,
      requestedPaymentMethod: data.paymentMethod,
      paymentMethod: payload.paymentMethod,
    })

    stashCheckoutDebug(debugEntry)
    logCheckoutDebug(debugEntry)

    if (!payload.items.length) {
      const error = createInvalidCheckoutError(
        cart,
        invalidItems,
        CHECKOUT_EMPTY_AFTER_SANITIZE_MESSAGE,
      )
      error.checkoutDebug = debugEntry
      error.payloadIssues = payloadIssues
      throw error
    }

    if (payloadIssues.length) {
      console.warn('[cartService] rejected checkout payload', {
        invalidItems,
        payloadIssues,
      })
      const error = createInvalidCheckoutError(cart, invalidItems)
      error.checkoutDebug = debugEntry
      error.payloadIssues = payloadIssues
      throw error
    }

    try {
      console.debug('[cartService] POST /orders request payload', payload)
      console.debug(
        '[cartService] POST /orders request payload JSON\n' +
          stringifyCheckoutDebug(payload),
      )
      const raw = await api.post(ENDPOINTS.ORDERS, payload)
      const order = normaliseOrder(raw)
      return {
        ...(order ?? {}),
        paymentMethod: payload.paymentMethod,
      }
    } catch (error) {
      console.error('[cartService] checkout error response status', error?.response?.status)
      console.error('[cartService] checkout error response data', error?.response?.data)
      console.error(
        '[cartService] checkout error response data JSON\n' +
          stringifyCheckoutDebug(error?.response?.data),
      )
      console.error('[cartService] checkout error response headers', error?.response?.headers)
      console.error(
        '[cartService] checkout error response headers JSON\n' +
          stringifyCheckoutDebug(error?.response?.headers),
      )
      error.checkoutDebug = debugEntry
      throw error
    }
  },
}
