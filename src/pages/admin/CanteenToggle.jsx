import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Power, TimerReset } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useCanteen } from '@/context/CanteenContext'
import { canteenService, CANTEEN_STATUS } from '@/services/canteenService'

const LIFECYCLE_STATUS = {
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  CLOSING_SOON: 'CLOSING_SOON',
  CLOSING: 'CLOSING',
}

function normalizeStatus(status) {
  return String(status || '').toUpperCase()
}

function getDerivedStatus({
  backendStatus,
  closingSoonUntilMs,
  remainingMs,
  pendingStatus,
}) {
  if (pendingStatus) return pendingStatus

  const status = normalizeStatus(backendStatus)
  const hasClosingSoonWindow = closingSoonUntilMs != null

  if (status === CANTEEN_STATUS.OPEN && hasClosingSoonWindow) {
    return remainingMs > 0
      ? LIFECYCLE_STATUS.CLOSING_SOON
      : LIFECYCLE_STATUS.CLOSING
  }

  return Object.values(LIFECYCLE_STATUS).includes(status)
    ? status
    : LIFECYCLE_STATUS.CLOSED
}

function getSliderView(derivedStatus, countdown) {
  switch (derivedStatus) {
    case LIFECYCLE_STATUS.OPENING:
      return {
        text: 'Opening',
        subtext: 'Preparing canteen...',
        title: 'Please wait...',
        knobX: 16,
        tone:
          'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100',
        track: 'bg-sky-200/80 dark:bg-sky-500/25',
        fill: 'bg-sky-400 dark:bg-sky-300',
        dot: 'bg-sky-500 dark:bg-sky-300',
        knob: 'bg-white text-sky-600 dark:bg-sky-100 dark:text-sky-700',
        glow: '0 10px 28px rgba(14,165,233,0.18)',
        icon: Loader2,
        moving: true,
        disabled: true,
      }

    case LIFECYCLE_STATUS.OPEN:
      return {
        text: 'Open',
        subtext: 'Accepting new orders',
        title: 'Click to start closing soon',
        knobX: 32,
        tone:
          'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100',
        track: 'bg-emerald-200/80 dark:bg-emerald-500/25',
        fill: 'bg-emerald-500 dark:bg-emerald-300',
        dot: 'bg-emerald-500 dark:bg-emerald-300',
        knob: 'bg-white text-emerald-600 dark:bg-emerald-100 dark:text-emerald-700',
        glow: '0 10px 28px rgba(16,185,129,0.2)',
        icon: Power,
        moving: false,
        disabled: false,
      }

    case LIFECYCLE_STATUS.CLOSING_SOON:
      return {
        text: 'Closing soon',
        subtext: countdown || '00:00',
        title: 'Click to close now',
        knobX: 32,
        tone:
          'border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100',
        track: 'bg-amber-200/80 dark:bg-amber-500/25',
        fill: 'bg-amber-500 dark:bg-amber-300',
        dot: 'bg-amber-500 dark:bg-amber-300',
        knob: 'bg-white text-amber-600 dark:bg-amber-100 dark:text-amber-700',
        glow: '0 10px 28px rgba(245,158,11,0.22)',
        icon: TimerReset,
        moving: false,
        disabled: false,
      }

    case LIFECYCLE_STATUS.CLOSING:
      return {
        text: 'Closing',
        subtext: 'Finishing existing orders...',
        title: 'Please wait...',
        knobX: 16,
        tone:
          'border-pink-200 bg-pink-50 text-pink-950 dark:border-pink-500/25 dark:bg-pink-500/10 dark:text-pink-100',
        track: 'bg-pink-200/80 dark:bg-pink-500/25',
        fill: 'bg-pink-500 dark:bg-pink-300',
        dot: 'bg-pink-500 dark:bg-pink-300',
        knob: 'bg-white text-pink-600 dark:bg-pink-100 dark:text-pink-700',
        glow: '0 10px 28px rgba(236,72,153,0.18)',
        icon: Loader2,
        moving: true,
        disabled: true,
      }

    case LIFECYCLE_STATUS.CLOSED:
    default:
      return {
        text: 'Closed',
        subtext: 'Not accepting orders',
        title: 'Click to open canteen',
        knobX: 0,
        tone:
          'border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100',
        track: 'bg-rose-200/80 dark:bg-rose-500/20',
        fill: 'bg-rose-400 dark:bg-rose-300',
        dot: 'bg-rose-500/70 dark:bg-rose-300/70',
        knob: 'bg-white text-rose-600 dark:bg-rose-100 dark:text-rose-700',
        glow: '0 8px 22px rgba(244,63,94,0.12)',
        icon: Power,
        moving: false,
        disabled: false,
      }
  }
}

