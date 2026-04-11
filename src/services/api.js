import axios from 'axios'
import toast from 'react-hot-toast'
import { BACKEND_URL, LS_KEYS } from '@/utils/constants'

let networkErrLastShown = 0
const NETWORK_ERR_DEBOUNCE_MS = 5000

function getStoredJwt() {
  return localStorage.getItem(LS_KEYS.JWT)
}

function clearStoredAuthStorage() {
  localStorage.removeItem(LS_KEYS.JWT)
  localStorage.removeItem(LS_KEYS.USER)

  if (LS_KEYS.REFRESH_TOKEN) {
    localStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
  }
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
    const isPublicAuthEndpoint =
      url.includes('/users/register') ||
      url.includes('/users/login') ||
      url.includes('/users/verify-email') ||
      url.includes('/users/resend-otp') ||
      url.includes('/users/forgot-password') ||
      url.includes('/users/reset-password') ||
      url.includes('/users/refresh')

    if (token && !isPublicAuthEndpoint) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization
    }

    return config
  },
  (error) => Promise.reject(error),
)

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
  (error) => {
    const status = error.response?.status
    const body = error.response?.data
    const url = error.config?.url || ''

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

    const isPublicAuthEndpoint =
      url.includes('/users/register') ||
      url.includes('/users/login') ||
      url.includes('/users/verify-email') ||
      url.includes('/users/resend-otp') ||
      url.includes('/users/forgot-password') ||
      url.includes('/users/reset-password') ||
      url.includes('/users/refresh')

    switch (true) {
      case status === 401:
        if (!isPublicAuthEndpoint) {
          clearStoredAuthStorage()
          delete apiClient.defaults.headers.common.Authorization

          if (!onAuthPage) {
            toast.error('Session expired. Please login again.')
            window.location.href = '/login'
          }
        }
        break

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