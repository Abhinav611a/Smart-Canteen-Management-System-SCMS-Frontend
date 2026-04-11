import axios from 'axios'
import toast from 'react-hot-toast'
import { BACKEND_URL, LS_KEYS } from '@/utils/constants'

let networkErrLastShown = 0
const NETWORK_ERR_DEBOUNCE_MS = 5000

let isRefreshing = false
let refreshPromise = null
let silentRefreshTimer = null

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

function persistTokenMetadata(token) {
  localStorage.setItem(LS_KEYS.JWT, token)

  const payload = decodeJwtPayload(token)
  if (payload?.exp) {
    localStorage.setItem(LS_KEYS.TOKEN_EXPIRY, String(payload.exp * 1000))
  } else {
    localStorage.removeItem(LS_KEYS.TOKEN_EXPIRY)
  }
}

function getStoredJwt() {
  return localStorage.getItem(LS_KEYS.JWT)
}

function getStoredRefreshToken() {
  return localStorage.getItem(LS_KEYS.REFRESH_TOKEN)
}

function clearStoredAuthStorage() {
  localStorage.removeItem(LS_KEYS.JWT)
  localStorage.removeItem(LS_KEYS.USER)
  localStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(LS_KEYS.TOKEN_EXPIRY)
}

function isPublicAuthEndpoint(url = '') {
  return (
    url.includes('/users/register') ||
    url.includes('/users/login') ||
    url.includes('/users/verify-email') ||
    url.includes('/users/resend-otp') ||
    url.includes('/users/forgot-password') ||
    url.includes('/users/reset-password') ||
    url.includes('/users/refresh')
  )
}

export function stopSilentRefresh() {
  if (silentRefreshTimer) {
    clearTimeout(silentRefreshTimer)
    silentRefreshTimer = null
  }
}

export function scheduleSilentRefresh(refreshFn) {
  stopSilentRefresh()

  const expiry = Number(localStorage.getItem(LS_KEYS.TOKEN_EXPIRY))
  if (!expiry) return

  const timeLeft = expiry - Date.now()
  const refreshTime = timeLeft - 60_000

  if (refreshTime <= 0) {
    refreshFn().catch(() => {})
    return
  }

  silentRefreshTimer = window.setTimeout(async () => {
    try {
      await refreshFn()
      scheduleSilentRefresh(refreshFn)
    } catch {
      stopSilentRefresh()
    }
  }, refreshTime)
}

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredJwt()
    const url = config.url || ''

    if (token && !isPublicAuthEndpoint(url)) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization
    }

    return config
  },
  (error) => Promise.reject(error),
)

export async function refreshAccessTokenSilently() {
  const refreshToken = getStoredRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await axios.post(
    `${BACKEND_URL}/users/refresh`,
    { refreshToken },
    {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  )

  const body = response.data
  const data =
    body && typeof body === 'object' && 'success' in body ? body.data : body

  const newAccessToken = data?.accessToken || data?.token || null
  const newRefreshToken = data?.refreshToken || refreshToken

  if (!newAccessToken) {
    throw new Error('Refresh response missing access token')
  }

  persistTokenMetadata(newAccessToken)
  localStorage.setItem(LS_KEYS.REFRESH_TOKEN, newRefreshToken)
  apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

  return newAccessToken
}

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data

    if (body && typeof body === 'object' && 'success' in body) {
      return body.data
    }

    if (typeof body === 'string') {
      return body
    }

    return body
  },
  async (error) => {
    const status = error.response?.status
    const body = error.response?.data
    const url = error.config?.url || ''
    const originalRequest = error.config || ''

    const message =
      body?.message ||
      body?.error ||
      error.message ||
      'Something went wrong'

    const onAuthPage =
      window.location.pathname.includes('/login') ||
      window.location.pathname.includes('/register') ||
      window.location.pathname.includes('/forgot-password') ||
      window.location.pathname.includes('/reset-password') ||
      window.location.pathname.includes('/oauth-success')

    if (
      status === 401 &&
      !isPublicAuthEndpoint(url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      try {
        if (!isRefreshing) {
          isRefreshing = true
          refreshPromise = refreshAccessTokenSilently().finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
        }

        const newToken = await refreshPromise

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        return apiClient(originalRequest)
      } catch (refreshError) {
        clearStoredAuthStorage()
        delete apiClient.defaults.headers.common.Authorization

        if (!onAuthPage) {
          toast.error('Session expired. Please login again.')
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      }
    }

    switch (true) {
      case status === 403:
        toast.error('You do not have permission to perform this action.')
        break

      case status === 404:
      case status === 422:
        break

      case typeof status === 'number' && status >= 500:
        toast.error('Server error. Please try again later.')
        break

      case !error.response: {
        const now = Date.now()
        if (now - networkErrLastShown > NETWORK_ERR_DEBOUNCE_MS) {
          networkErrLastShown = now
          toast.error(
            'Network error. Check your connection or try again shortly.',
            { id: 'network-error' },
          )
        }
        break
      }

      default:
        break
    }

    error.message = message
    return Promise.reject(error)
  },
)

const api = {
  get: (url, config) => {
    if (!url) {
      console.error('❌ API CALLED WITHOUT URL')
      throw new Error('API URL missing')
    }

    console.log('👉 API GET:', url)
    return apiClient.get(url, config)
  },

  post: (url, data, config) => {
    if (!url) {
      console.error('❌ API CALLED WITHOUT URL')
      throw new Error('API URL missing')
    }

    console.log('👉 API POST:', url)
    return apiClient.post(url, data, config)
  },

  put: (url, data, config) => {
    if (!url) {
      console.error('❌ API CALLED WITHOUT URL')
      throw new Error('API URL missing')
    }

    console.log('👉 API PUT:', url)
    return apiClient.put(url, data, config)
  },

  patch: (url, data, config) => {
    if (!url) {
      console.error('❌ API CALLED WITHOUT URL')
      throw new Error('API URL missing')
    }

    console.log('👉 API PATCH:', url)
    return apiClient.patch(url, data, config)
  },

  delete: (url, config) => {
    if (!url) {
      console.error('❌ API CALLED WITHOUT URL')
      throw new Error('API URL missing')
    }

    console.log('👉 API DELETE:', url)
    return apiClient.delete(url, config)
  },
}

export default api