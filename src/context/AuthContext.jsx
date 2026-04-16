/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '@/services/auth'
import {
  apiClient,
  refreshAccessTokenSilently,
  scheduleSilentRefresh,
  stopSilentRefresh,
  clearStoredAuthStorage,
} from '@/services/api'
import { websocketService } from '@/services/websocketService'
import { LS_KEYS } from '@/utils/constants'
import { canteenService, CANTEEN_STATUS } from '@/services/canteenService'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        user: action.user,
        token: action.token,
        loading: false,
        error: null,
      }

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.user,
        token: action.token,
        loading: false,
        error: null,
      }

    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      }

    case 'SET_LOADING':
      return { ...state, loading: action.value }

    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

function getAuthStorage() {
  return sessionStorage
}

function sanitizeRole(role) {
  return String(role || '').trim().toUpperCase()
}

function normalizeUser(user = {}) {
  return {
    ...user,
    role: sanitizeRole(user.role),
  }
}

function isStaffRole(role) {
  const normalizedRole = sanitizeRole(role)
  return normalizedRole === 'KITCHEN' || normalizedRole === 'MANAGER'
}

function extractAuthErrorMessage(
  error,
  fallback = 'Unable to sign in right now. Please try again.'
) {
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback

  return String(message).trim() || fallback
}

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
  const storage = getAuthStorage()

  storage.setItem(LS_KEYS.JWT, token)

  const payload = decodeJwtPayload(token)
  if (payload?.exp) {
    storage.setItem(LS_KEYS.TOKEN_EXPIRY, String(payload.exp * 1000))
  } else {
    storage.removeItem(LS_KEYS.TOKEN_EXPIRY)
  }
}

