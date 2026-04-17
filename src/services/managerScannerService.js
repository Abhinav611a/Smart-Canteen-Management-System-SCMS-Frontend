import axios from 'axios'
import api from './api'
import { extractQrCodeValue } from './orders'
import { BACKEND_URL, ENDPOINTS, LS_KEYS } from '@/utils/constants'

const scannerApiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

function unwrapResponseData(response) {
  const body = response?.data

  if (body && typeof body === 'object' && 'success' in body) {
    return body.data
  }

  return body
}

function getScannerStorage() {
  return sessionStorage
}

function buildScannerUrl(token, scannerUrl = '') {
  const normalizedUrl = String(scannerUrl || '').trim()

  if (normalizedUrl) {
    try {
      const baseOrigin =
        typeof window === 'undefined' ? 'http://localhost' : window.location.origin
      return new URL(normalizedUrl, baseOrigin).toString()
    } catch {
      return normalizedUrl
    }
  }

  if (!token) return ''
  if (typeof window === 'undefined') return ''

  const fallbackUrl = new URL('/manager/external-scanner', window.location.origin)
  fallbackUrl.searchParams.set('token', token)
  return fallbackUrl.toString()
}

function normaliseScannerSession(raw = {}) {
  const token = String(raw?.token ?? raw?.sessionToken ?? '').trim()

  return {
    token,
    scannerUrl: buildScannerUrl(token, raw?.scannerUrl ?? raw?.url),
    createdAt: raw?.createdAt ?? null,
    expiresAt: raw?.expiresAt ?? null,
  }
}

function getScannerSessionErrorMessage(
  error,
  fallback = 'Unable to manage the external scanner right now.',
) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback

  return String(message || '').trim() || fallback
}

function tagExpiredScannerError(error, fallback) {
  const taggedError = error instanceof Error ? error : new Error(fallback)
  taggedError.scannerSessionExpired = true
  taggedError.message = getScannerSessionErrorMessage(taggedError, fallback)
  return taggedError
}

export function isScannerSessionExpiredError(error) {
  if (error?.scannerSessionExpired) return true

  const status = error?.response?.status
  const message = getScannerSessionErrorMessage(error, '').toLowerCase()

  return (
    status === 401 ||
    status === 403 ||
    message.includes('scanner session expired') ||
    message.includes('session expired') ||
    message.includes('session revoked') ||
    message.includes('invalid scanner session') ||
    message.includes('invalid scanner token') ||
    message.includes('scanner token expired') ||
    message.includes('unauthorized scanner session')
  )
}

function getScannerAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export const managerScannerService = {
  getStoredSession() {
    try {
      const raw = getScannerStorage().getItem(LS_KEYS.MANAGER_SCANNER_SESSION)
      if (!raw) return null

      const session = normaliseScannerSession(JSON.parse(raw))
      return session.token ? session : null
    } catch {
      getScannerStorage().removeItem(LS_KEYS.MANAGER_SCANNER_SESSION)
      return null
    }
  },

  persistSession(session) {
    const normalizedSession = normaliseScannerSession(session)

    if (!normalizedSession.token) {
      return null
    }

    getScannerStorage().setItem(
      LS_KEYS.MANAGER_SCANNER_SESSION,
      JSON.stringify(normalizedSession),
    )

    return normalizedSession
  },

  clearStoredSession() {
    getScannerStorage().removeItem(LS_KEYS.MANAGER_SCANNER_SESSION)
  },

  async createSession() {
    const raw = await api.post(ENDPOINTS.MANAGER_SCANNER_SESSION)
    const session = this.persistSession(raw)

    if (!session?.token || !session?.scannerUrl) {
      throw new Error('Scanner session response was incomplete.')
    }

    return session
  },

  async disconnectSession({ clearStoredOnFailure = false } = {}) {
    try {
      await api.delete(ENDPOINTS.MANAGER_SCANNER_SESSION)
      this.clearStoredSession()
      return true
    } catch (error) {
      if (error?.response?.status === 404 || isScannerSessionExpiredError(error)) {
        this.clearStoredSession()
        return false
      }

      if (clearStoredOnFailure) {
        this.clearStoredSession()
      }

      throw error
    }
  },

  async validateSession(token) {
    const normalizedToken = String(token || '').trim()

    if (!normalizedToken) {
      throw tagExpiredScannerError(
        new Error('Scanner session token is missing.'),
        'Scanner session token is missing.',
      )
    }

    try {
      const response = await scannerApiClient.get(
        ENDPOINTS.MANAGER_SCANNER_SESSION_VALIDATE,
        {
          headers: getScannerAuthHeaders(normalizedToken),
        },
      )

      return normaliseScannerSession(unwrapResponseData(response))
    } catch (error) {
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.response?.status === 404
      ) {
        throw tagExpiredScannerError(
          error,
          'Scanner session expired. Ask the manager to reconnect.',
        )
      }

      throw error
    }
  },

  async verifyOrder(code, token) {
    const normalizedCode = extractQrCodeValue(code)
    const normalizedToken = String(token || '').trim()

    if (!normalizedToken) {
      throw tagExpiredScannerError(
        new Error('Scanner session token is missing.'),
        'Scanner session expired. Ask the manager to reconnect.',
      )
    }

    try {
      const response = await scannerApiClient.get(ENDPOINTS.ORDER_VERIFY, {
        params: { code: normalizedCode },
        headers: getScannerAuthHeaders(normalizedToken),
      })

      return unwrapResponseData(response)
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        throw tagExpiredScannerError(
          error,
          'Scanner session expired. Ask the manager to reconnect.',
        )
      }

      throw error
    }
  },
}
