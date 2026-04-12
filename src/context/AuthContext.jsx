import React, {
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

  useEffect(() => {
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
      stopSilentRefresh()
    }
  }, [connectWebSocket, startSilentRefresh])

  const login = useCallback(
    async (credentials) => {
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
          throw new Error('Login response missing token')
        }

        const persistedUser = persistAuth(token, user, refreshToken)

        dispatch({
          type: 'LOGIN_SUCCESS',
          user: persistedUser,
          token,
        })

        await connectWebSocket(token, persistedUser)
        startSilentRefresh()

        const displayName =
          persistedUser?.name ||
          persistedUser?.email ||
          'User'

        toast.success(`Welcome back, ${displayName}!`)

        return persistedUser
      } catch (error) {
        clearStoredAuth()
        websocketService.disconnect()
        wsTriedRef.current = false
        stopSilentRefresh()

        dispatch({
          type: 'SET_ERROR',
          error: error?.message || 'Login failed',
        })

        throw error
      }
    },
    [connectWebSocket, startSilentRefresh]
  )

  const completeOAuthLogin = useCallback(
    async (token, user, refreshToken = null) => {
      if (!token || !user) {
        throw new Error('OAuth login requires token and user')
      }

      websocketService.disconnect()
      wsTriedRef.current = false
      stopSilentRefresh()
      clearStoredAuth()

      const normalizedUser = persistAuth(token, user, refreshToken)

      dispatch({
        type: 'LOGIN_SUCCESS',
        user: normalizedUser,
        token,
      })

      await connectWebSocket(token, normalizedUser)
      startSilentRefresh()

      const displayName =
        normalizedUser?.name ||
        normalizedUser?.email ||
        'User'

      toast.success(`Welcome back, ${displayName}!`)
      return normalizedUser
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
        logout,
        completeOAuthLogin,
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