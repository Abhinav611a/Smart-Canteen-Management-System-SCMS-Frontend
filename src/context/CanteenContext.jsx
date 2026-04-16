/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/context/AuthContext'
import {
  canteenService,
  CANTEEN_STATUS,
  getCanteenView,
  normaliseCanteenState,
  parseCanteenTimestamp,
} from '@/services/canteenService'

const CanteenContext = createContext(null)

const DEFAULT_RAW_STATE = {
  status: CANTEEN_STATUS.CLOSED,
  closingSoonUntil: null,
  closingSoonUntilMs: null,
  kitchenReady: false,
  managerReady: false,
}

function getRemainingMsForStatus(status, closingSoonUntilMs) {
  if (status !== CANTEEN_STATUS.OPEN || closingSoonUntilMs == null) return 0

  return Math.max(0, closingSoonUntilMs - Date.now())
}

function formatCountdown(ms) {
  if (!ms || ms <= 0) return '00:00'

  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CanteenProvider({ children }) {
  const { user } = useAuth()
  const [rawState, setRawState] = useState(DEFAULT_RAW_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now()) // Used to trigger re-renders for countdown timer
  const [lastUpdate, setLastUpdate] = useState(null)
  const previousStatusRef = useRef(DEFAULT_RAW_STATE.status)
  const hasWebSocketDataRef = useRef(false)
  const isConnectedRef = useRef(false)
  const hasResolvedStateRef = useRef(false)

  const applyStateUpdate = useCallback(
    (incomingState, { source = 'unknown', markWebSocket = false } = {}) => {
      const nextState = normaliseCanteenState(incomingState)
      const previousStatus = previousStatusRef.current

      if (
        user &&
        previousStatus === CANTEEN_STATUS.CLOSING &&
        nextState.status === CANTEEN_STATUS.CLOSED
      ) {
        toast.success(
          'Canteen is now closed. All active orders have been completed.',
          { id: 'canteen-auto-closed' }
        )
      }

      setRawState(nextState)
      previousStatusRef.current = nextState.status
      hasResolvedStateRef.current = true
      setLoading(false)
      setError('')
      setNow(Date.now())

      if (markWebSocket) {
        hasWebSocketDataRef.current = true
      }

      setLastUpdate({
        at: Date.now(),
        payload: nextState,
        source,
      })
    },
    [user]
  )

  const { isConnected } = useWebSocket(
    'canteen:status',
    (payload) => {
      applyStateUpdate(payload, {
        source: 'websocket',
        markWebSocket: true,
      })
    },
    true
  )
  isConnectedRef.current = isConnected

  const refresh = useCallback(async () => {
    // Only skip REST refresh when websocket is connected and has provided data
    if (isConnected && hasWebSocketDataRef.current) {
      setLoading(false)
      return
    }

    try {
      if (!hasResolvedStateRef.current) {
        setLoading(true)
      }
      setError('')

      const state = await canteenService.getState()

      // Ignore stale REST data if websocket became authoritative while fetching.
      if (isConnectedRef.current && hasWebSocketDataRef.current) {
        return
      }

      applyStateUpdate(state, { source: 'rest' })
    } catch (err) {
      console.warn('[CANTEEN] Failed to fetch state:', err)
      setError(err?.message || 'Failed to fetch canteen status')
    } finally {
      if (!hasResolvedStateRef.current) {
        setLoading(false)
      }
    }
  }, [applyStateUpdate, isConnected])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isConnected) {
      hasWebSocketDataRef.current = false
    }
  }, [isConnected])

  useEffect(() => {
    previousStatusRef.current = rawState.status
  }, [rawState.status])

  const remainingMs = useMemo(
    () =>
      getRemainingMsForStatus(
        rawState.status,
        rawState.closingSoonUntilMs ??
          parseCanteenTimestamp(rawState.closingSoonUntil)
      ),
    [rawState.status, rawState.closingSoonUntilMs, rawState.closingSoonUntil, now]
  )

  useEffect(() => {
    if (rawState.status !== CANTEEN_STATUS.OPEN) return undefined
    if (rawState.closingSoonUntilMs == null) return undefined
    if (remainingMs <= 0) return undefined

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [rawState.status, rawState.closingSoonUntilMs, remainingMs])

  const value = useMemo(() => {
    const base = getCanteenView(rawState)

    return {
      ...base,
      loading,
      error,
      refresh,
      remainingMs,
      countdown: formatCountdown(remainingMs),
      hasClosingWarning: base.isClosingSoon,
      isOrderingAllowed: base.canOrder,
      isOperatingAllowed: base.canOperate,
      isConnected,
      lastUpdate,
    }
  }, [rawState, loading, error, refresh, remainingMs, isConnected, lastUpdate])

  return (
    <CanteenContext.Provider value={value}>
      {children}
    </CanteenContext.Provider>
  )
}

export function useCanteen() {
  const ctx = useContext(CanteenContext)

  if (!ctx) {
    throw new Error('useCanteen must be used within CanteenProvider')
  }

  return ctx
}
