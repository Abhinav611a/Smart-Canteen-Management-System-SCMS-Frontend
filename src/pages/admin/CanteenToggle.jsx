import { useState } from 'react'
import { Loader2, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useCanteen } from '@/context/CanteenContext'
import { canteenService } from '@/services/canteenService'

function getActionButtonClass(enabled, tone) {
  if (!enabled) {
    return 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
  }

  switch (tone) {
    case 'emerald':
      return 'bg-emerald-500 text-white hover:opacity-90'
    case 'amber':
      return 'bg-amber-500 text-white hover:opacity-90'
    case 'rose':
      return 'bg-rose-500 text-white hover:opacity-90'
    default:
      return 'bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-gray-900'
  }
}

function StatusPill({ tone, children, spinning = false }) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
      : tone === 'sky'
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
      : tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
      : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${toneClass}`}
    >
      {spinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </span>
  )
}

export default function CanteenToggle() {
  const { user } = useAuth()
  const {
    loading: canteenLoading,
    statusLabel,
    isOpen,
    isOpening,
    isClosing,
    isClosed,
    hasClosingWarning,
  } = useCanteen()
  const [loading, setLoading] = useState(false)

  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN'

  const runAction = async ({
    request,
    successMessage,
    errorMessage,
  }) => {
    setLoading(true)

    try {
      await request()
      toast.success(successMessage)
    } catch {
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async () => {
    await runAction({
      request: () => canteenService.setOpening(),
      successMessage: 'Opening started',
      errorMessage: 'Failed to start opening',
    })
  }

  const handleCloseSoon = async () => {
    await runAction({
      request: () => canteenService.setClosingSoon(),
      successMessage: 'Closing soon started',
      errorMessage: 'Failed to trigger closing soon',
    })
  }

  const handleForceClose = async () => {
    await runAction({
      request: () => canteenService.setClosing(),
      successMessage: 'Closing started',
      errorMessage: 'Failed to close',
    })
  }

  if (!isAdmin) return null

  const isBusy = loading || canteenLoading
  const effectiveStatusLabel = canteenLoading ? 'Checking Status' : statusLabel
  const statusDetail = canteenLoading
    ? 'Fetching latest canteen state'
    : isClosing
    ? 'Waiting for active orders to complete before auto-close.'
    : isOpening
      ? 'Opening is in progress. Waiting for service to go live.'
      : hasClosingWarning
        ? 'Closing soon warning is active. New orders are still allowed.'
        : isClosed
          ? 'Not accepting orders'
          : 'Accepting new orders'

  const canStartOpening = isClosed && !isBusy
  const canStartCloseSoon = isOpen && !hasClosingWarning && !isBusy
  const canStartClosing = isOpen && !isBusy
  const showStartOpening = isClosed
  const showCloseSoonAction = isOpen && !hasClosingWarning
  const showStartClosingAction = isOpen
  const showClosingSoonPill = isOpen && hasClosingWarning

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-900/70">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <Store className="h-4 w-4" />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase text-gray-400">Canteen</span>
          <span className="text-xs font-semibold">{effectiveStatusLabel}</span>
          <span className="text-[10px] text-gray-400">{statusDetail}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {canteenLoading && (
          <StatusPill tone="gray" spinning>
            Syncing Status
          </StatusPill>
        )}

        {!canteenLoading && isOpening && (
          <StatusPill tone="sky" spinning>
            Opening In Progress
          </StatusPill>
        )}

        {!canteenLoading && isClosing && (
          <StatusPill tone="rose" spinning>
            Waiting For Active Orders
          </StatusPill>
        )}

        {!canteenLoading && showClosingSoonPill && (
          <StatusPill tone="amber">
            Closing Soon Active
          </StatusPill>
        )}

        {showStartOpening && (
          <button
            onClick={handleOpen}
            disabled={!canStartOpening}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${getActionButtonClass(
              canStartOpening,
              'emerald'
            )}`}
          >
            Start Opening
          </button>
        )}

        {showCloseSoonAction && (
          <button
            onClick={handleCloseSoon}
            disabled={!canStartCloseSoon}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${getActionButtonClass(
              canStartCloseSoon,
              'amber'
            )}`}
          >
            Close Soon
          </button>
        )}

        {showStartClosingAction && (
          <button
            onClick={handleForceClose}
            disabled={!canStartClosing}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${getActionButtonClass(
              canStartClosing,
              'rose'
            )}`}
          >
            Start Closing
          </button>
        )}

        {loading && !canteenLoading && (
          <Loader2 className="ml-1 h-4 w-4 animate-spin text-gray-500" />
        )}
      </div>
    </div>
  )
}
