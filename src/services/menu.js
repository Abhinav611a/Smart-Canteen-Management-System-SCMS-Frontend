import api from './api'
import { ENDPOINTS, MENU_CATEGORY_EMOJIS } from '@/utils/constants'

function normaliseItem(item = {}) {
  const cat = item.foodCategory ?? item.category ?? 'MAIN'
  return {
    id: item.id,
    name: item.name,
    category: cat,
    foodCategory: cat,
    price: Number(item.price ?? 0),
    available: item.available ?? true,
    emoji: MENU_CATEGORY_EMOJIS[cat] ?? '🍴',
    description: item.description ?? '',
    rating: Number(item.rating ?? 0),
    imageUrl: item.imageUrl ?? null,
    ordersToday: Number(item.ordersToday ?? item.totalSoldToday ?? 0),
  }
}

function normalisePage(page) {
  const content = Array.isArray(page) ? page : (page?.content ?? [])
  return content.map(normaliseItem)
}

export const menuService = {
  async getAll(params = {}) {
    const data = await api.get(ENDPOINTS.MENU, { params: { size: 100, ...params } })
    return normalisePage(data)
  },

  async getById(id) {
    const data = await api.get(ENDPOINTS.MENU_ITEM(id))
    return data ? normaliseItem(data) : null
  },

  async create(data) {
    const payload = {
      name: data.name,
      foodCategory: data.foodCategory ?? data.category,
      price: Number(data.price),
    }
    const result = await api.post(ENDPOINTS.MENU, payload)
    return normaliseItem(result)
  },

  async update(id, data) {
    const payload = {
      name: data.name,
      foodCategory: data.foodCategory ?? data.category,
      price: Number(data.price),
    }
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
