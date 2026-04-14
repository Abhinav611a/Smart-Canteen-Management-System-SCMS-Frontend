import { useState } from 'react'
import { Loader2, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useCanteen } from '@/context/CanteenContext'
import { canteenService } from '@/services/canteenService'

export default function CanteenToggle() {
  const { user } = useAuth()
  const {
    statusLabel,
    isOpen,
    isOpening,
    isClosing,
    isClosed,
    hasClosingWarning,
  } = useCanteen()
  const [loading, setLoading] = useState(false)

  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN'
  const isTransitioning = isOpening || isClosing

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
      errorMessage: 'Failed to open',
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

  const isBusy = loading || isTransitioning
  const statusDetail = isClosing
    ? 'Completing existing orders...'
    : isOpening
      ? 'Waiting for service to open'
      : hasClosingWarning
        ? 'Closing soon warning is active'
        : isClosed
          ? 'Not accepting orders'
          : 'Accepting new orders'

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-900/70">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <Store className="h-4 w-4" />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase text-gray-400">Canteen</span>
          <span className="text-xs font-semibold">{statusLabel}</span>
          <span className="text-[10px] text-gray-400">{statusDetail}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleOpen}
          disabled={isBusy || !isClosed}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isClosed
              ? 'bg-emerald-500 text-white hover:opacity-90'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          Open
        </button>

        <button
          onClick={handleCloseSoon}
          disabled={isBusy || !isOpen || hasClosingWarning}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            isOpen && !hasClosingWarning
              ? 'bg-amber-500 text-white hover:opacity-90'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          Close Soon
        </button>

        <button
          onClick={handleForceClose}
          disabled={isBusy || isClosed}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            !isClosed
              ? 'bg-rose-500 text-white hover:opacity-90'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          Close
        </button>

        {isBusy && (
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-gray-500" />
        )}
      </div>
    </div>
  )
}