export default function CanteenToggle() {
  const { user } = useAuth()
  const {
    loading: canteenLoading,
    status,
    closingSoonUntilMs,
    remainingMs,
    countdown,
    refresh,
  } = useCanteen()
  const [pendingStatus, setPendingStatus] = useState(null)
  const [requestInFlight, setRequestInFlight] = useState(false)
  const refreshedAtCountdownEndRef = useRef(false)

  const isAdmin = normalizeStatus(user?.role) === 'ADMIN'
  const isApiPending = requestInFlight

  const derivedStatus = useMemo(
    () =>
      getDerivedStatus({
        backendStatus: status,
        closingSoonUntilMs,
        remainingMs,
        pendingStatus,
      }),
    [status, closingSoonUntilMs, remainingMs, pendingStatus]
  )

  const view = useMemo(
    () => getSliderView(derivedStatus, countdown),
    [derivedStatus, countdown]
  )

  useEffect(() => {
    if (derivedStatus !== LIFECYCLE_STATUS.CLOSING) {
      refreshedAtCountdownEndRef.current = false
      return
    }

    if (
      normalizeStatus(status) === CANTEEN_STATUS.OPEN &&
      closingSoonUntilMs != null &&
      remainingMs <= 0 &&
      !refreshedAtCountdownEndRef.current
    ) {
      refreshedAtCountdownEndRef.current = true
      refresh()
    }
  }, [derivedStatus, status, closingSoonUntilMs, remainingMs, refresh])

  if (!isAdmin) return null

  const isDisabled = canteenLoading || isApiPending || view.disabled

  const runAction = async ({
    nextPendingStatus,
    request,
    successMessage,
    errorMessage,
  }) => {
    setRequestInFlight(true)
    setPendingStatus(nextPendingStatus)

    try {
      await request()
      toast.success(successMessage)
      await refresh()
    } catch (error) {
      toast.error(error?.message || errorMessage)
    } finally {
      setPendingStatus(null)
      setRequestInFlight(false)
    }
  }

  const handleToggle = async () => {
    if (isDisabled) return

    if (derivedStatus === LIFECYCLE_STATUS.CLOSED) {
      await runAction({
        nextPendingStatus: LIFECYCLE_STATUS.OPENING,
        request: () => canteenService.setOpening(),
        successMessage: 'Opening started',
        errorMessage: 'Failed to start opening',
      })
      return
    }

    if (derivedStatus === LIFECYCLE_STATUS.OPEN) {
      await runAction({
        nextPendingStatus: null,
        request: () => canteenService.setClosingSoon(),
        successMessage: 'Closing soon started',
        errorMessage: 'Failed to trigger closing soon',
      })
      return
    }

    if (derivedStatus === LIFECYCLE_STATUS.CLOSING_SOON) {
      await runAction({
        nextPendingStatus: LIFECYCLE_STATUS.CLOSING,
        request: () => canteenService.setClosing(),
        successMessage: 'Closing started',
        errorMessage: 'Failed to close',
      })
    }
  }

  const Icon = view.icon
  const showProcessMotion =
    derivedStatus === LIFECYCLE_STATUS.OPENING ||
    derivedStatus === LIFECYCLE_STATUS.CLOSING
  const progressWidth =
    derivedStatus === LIFECYCLE_STATUS.CLOSED ? 18 : view.knobX + 24

  return (
    <motion.button
      type="button"
      title={view.title}
      aria-label={`${view.text}: ${view.subtext}`}
      onClick={handleToggle}
      disabled={isDisabled}
      animate={
        showProcessMotion
          ? { scale: [1, 1.012, 1], boxShadow: [view.glow, view.glow, view.glow] }
          : { scale: 1, boxShadow: view.glow }
      }
      transition={
        showProcessMotion
          ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileHover={!isDisabled ? { y: -1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      className={`group flex min-h-11 max-w-[13rem] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-75 sm:max-w-none sm:px-3 ${view.tone}`}
    >
      <span className={`relative h-8 w-16 shrink-0 rounded-full p-1 ${view.track}`}>
        <motion.span
          className={`absolute left-1 top-1 h-6 rounded-full ${view.fill}`}
          animate={{ width: progressWidth }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        />

        <motion.span
          className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${view.knob}`}
          animate={{
            x: showProcessMotion ? [8, 32, 8] : view.knobX,
            scale: showProcessMotion ? [1, 1.08, 1] : 1,
          }}
          transition={
            showProcessMotion
              ? { duration: 1.7, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 420, damping: 28 }
          }
        >
          {canteenLoading || isApiPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon
              className={`h-3.5 w-3.5 ${
                showProcessMotion ? 'animate-spin' : ''
              }`}
            />
          )}
        </motion.span>
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <motion.span
            className={`h-2 w-2 rounded-full ${view.dot}`}
            animate={
              showProcessMotion ||
              derivedStatus === LIFECYCLE_STATUS.OPEN ||
              derivedStatus === LIFECYCLE_STATUS.CLOSING_SOON
                ? { opacity: [0.55, 1, 0.55], scale: [0.85, 1.18, 0.85] }
                : { opacity: 0.7, scale: 1 }
            }
            transition={
              showProcessMotion ||
              derivedStatus === LIFECYCLE_STATUS.OPEN ||
              derivedStatus === LIFECYCLE_STATUS.CLOSING_SOON
                ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          />
          <span className="truncate text-xs font-black uppercase tracking-wide">
            {view.text}
          </span>
        </span>

        <span className="mt-0.5 hidden truncate text-[10px] font-semibold opacity-75 sm:block">
          {view.subtext}
        </span>
      </span>
    </motion.button>
  )
}
