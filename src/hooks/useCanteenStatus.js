import { useEffect, useMemo, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
  canteenService,
  getCanteenView,
  normaliseCanteenState,
  CANTEEN_STATUS,
} from '@/services/canteenService'

const DEFAULT_STATE = getCanteenView({
  status: CANTEEN_STATUS.CLOSED,
  closingSoonUntil: null,
  kitchenReady: false,
  managerReady: false,
})

function getRemainingMs(closingSoonUntil) {
  if (!closingSoonUntil) return 0
  return Math.max(0, new Date(closingSoonUntil).getTime() - Date.now())
}

function formatCountdown(ms) {
  if (!ms || ms <= 0) return '0:00'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function useCanteenStatus(enabled = true) {
  const [canteenState, setCanteenState] = useState(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  // ✅ 1. INITIAL FETCH (ONLY ONCE)
  useEffect(() => {
    if (!enabled) return

    let mounted = true

    const init = async () => {
      try {
        const state = await canteenService.getState()

        if (mounted) {
          setCanteenState(getCanteenView(state))
        }
      } catch (err) {
        console.warn('Failed to fetch canteen state:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [enabled])

  // ✅ 2. REAL-TIME WEBSOCKET UPDATES
  const { isConnected, lastUpdate } = useWebSocket(
    'canteen:status',
    (payload) => {
      const next = getCanteenView(normaliseCanteenState(payload))
      setCanteenState(next)
      setLoading(false)
      setNow(Date.now())
    },
    enabled
  )

  // ✅ 3. COUNTDOWN TIMER
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const remainingMs = useMemo(
    () => getRemainingMs(canteenState.closingSoonUntil),
    [canteenState.closingSoonUntil, now]
  )

  const countdown = useMemo(() => formatCountdown(remainingMs), [remainingMs])

  return {
    ...canteenState,
    isConnected,
    lastUpdate,
    loading,
    remainingMs,
    countdown,
  }
}