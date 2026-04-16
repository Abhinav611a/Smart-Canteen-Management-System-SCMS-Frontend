function toOptionalNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function getFoodSource(item = {}) {
  return (
    item?.foodItem ??
    item?.menuItem ??
    item?.food ??
    item?.foodDetails ??
    item?.foodResponse ??
    item?.foodItemResponseDTO ??
    item?.foodItemResponseDto ??
    item?.item ??
    null
  )
}

function getFoodItemId(item = {}) {
  return (
    toOptionalNumber(item?.foodItemId) ??
    toOptionalNumber(item?.foodId) ??
    toOptionalNumber(getFoodSource(item)?.id)
  )
}

function getCartRowId(item = {}) {
  return (
    toOptionalNumber(item?.cartItemId) ??
    toOptionalNumber(item?.cartItem?.id) ??
    toOptionalNumber(item?.id)
  )
}

export function getCartItemIdentity(item = {}) {
  const foodItemId = getFoodItemId(item)
  if (foodItemId !== null) return String(foodItemId)

  const cartRowId = getCartRowId(item)
  return cartRowId !== null ? String(cartRowId) : ''
}

function buildPreviousItemMap(items = []) {
  return (Array.isArray(items) ? items : []).reduce((map, item) => {
    const key = getCartItemIdentity(item)
    if (key) {
      map.set(key, item)
    }
    return map
  }, new Map())
}

export function normaliseCartItem(item = {}, { previousItem = null } = {}) {
  const food = getFoodSource(item) ?? getFoodSource(previousItem) ?? {}
  const foodItemId = getFoodItemId(item) ?? getFoodItemId(previousItem)
  const cartItemId = getCartRowId(item) ?? getCartRowId(previousItem)
  const quantity = Math.max(
    0,
    toNumber(item?.quantity ?? item?.qty ?? previousItem?.quantity, 0),
  )
  const price = toNumber(item?.price ?? food?.price ?? previousItem?.price, 0)
  const category =
    firstNonEmptyString(
      item?.foodCategory,
      item?.category,
      food?.foodCategory,
      food?.category,
      previousItem?.foodCategory,
      previousItem?.category,
    ) ?? 'MAIN'

  return {
    id: foodItemId ?? cartItemId,
    cartItemId,
    foodItemId,
    name:
      firstNonEmptyString(
        item?.foodName,
        item?.itemName,
        item?.name,
        food?.name,
        previousItem?.name,
      ) ?? 'Item',
    category,
    foodCategory: category,
    price,
    available: item?.available ?? food?.available ?? previousItem?.available ?? true,
    emoji: item?.emoji ?? previousItem?.emoji,
    description:
      firstNonEmptyString(
        item?.description,
        food?.description,
        previousItem?.description,
      ) ?? '',
    imageUrl:
      firstNonEmptyString(
        item?.imageUrl,
        item?.foodImageUrl,
        food?.imageUrl,
        previousItem?.imageUrl,
      ) ?? null,
    subtotal: toNumber(item?.subtotal, price * quantity),
    qty: quantity,
    quantity,
  }
}

export function normaliseCartItems(items = [], { previousItems = [] } = {}) {
  const safeItems = Array.isArray(items) ? items : []
  const previousByIdentity = buildPreviousItemMap(previousItems)

  return safeItems.map((item) => {
    const previousItem = previousByIdentity.get(getCartItemIdentity(item)) ?? null
    return normaliseCartItem(item, { previousItem })
  })
}
