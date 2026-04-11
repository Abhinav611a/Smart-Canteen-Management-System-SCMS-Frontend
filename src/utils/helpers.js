/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)

/**
 * Format date/time helpers
 */
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

export const formatDateTime = (iso) => `${formatDate(iso)} at ${formatTime(iso)}`

/**
 * Truncate address
 */
export const truncateAddress = (addr, start = 6, end = 4) => {
  if (!addr) return '—'
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

/**
 * Truncate tx hash
 */
export const truncateTxHash = (hash) => {
  if (!hash) return '—'
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

/**
 * Role-based home routes
 */
export const getRoleHome = (role) => {
  switch (String(role || '').toUpperCase()) {
    case 'USER':
      return '/student/menu'
    case 'MANAGER':
      return '/chef/orders'
    case 'ADMIN':
      return '/admin/dashboard'
    case 'KITCHEN':
      return '/kitchen/dashboard'
    default:
      return '/login'
  }
}

/**
 * Debounce
 */
export const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Get initials from name
 */
export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

/**
 * Sleep (for loading states in dev)
 */
export const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text) => {
  if (!text) return false

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }

    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}