function persistAuth(token, user, refreshToken = null) {
  const storage = getAuthStorage()
  const normalizedUser = normalizeUser(user)

  persistTokenMetadata(token)
  storage.setItem(LS_KEYS.USER, JSON.stringify(normalizedUser))

  if (refreshToken) {
    storage.setItem(LS_KEYS.REFRESH_TOKEN, refreshToken)
  } else {
    storage.removeItem(LS_KEYS.REFRESH_TOKEN)
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`

  return normalizedUser
}

function clearStoredAuth() {
  clearStoredAuthStorage()
  delete apiClient.defaults.headers.common.Authorization
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const wsTriedRef = useRef(false)
  const navigate = useNavigate()

  const connectWebSocket = useCallback(async (token, user) => {
    websocketService.disconnect()
    wsTriedRef.current = false

    if (!token || !user) return

    wsTriedRef.current = true

    try {
      await websocketService.connect(token, user)
    } catch {
      wsTriedRef.current = false
    }
  }, [])

  const startSilentRefresh = useCallback(() => {
    scheduleSilentRefresh(async () => {
      return await refreshAccessTokenSilently()
    })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const getStoredSessionBlockMessage = useCallback(async (token, user) => {
    if (!token || !isStaffRole(user?.role)) return ''

    try {
      const canteenState = await canteenService.getState({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return canteenState?.status === CANTEEN_STATUS.CLOSED
        ? 'Canteen is closed. Login not allowed.'
        : ''
    } catch (error) {
      const message = extractAuthErrorMessage(error, '')
      const normalizedMessage = message.toLowerCase()

      if (
        normalizedMessage.includes('canteen is closed') ||
        normalizedMessage.includes('contact your admin')
      ) {
        return message
      }

      console.warn('[AUTH] Unable to verify staff canteen access:', error)
      return ''
    }
  }, [])

  useEffect(() => {
    let active = true

    const initialiseAuth = async () => {
      console.log('[AUTH] INIT START')

      const storage = getAuthStorage()
      const token = storage.getItem(LS_KEYS.JWT)
      const userRaw = storage.getItem(LS_KEYS.USER)

      console.log('[AUTH] INIT STORAGE', {
        hasToken: !!token,
        hasUser: !!userRaw,
      })

      if (token && userRaw) {
        try {
          const user = normalizeUser(JSON.parse(userRaw))
          const blockedMessage = await getStoredSessionBlockMessage(token, user)

          if (!active) return

          if (blockedMessage) {
            clearStoredAuth()
            dispatch({
              type: 'SET_ERROR',
              error: blockedMessage,
            })

            if (window.location.pathname !== '/login') {
              navigate('/login', { replace: true })
            }
            return
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${token}`

          dispatch({
            type: 'INIT',
            user,
            token,
          })

          console.log('[AUTH] INIT SUCCESS', { user })
          connectWebSocket(token, user)
          startSilentRefresh()
        } catch (error) {
          console.error('[AUTH] INIT PARSE FAILED', error)
          clearStoredAuth()

          if (!active) return

          dispatch({
            type: 'INIT',
            user: null,
            token: null,
          })
        }
      } else {
        dispatch({
          type: 'INIT',
          user: null,
          token: null,
        })
        console.log('[AUTH] INIT EMPTY')
      }
    }

    initialiseAuth()

    return () => {
      active = false
      websocketService.disconnect()
      wsTriedRef.current = false
      stopSilentRefresh()
    }
  }, [connectWebSocket, getStoredSessionBlockMessage, navigate, startSilentRefresh])

  const login = useCallback(
    async (credentials) => {
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({ type: 'SET_LOADING', value: true })

      try {
        websocketService.disconnect()
        wsTriedRef.current = false
        stopSilentRefresh()
        clearStoredAuth()

        const result = await authService.login(credentials)

        const token = result?.token
        const refreshToken = result?.refreshToken || null
        const rawUser = result?.user || { email: credentials?.email }
        const user = normalizeUser(rawUser)

        if (!token) {
          throw new Error('Unable to sign in right now. Please try again.')
        }

        const persistedUser = persistAuth(token, user, refreshToken)

        dispatch({
          type: 'LOGIN_SUCCESS',
          user: persistedUser,
          token,
        })

        await connectWebSocket(token, persistedUser)
        startSilentRefresh()

        const displayName = persistedUser?.name || persistedUser?.email || 'User'

        toast.success(`Welcome back, ${displayName}!`)

        return persistedUser
      } catch (error) {
        clearStoredAuth()
        websocketService.disconnect()
        wsTriedRef.current = false
        stopSilentRefresh()
        const message = extractAuthErrorMessage(
          error,
          'Unable to sign in. Please check your credentials and try again.'
        )

        dispatch({
          type: 'SET_ERROR',
          error: message,
        })

        error.message = message
        throw error
      }
    },
    [connectWebSocket, startSilentRefresh]
  )

  const register = useCallback(async (payload) => {
    dispatch({ type: 'SET_LOADING', value: true })

    try {
      const result = await authService.register(payload)
      dispatch({ type: 'CLEAR_ERROR' })
      return result
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error?.message || 'Registration failed',
      })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [])

  const verifyEmail = useCallback(async (payload) => {
    dispatch({ type: 'SET_LOADING', value: true })

    try {
      const result = await authService.verifyEmail(payload)
      dispatch({ type: 'CLEAR_ERROR' })
      return result
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error?.message || 'Email verification failed',
      })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [])

  const forgotPassword = useCallback(async (email) => {
    dispatch({ type: 'SET_LOADING', value: true })

    try {
      const result = await authService.forgotPassword(email)
      dispatch({ type: 'CLEAR_ERROR' })
      return result
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error?.message || 'Failed to send OTP',
      })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [])

  const resetPassword = useCallback(async (payload) => {
    dispatch({ type: 'SET_LOADING', value: true })

    try {
      const result = await authService.resetPassword(payload)
      dispatch({ type: 'CLEAR_ERROR' })
      return result
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error?.message || 'Failed to reset password',
      })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [])

  const resendOtp = useCallback(async (payload) => {
    return await authService.resendOtp(payload)
  }, [])

  const completeOAuthLogin = useCallback(
    async (token, user, refreshToken = null) => {
      if (!token || !user) {
        const error = new Error(
          'Google sign-in could not be completed. Please try again.'
        )
        dispatch({
          type: 'SET_ERROR',
          error: error.message,
        })
        throw error
      }

      dispatch({ type: 'CLEAR_ERROR' })
      websocketService.disconnect()
      wsTriedRef.current = false
      stopSilentRefresh()
      clearStoredAuth()

      try {
        const normalizedUser = persistAuth(token, user, refreshToken)

        dispatch({
          type: 'LOGIN_SUCCESS',
          user: normalizedUser,
          token,
        })

        await connectWebSocket(token, normalizedUser)
        startSilentRefresh()

        const displayName =
          normalizedUser?.name || normalizedUser?.email || 'User'

        toast.success(`Welcome back, ${displayName}!`)
        return normalizedUser
      } catch (error) {
        clearStoredAuth()
        websocketService.disconnect()
        wsTriedRef.current = false
        stopSilentRefresh()

        const message = extractAuthErrorMessage(
          error,
          'Google sign-in failed. Please try again.'
        )

        dispatch({
          type: 'SET_ERROR',
          error: message,
        })

        error.message = message
        throw error
      }
    },
    [connectWebSocket, startSilentRefresh]
  )

  const logout = useCallback(() => {
    clearStoredAuth()
    websocketService.disconnect()
    wsTriedRef.current = false
    stopSilentRefresh()

    dispatch({ type: 'LOGOUT' })
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.user,
        login,
        register,
        verifyEmail,
        forgotPassword,
        resetPassword,
        resendOtp,
        logout,
        completeOAuthLogin,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
