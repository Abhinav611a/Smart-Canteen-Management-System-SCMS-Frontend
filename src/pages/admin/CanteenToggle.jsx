import { useEffect, useState } from 'react'
import { Loader2, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { ENDPOINTS } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'

export default function CanteenToggle() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (!isAdmin) return

    let mounted = true

    const fetchStatus = async () => {
      setLoading(true)

      try {
        const res = await api.get(ENDPOINTS.CANTEEN_STATUS)

        if (typeof res !== 'boolean') {
          throw new Error('Invalid canteen status response')
        }

        if (mounted) {
          setIsOpen(res)
        }
      } catch (error) {
        console.warn('Failed to fetch canteen status.', error)

        toast('Unable to fetch canteen status.', {
          icon: '⚠️',
          id: 'canteen-status-warning',
        })

        if (mounted) {
          setIsOpen(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    fetchStatus()

    return () => {
      mounted = false
    }
  }, [isAdmin])

  const handleToggle = async () => {
    if (!isAdmin || loading || !initialized) return

    setLoading(true)

    try {
      if (isOpen) {
        await api.post(ENDPOINTS.CANTEEN_CLOSE)
        setIsOpen(false)
        toast.success('Canteen closed successfully')
      } else {
        await api.post(ENDPOINTS.CANTEEN_OPEN)
        setIsOpen(true)
        toast.success('Canteen opened successfully')
      }
    } catch (error) {
      console.error('Failed to update canteen status:', error)
      toast.error(error?.message || 'Failed to update canteen status.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-md dark:border-gray-700/80 dark:bg-gray-900/70">
      <div className="hidden sm:flex items-center gap-2 pl-1">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
            isOpen
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
          }`}
        >
          <Store className="h-4 w-4" />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
            Canteen
          </span>
          <span
            className={`text-xs font-semibold ${
              isOpen
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || !initialized}
        aria-label={isOpen ? 'Close canteen' : 'Open canteen'}
        className={`relative h-8 w-16 rounded-full transition-all duration-300 ease-out ${
          isOpen
            ? 'bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.35)]'
            : 'bg-gray-300 dark:bg-gray-700'
        } ${
          loading || !initialized
            ? 'cursor-not-allowed opacity-80'
            : 'cursor-pointer'
        }`}
      >
        <span
          className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
            isOpen ? 'left-9' : 'left-1'
          }`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-600" />
          ) : (
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOpen ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            />
          )}
        </span>
      </button>
    </div>
  )
}