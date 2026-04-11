import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { apiClient } from '@/services/api'
import { websocketService } from '@/services/websocketService'

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
      return {
        ...state,
        loading: action.value,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }

    default:
      return state
  }
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

const STORAGE_KEYS = {
  jwt: `${STORAGE_PREFIX}_jwt`,
  user: `${STORAGE_PREFIX}_user`,
  refreshToken: `${STORAGE_PREFIX}_refresh_token`,
}

function persistAuth(token, user, refreshToken = null) {
  const normalizedUser = normalizeUser(user)

  localStorage.setItem(STORAGE_KEYS.jwt, token)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser))

  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  } else {
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`

  return normalizedUser
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.jwt)
  localStorage.removeItem(STORAGE_KEYS.user)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  delete apiClient.defaults.headers.common.Authorization
}

function isOAuthInProgress() {
  const { pathname, search, hash } = window.location

  return (
    pathname.toLowerCase().includes('oauth') ||
    pathname.toLowerCase().includes('callback') ||
    search.toLowerCase().includes('token=') ||
    search.toLowerCase().includes('accesstoken=') ||
    search.toLowerCase().includes('refreshtoken=') ||
    hash.toLowerCase().includes('token=')
  )
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const wsTriedRef = useRef(false)
  const navigate = useNavigate()

  const connectWebSocket = useCallback(async (token, user, source = 'UNKNOWN') => {
    websocketService.disconnect()
    wsTriedRef.current = false

    if (!token || !user) {
      console.log(`[AUTH] WS ${source} SKIPPED - missing token or user`)
      return
    }

    if (wsTriedRef.current) return

    wsTriedRef.current = true

    try {
      await websocketService.connect(token, user)
      console.log(`[AUTH] WS ${source} CONNECTED`, { role: user?.role })
    } catch (error) {
      console.warn(`[AUTH] WS ${source} CONNECT FAILED`, error)
      wsTriedRef.current = false
    }
  }, [])

  useEffect(() => {
    console.log('[AUTH] INIT START')

    if (isOAuthInProgress()) {
      console.log('[AUTH] INIT SKIPPED - OAuth in progress')

      clearStoredAuth()

      dispatch({
        type: 'INIT',
        user: null,
        token: null,
      })

      return () => {
        websocketService.disconnect()
        wsTriedRef.current = false
      }
    }

    const token = localStorage.getItem(STORAGE_KEYS.jwt)
    const userRaw = localStorage.getItem(STORAGE_KEYS.user)

    console.log('[AUTH] INIT STORAGE', {
      storagePrefix: STORAGE_PREFIX,
      hasToken: !!token,
      hasUser: !!userRaw,
    })

    if (token && userRaw) {
      try {
        const storedUser = JSON.parse(userRaw)
        const user = normalizeUser(storedUser)

        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`

        dispatch({
          type: 'INIT',
          user,
          token,
        })

        console.log('[AUTH] INIT SUCCESS', { user })
        connectWebSocket(token, user, 'INIT')
      } catch (error) {
        console.error('[AUTH] INIT PARSE FAILED', error)

        clearStoredAuth()

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

    return () => {
      websocketService.disconnect()
      wsTriedRef.current = false
    }
  }, [connectWebSocket])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const login = useCallback(async (credentials) => {
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] LOGIN START')

    try {
      const trimmedCredentials = {
        email: credentials.email?.trim() || '',
        password: credentials.password || '',
      }

      console.log('[AUTH] BEFORE authService.login', trimmedCredentials)

      clearStoredAuth()
      websocketService.disconnect()
      wsTriedRef.current = false

      const { token, refreshToken, user } = await authService.login(trimmedCredentials)

      console.log('[AUTH] AFTER authService.login', {
        token: !!token,
        refreshToken: !!refreshToken,
        user,
      })

      if (!token || !user) {
        throw new Error('Login response missing token or user')
      }

      const normalizedUser = persistAuth(token, user, refreshToken)

      dispatch({
        type: 'LOGIN_SUCCESS',
        user: normalizedUser,
        token,
      })

      await connectWebSocket(token, normalizedUser, 'LOGIN')

      console.log('[AUTH] LOGIN SUCCESS')
      return normalizedUser
    } catch (err) {
      console.error('[AUTH] LOGIN ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Login failed',
      })

      throw err
    }
  }, [connectWebSocket])

  const register = useCallback(async (data) => {
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] REGISTER START')

    try {
      const response = await authService.register({
        name: data.name?.trim() || '',
        email: data.email?.trim() || '',
        password: data.password || '',
      })

      dispatch({
        type: 'SET_LOADING',
        value: false,
      })

      console.log('[AUTH] REGISTER SUCCESS - OTP SENT', response)

      return {
        email: data.email?.trim() || '',
        ...response,
      }
    } catch (err) {
      console.error('[AUTH] REGISTER ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Registration failed',
      })

      throw err
    }
  }, [])

  const verifyEmail = useCallback(async ({ email, otp }) => {
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] VERIFY EMAIL START')

    try {
      const response = await authService.verifyEmail({
        email: email?.trim() || '',
        otp: otp?.trim() || '',
      })

      dispatch({
        type: 'SET_LOADING',
        value: false,
      })

      console.log('[AUTH] VERIFY EMAIL SUCCESS', response)
      return response
    } catch (err) {
      console.error('[AUTH] VERIFY EMAIL ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Email verification failed',
      })

      throw err
    }
  }, [])

  const forgotPassword = useCallback(async (email) => {
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] FORGOT PASSWORD START')

    try {
      const response = await authService.forgotPassword(email?.trim() || '')

      dispatch({
        type: 'SET_LOADING',
        value: false,
      })

      console.log('[AUTH] FORGOT PASSWORD SUCCESS', response)
      return response
    } catch (err) {
      console.error('[AUTH] FORGOT PASSWORD ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Failed to send OTP',
      })

      throw err
    }
  }, [])

  const resetPassword = useCallback(async ({ email, otp, newPassword }) => {
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] RESET PASSWORD START')

    try {
      const response = await authService.resetPassword({
        email: email?.trim() || '',
        otp: otp?.trim() || '',
        newPassword: newPassword || '',
      })

      dispatch({
        type: 'SET_LOADING',
        value: false,
      })

      console.log('[AUTH] RESET PASSWORD SUCCESS', response)
      return response
    } catch (err) {
      console.error('[AUTH] RESET PASSWORD ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Password reset failed',
      })

      throw err
    }
  }, [])

  const resendOtp = useCallback(async ({ email, type }) => {
    dispatch({ type: 'CLEAR_ERROR' })
    console.log('[AUTH] RESEND OTP START', { email, type })

    try {
      const response = await authService.resendOtp({
        email: email?.trim() || '',
        type,
      })

      console.log('[AUTH] RESEND OTP SUCCESS', response)
      return response
    } catch (err) {
      console.error('[AUTH] RESEND OTP ERROR', err)

      dispatch({
        type: 'SET_ERROR',
        error: err?.message || 'Failed to resend OTP',
      })

      throw err
    }
  }, [])

  const completeOAuthLogin = useCallback(async (token, user, refreshToken = null) => {
    if (!token || !user) {
      throw new Error('OAuth login requires token and user')
    }

    clearStoredAuth()
    websocketService.disconnect()
    wsTriedRef.current = false

    const normalizedUser = persistAuth(token, user, refreshToken)

    dispatch({
      type: 'LOGIN_SUCCESS',
      user: normalizedUser,
      token,
    })

    await connectWebSocket(token, normalizedUser, 'OAUTH')

    console.log('[AUTH] OAUTH LOGIN SUCCESS', normalizedUser)
    return normalizedUser
  }, [connectWebSocket])

  const logout = useCallback(async () => {
    console.log('[AUTH] LOGOUT START')

    try {
      await authService.logout()
      console.log('[AUTH] LOGOUT API SUCCESS')
    } catch (err) {
      console.error('[AUTH] LOGOUT API FAILED', err)
    }

    clearStoredAuth()

    console.log('[AUTH] STORAGE CLEARED', {
      jwt: localStorage.getItem(STORAGE_KEYS.jwt),
      user: localStorage.getItem(STORAGE_KEYS.user),
      refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
    })

    websocketService.disconnect()
    wsTriedRef.current = false

    dispatch({ type: 'LOGOUT' })
    console.log('[AUTH] LOGOUT DISPATCHED')

    navigate('/login', { replace: true })
    console.log('[AUTH] NAVIGATE LOGIN')
  }, [navigate])

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    role: state.user?.role ?? null,
    isUser: sanitizeRole(state.user?.role) === 'USER',
    isAdmin: sanitizeRole(state.user?.role) === 'ADMIN',
    isManager: sanitizeRole(state.user?.role) === 'MANAGER',
    isKitchen: sanitizeRole(state.user?.role) === 'KITCHEN',
    login,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendOtp,
    logout,
    clearError,
    completeOAuthLogin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}