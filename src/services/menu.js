import api from './api'
import { ENDPOINTS, MENU_CATEGORY_EMOJIS } from '@/utils/constants'

function normalisePreparedItem(value) {
  if (value === true || value === false) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return null
}

function toPreparedItemPayload(value) {
  return value === false || value === 'false' ? false : true
}

function buildMenuPayload(data) {
  const payload = {
    name: data.name,
    foodCategory: data.foodCategory ?? data.category,
    price: Number(data.price),
    imageUrl: data.imageUrl ?? null,
    isPreparedItem: toPreparedItemPayload(data.isPreparedItem),
  }

  if (data.maxPerOrder !== undefined) {
    payload.maxPerOrder = data.maxPerOrder
  }

  return payload
}

function normaliseItem(item = {}) {
  const cat = item.foodCategory ?? item.category ?? 'MAIN'
  return {
    id: item.id,
    name: item.name,
    category: cat,
    foodCategory: cat,
    price: Number(item.price ?? 0),
    available: item.available ?? true,
    isPreparedItem: normalisePreparedItem(item.isPreparedItem),
    emoji: MENU_CATEGORY_EMOJIS[cat] ?? '🍴',
    description: item.description ?? '',
    rating: item.rating == null ? null : Number(item.rating),
    imageUrl: item.imageUrl ?? item.image_url ?? item.image ?? null,
    maxPerOrder: item.maxPerOrder ?? null,
    ordersToday: Number(item.ordersToday ?? item.totalSoldToday ?? 0),
  }
}

function normalisePage(page) {
  const payload =
    page && typeof page === 'object' && 'success' in page ? page.data : page
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload
  const content = Array.isArray(data) ? data : (data?.content ?? [])
  return content.map(normaliseItem)
}

export const menuService = {
  async getAll(params = {}) {
    const data = await api.get(ENDPOINTS.MENU, { params: { size: 100, ...params } })
    return normalisePage(data)
  },

  async getById(id) {
    const data = await api.get(ENDPOINTS.MENU, {
      params: {
        size: 1000,
      },
    })
    const items = normalisePage(data)
    return items.find((item) => Number(item.id) === Number(id)) ?? null
  },

  async create(data) {
    const payload = buildMenuPayload(data)
    const result = await api.post(ENDPOINTS.MENU, payload)
    return normaliseItem(result)
  },

  async update(id, data) {
    const payload = buildMenuPayload(data)
    const result = await api.put(ENDPOINTS.MENU_ITEM(id), payload)
    return normaliseItem(result)
  },

  async toggleAvailability(id) {
    const result = await api.patch(ENDPOINTS.MENU_TOGGLE(id))
    return normaliseItem(result)
  },

  async delete(id) {
    return api.delete(ENDPOINTS.MENU_ITEM(id))
  },
}
