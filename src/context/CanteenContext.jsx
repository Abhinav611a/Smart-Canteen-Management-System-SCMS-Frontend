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
import {
  canteenService,
  CANTEEN_STATUS,
  getCanteenView,
  normaliseCanteenState,
} from '@/services/canteenService'

const CanteenContext = createContext(null)

const DEFAULT_RAW_STATE = {
  status: CANTEEN_STATUS.CLOSED,
  closingSoonUntil: null,
  kitchenReady: false,
  managerReady: false,
}

function getRemainingMs(closingSoonUntil) {
  if (!closingSoonUntil) return 0

  const ts = new Date(closingSoonUntil).getTime()
  if (Number.isNaN(ts)) return 0

  return Math.max(0, ts - Date.now())
}

function formatCountdown(ms) {
  if (!ms || ms <= 0) return '0:00'

  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function CanteenProvider({ children }) {
  const [rawState, setRawState] = useState(DEFAULT_RAW_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // eslint-disable-next-line no-unused-vars
  const [now, setNow] = useState(Date.now()) // Used to trigger re-renders for countdown timer
  const [lastUpdate, setLastUpdate] = useState(null)
  const previousStatusRef = useRef(DEFAULT_RAW_STATE.status)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const state = await canteenService.getState()
      const nextState = normaliseCanteenState(state)

      setRawState(nextState)
      previousStatusRef.current = nextState.status
      setNow(Date.now())
    } catch (err) {
      console.warn('[CANTEEN] Failed to fetch state:', err)
      setError(err?.message || 'Failed to fetch canteen status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    previousStatusRef.current = rawState.status
  }, [rawState.status])

  const { isConnected } = useWebSocket(
    'canteen:status',
    (payload) => {
      const nextState = normaliseCanteenState(payload)
      const previousStatus = previousStatusRef.current

      if (
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
      setLoading(false)
      setError('')
      setNow(Date.now())
      setLastUpdate({
        at: Date.now(),
        payload: nextState,
      })
    },
    true
  )

  const remainingMs = useMemo(
    () => getRemainingMs(rawState.closingSoonUntil),
    [rawState.closingSoonUntil]
  )

  useEffect(() => {
    if (!rawState.closingSoonUntil) return undefined
    if (remainingMs <= 0) return undefined

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [rawState.closingSoonUntil, remainingMs])

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
