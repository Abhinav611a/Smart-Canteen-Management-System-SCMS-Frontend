import api from './api'
import { ENDPOINTS } from '@/utils/constants'

function capFirst(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function formatDay(dateStr) {
  if (!dateStr) return ''
  const date = new Date(String(dateStr).includes('T') ? dateStr : `${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonth(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function statusColor(status) {
  const palette = {
    PENDING: '#f59e0b',
    PREPARING: '#3b82f6',
    READY: '#22c55e',
    COMPLETED: '#6b7280',
    CANCELLED: '#ef4444',
  }
  return palette[status] ?? '#6b7280'
}

function normaliseDailyRevenue(list) {
  return (list ?? []).map((entry) => ({
    day: formatDay(entry.date ?? entry.createdAt),
    month: formatMonth(entry.date ?? entry.createdAt),
    revenue: Number(entry.revenue ?? 0),
    orders: Number(entry.orders ?? 0),
  }))
}

function normaliseWeeklyRevenue(list) {
  return (list ?? []).map((entry, index) => ({
    day: `W${index + 1}`,
    month: formatMonth(entry.weekStart ?? entry.startDate),
    revenue: Number(entry.revenue ?? 0),
    orders: Number(entry.orders ?? 0),
  }))
}

function normaliseMonthlyRevenue(list) {
  return (list ?? []).map((entry) => ({
    day: formatMonth(entry.monthStart ?? entry.month),
    month: formatMonth(entry.monthStart ?? entry.month),
    revenue: Number(entry.revenue ?? 0),
    orders: Number(entry.orders ?? 0),
  }))
}

function normaliseTopItems(list) {
  return (list ?? []).map((entry) => ({
    name: entry.name ?? entry.itemName ?? 'Item',
    orders: Number(entry.totalSold ?? entry.orders ?? 0),
    value: Number(entry.totalSold ?? entry.orders ?? 0),
    foodItemId: entry.foodItemId ?? entry.id,
  }))
}

function normaliseCategorySales(list) {
  const colors = ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4']
  return (list ?? []).map((entry, index) => ({
    name: capFirst(entry.category ?? entry.name),
    value: Number(entry.totalOrders ?? entry.value ?? 0),
    color: colors[index % colors.length],
  }))
}

function normaliseStatusCounts(list) {
  return (list ?? []).map((entry) => ({
    name: capFirst(entry.status),
    value: Number(entry.count ?? 0),
    color: statusColor(entry.status),
  }))
}

export const analyticsService = {
  async getRevenue(period = 'weekly') {
    const endpointMap = {
      daily: ENDPOINTS.ANALYTICS_REVENUE_DAILY,
      weekly: ENDPOINTS.ANALYTICS_REVENUE_WEEKLY,
      monthly: ENDPOINTS.ANALYTICS_REVENUE_MONTHLY,
    }
    const url = endpointMap[period] ?? ENDPOINTS.ANALYTICS_REVENUE_WEEKLY
    const list = await api.get(url)
    if (period === 'daily') return normaliseDailyRevenue(list)
    if (period === 'monthly') return normaliseMonthlyRevenue(list)
    return normaliseWeeklyRevenue(list)
  },

  async getTopItems(limit = 10) {
    const list = await api.get(ENDPOINTS.ANALYTICS_TOP_ITEMS)
    return normaliseTopItems(list).slice(0, limit)
  },

  async getVendorPerformance() {
    const list = await api.get(ENDPOINTS.ANALYTICS_CATEGORY_SALES)
    return normaliseCategorySales(list)
  },

  async getCategoryBreakdown() {
    const list = await api.get(ENDPOINTS.ANALYTICS_CATEGORY_SALES)
    return normaliseCategorySales(list)
  },

  async getOrderStatusCounts() {
    const list = await api.get(ENDPOINTS.ANALYTICS_ORDER_STATUS)
    return normaliseStatusCounts(list)
  },
}
