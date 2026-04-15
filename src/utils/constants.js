export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  'https://smart-canteen-backend-k235.onrender.com'
).replace(/\/$/, '')

export const ENDPOINTS = {
  LOGIN: '/users/login',
  REGISTER: '/users/register',

  VERIFY_EMAIL: '/users/verify-email',
  FORGOT_PASSWORD: '/users/forgot-password',
  RESET_PASSWORD: '/users/reset-password',
  RESEND_OTP: '/users/resend-otp',

  LOGOUT: '/users/logout',
  ME: '/users/me',

  ADMIN_USERS: '/admin/users',
  ADMIN_USER_ROLE: (id) => `/admin/users/${id}/role`,
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_APPROVE_PAYMENT: (id) => `/admin/orders/${id}/approve-payment`,

  CANTEEN: '/canteen',
  CANTEEN_OPENING: '/admin/canteen/opening',
  CANTEEN_OPEN: '/admin/canteen/open',
  CANTEEN_CLOSING_SOON: '/admin/canteen/closing-soon',
  CANTEEN_CLOSING: '/admin/canteen/closing',
  CANTEEN_CLOSED: '/admin/canteen/closed',

  MENU: '/menu',
  MENU_ITEM: (id) => `/menu/${id}`,
  MENU_TOGGLE: (id) => `/menu/${id}/toggle`,

  CART: '/cart',
  CART_ADD: '/cart/add',
  CART_ITEM: (id) => `/cart/item/${id}`,
  CART_CHECKOUT: '/cart/checkout',

  ORDERS: '/orders',
  ORDER: (id) => `/orders/${id}`,
  MY_ORDERS: '/orders/my-orders',
  REORDER: (id) => `/orders/${id}/reorder`,
  INVOICE: (id) => `/orders/${id}/invoice`,

  KITCHEN_ORDERS: '/kitchen/orders',
  KITCHEN_ORDER_STATUS: (id) => `/kitchen/orders/${id}/status`,

  MANAGER_ORDERS: '/manager/orders',
  MANAGER_ORDER_COMPLETE: (id) => `/manager/${id}/complete`,

  ANALYTICS_REVENUE_DAILY: '/analytics/revenue/daily',
  ANALYTICS_REVENUE_WEEKLY: '/analytics/revenue/weekly',
  ANALYTICS_REVENUE_MONTHLY: '/analytics/revenue/monthly',
  ANALYTICS_ORDER_STATUS: '/analytics/orders/status',
  ANALYTICS_TOP_ITEMS: '/analytics/top-items',
  ANALYTICS_CATEGORY_SALES: '/analytics/category-sales',

  RATING_RATE: '/rating/rate',

  WS_ENDPOINT: '/ws-orders',
  WS_TOPIC_ADMIN_ORDERS: '/topic/admin/orders',
  WS_TOPIC_KITCHEN_ORDERS: '/topic/kitchen/orders',
  WS_TOPIC_USER_PREFIX: '/topic/user',
  WS_TOPIC_CANTEEN_STATUS: '/topic/canteen/status',
}

export const ORDER_STATUS = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
}

export const ORDER_STATUS_LABELS = {
  PAYMENT_PENDING: 'Payment Pending',
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_COLORS = {
  PAYMENT_PENDING: 'badge-gray',
  PENDING: 'badge-yellow',
  PREPARING: 'badge-blue',
  READY: 'badge-green',
  COMPLETED: 'badge-gray',
  CANCELLED: 'badge-red',
}

export const ORDER_STATUS_ICONS = {
  PAYMENT_PENDING: '💵',
  PENDING: '⏳',
  PREPARING: '👨‍🍳',
  READY: '✅',
  COMPLETED: '📦',
  CANCELLED: '❌',
}

export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
}

export const ROLE_HOME = {
  student: '/student/menu',
  admin: '/admin/dashboard',
  manager: '/manager/orders',
  kitchen: '/kitchen/dashboard',
}

export const MENU_CATEGORIES = ['All', 'MAIN', 'SNACK', 'BEVERAGE', 'DESSERT']

export const MENU_CATEGORY_LABELS = {
  All: 'All',
  MAIN: 'Main Course',
  SNACK: 'Snacks',
  BEVERAGE: 'Beverages',
  DESSERT: 'Desserts',
}

export const MENU_CATEGORY_EMOJIS = {
  MAIN: '🍛',
  SNACK: '🥪',
  BEVERAGE: '☕',
  DESSERT: '🍮',
}

export const DEFAULT_PAGE_SIZE = 10

function getStoragePrefix() {
  const host = window.location.hostname || ''

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  ) {
    return 'canteen_local'
  }

  if (host.includes('ngrok')) {
    return 'canteen_ngrok'
  }

  return `canteen_${window.location.origin.replace(/[^a-zA-Z0-9]/g, '_')}`
}

const STORAGE_PREFIX = getStoragePrefix()

export const LS_KEYS = {
  JWT: `${STORAGE_PREFIX}_jwt`,
  USER: `${STORAGE_PREFIX}_user`,
  REFRESH_TOKEN: `${STORAGE_PREFIX}_refresh_token`,
  TOKEN_EXPIRY: `${STORAGE_PREFIX}_token_expiry`,
  THEME: 'canteen_theme',
  CART: 'canteen_cart',
}

export const TOAST_DURATION = {
  SHORT: 2500,
  NORMAL: 4000,
  LONG: 6000,
}

export const CHART_COLORS = {
  primary: '#22c55e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

export const PIE_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
]