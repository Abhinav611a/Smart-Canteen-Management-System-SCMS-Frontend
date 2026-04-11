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

  CANTEEN_OPEN: '/admin/canteen/open',
  CANTEEN_CLOSE: '/admin/canteen/close',
  CANTEEN_STATUS: '/admin/canteen/status',

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

  WS_ENDPOINT: '/ws-orders',
  WS_TOPIC_ORDERS: '/topic/orders',
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
  CHEF: 'chef',
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
}

export const ROLE_HOME = {
  student: '/student/menu',
  chef: '/chef/orders',
  admin: '/admin/dashboard',
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

export const LS_KEYS = {
  JWT: 'canteen_jwt',
  USER: 'canteen_user',
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