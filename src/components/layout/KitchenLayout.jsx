import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCanteenStatus } from '@/hooks/useCanteenStatus'
import CanteenBanner from '@/components/ui/CanteenBanner'
import { testService } from '@/services/testService'
import {
  ChefHat,
  Clock3,
  Bell,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  X,
  ListFilter,
} from 'lucide-react'
import { kitchenService } from '../../services/kitchenService'

const themeMap = {
  dark: {
    page: 'bg-slate-950 text-slate-100',
    header: 'bg-slate-950/80 border-b border-slate-800',
    footer: 'bg-black border-t border-slate-800 text-white',
    card: 'bg-slate-900 border border-slate-800 shadow-xl',
    muted: 'text-slate-400',
    subMuted: 'text-slate-500',
    itemBox: 'bg-slate-800 text-slate-300',
    brand: 'bg-emerald-500 text-slate-900',
    primaryBtn: 'bg-emerald-500 text-slate-950 hover:brightness-110',
    divider: 'border-slate-800',
    topIconBtn: 'border-slate-700 text-slate-300 hover:bg-slate-800',
    modalOverlay: 'bg-black/60',
    modalCard: 'bg-slate-900 border border-slate-800 text-slate-100',
    secondaryBtn: 'border-slate-700 text-slate-300 hover:bg-slate-800',
    filterWrap: 'bg-slate-900/80 border border-slate-800',
    filterBtn: 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
    filterBtnActive:
      'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20',
    emptyCard: 'border border-dashed border-slate-800 bg-slate-900/60',
    errorCard: 'border border-red-500/20 bg-red-500/5',
  },
  light: {
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white/80 border-b border-slate-200',
    footer: 'bg-slate-900 text-white',
    card: 'bg-white border border-slate-200 shadow-sm',
    muted: 'text-slate-500',
    subMuted: 'text-slate-400',
    itemBox: 'bg-slate-100 text-slate-600',
    brand: 'bg-emerald-500 text-slate-900',
    primaryBtn: 'bg-emerald-500 text-slate-950 hover:brightness-110',
    divider: 'border-slate-200',
    topIconBtn: 'border-slate-300 text-slate-600 hover:bg-slate-100',
    modalOverlay: 'bg-slate-900/30',
    modalCard: 'bg-white border border-slate-200 text-slate-900',
    secondaryBtn: 'border-slate-300 text-slate-600 hover:bg-slate-100',
    filterWrap: 'bg-white/90 border border-slate-200',
    filterBtn: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
    filterBtnActive:
      'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20',
    emptyCard: 'border border-dashed border-slate-300 bg-white/80',
    errorCard: 'border border-red-500/20 bg-red-50',
  },
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function formatElapsedTime(elapsedSeconds = 0) {
  const total = Number(elapsedSeconds) || 0
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getDisplayStatus(status, statusLabel) {
  if (statusLabel) return String(statusLabel).toUpperCase()

  switch (status) {
    case 'PENDING':
      return 'PENDING'
    case 'PREPARING':
      return 'PREPARING'
    case 'READY':
      return 'READY'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'CANCELLED':
      return 'CANCELLED'
    case 'PAYMENT_PENDING':
      return 'PAYMENT PENDING'
    default:
      return status || 'UNKNOWN'
  }
}

function getPriorityFromBackend(status, timeStatus) {
  const ts = String(timeStatus || '').toUpperCase()

  if (status === 'READY' || ts.includes('READY')) return 'ready'
  if (status === 'PENDING') return 'pending'
  if (ts.includes('CRITICAL') || ts.includes('DELAY')) return 'critical'
  if (ts.includes('WARNING')) return 'warning'
  if (status === 'PREPARING') return 'warning'
  return 'normal'
}

function getStatusStyle(priority, mode, orderStatus) {
  const isDark = mode === 'dark'

  if (orderStatus === 'PENDING') {
    return {
      border: isDark ? 'border-slate-700' : 'border-slate-300',
      strip: 'bg-slate-400',
      statusText: isDark ? 'text-slate-200' : 'text-slate-700',
      label: 'Pending',
    }
  }

  if (orderStatus === 'COMPLETED') {
    return {
      border: isDark ? 'border-emerald-500/20' : 'border-emerald-500/20',
      strip: 'bg-emerald-500',
      statusText: 'text-emerald-500',
      label: 'Completed',
    }
  }

  if (orderStatus === 'CANCELLED') {
    return {
      border: isDark ? 'border-slate-700' : 'border-slate-300',
      strip: 'bg-slate-400',
      statusText: isDark ? 'text-slate-300' : 'text-slate-600',
      label: 'Cancelled',
    }
  }

  if (orderStatus === 'READY') {
    return {
      border: isDark ? 'border-emerald-500/30' : 'border-emerald-500/20',
      strip: 'bg-emerald-500',
      statusText: 'text-emerald-500',
      label: 'Ready',
    }
  }

  switch (priority) {
    case 'critical':
      return {
        border: isDark ? 'border-red-500/30' : 'border-red-500/20',
        strip: 'bg-red-500',
        statusText: 'text-red-500',
        label: 'Critical',
      }
    case 'warning':
      return {
        border: isDark ? 'border-amber-500/30' : 'border-amber-500/20',
        strip: 'bg-red-500',
        statusText: 'text-emerald-500',
        label: 'Preparing',
      }
    case 'ready':
      return {
        border: isDark ? 'border-emerald-500/30' : 'border-emerald-500/20',
        strip: 'bg-emerald-500',
        statusText: 'text-emerald-500',
        label: 'Ready',
      }
    default:
      return {
        border: isDark ? 'border-slate-800' : 'border-slate-200',
        strip: 'bg-slate-400',
        statusText: isDark ? 'text-slate-200' : 'text-slate-900',
        label: 'Normal',
      }
  }
}

function getNextStatus(status) {
  switch (status) {
    case 'PENDING':
      return 'PREPARING'
    case 'PREPARING':
      return 'READY'
    default:
      return null
  }
}

function getActionLabel(status) {
  switch (status) {
    case 'PENDING':
      return 'Start Preparing'
    case 'PREPARING':
      return 'Mark Ready'
    case 'READY':
      return 'Ready'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return 'No Action'
  }
}

function mapOrderFromApi(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber || `#${order.id}`,
    customer: order.user?.name || order.studentName || 'Customer',
    status: order.status,
    statusLabel: order.statusLabel,
    elapsedBaseSeconds: Number(order.elapsedSeconds) || 0,
    preparingStartedAt:
      order.preparingStartedAt ||
      order.statusChangedAt ||
      order.updatedAt ||
      null,
    loadedAt: Date.now(),
    type: order.shortDescription || `${order.totalItems || 0} items`,
    amount: order.totalAmount || 0,
    priority: getPriorityFromBackend(order.status, order.timeStatus),
    items: (order.items || []).map((item) => ({
      qty: item.quantity || item.qty || 1,
      name: item.name,
    })),
  }
}

function getElapsedSecondsFromPreparing(order, nowTs) {
  const startedAt = order?.preparingStartedAt
    ? new Date(order.preparingStartedAt).getTime()
    : null

  if (startedAt && !Number.isNaN(startedAt)) {
    return Math.max(0, Math.floor((nowTs - startedAt) / 1000))
  }

  if (order.status === 'PREPARING') {
    return (
      (order.elapsedBaseSeconds || 0) +
      Math.max(0, Math.floor((nowTs - (order.loadedAt || nowTs)) / 1000))
    )
  }

  if (order.status === 'READY' || order.status === 'COMPLETED') {
    return order.elapsedBaseSeconds || 0
  }

  return 0
}

function Tooltip({ children, text, theme }) {
  return (
    <div className="group relative">
      {children}
      <div
        className={`pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold opacity-0 shadow-md transition-all duration-200 group-hover:translate-y-1 group-hover:opacity-100 ${
          theme === 'dark'
            ? 'border border-slate-700 bg-slate-800 text-slate-100'
            : 'border border-slate-200 bg-white text-slate-700'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

function FilterTabs({ value, onChange, theme, counts }) {
  const t = themeMap[theme]
  const tabs = [
    { key: 'ALL', label: 'All', count: counts.all },
    { key: 'PENDING', label: 'Pending', count: counts.pending },
    { key: 'PREPARING', label: 'Preparing', count: counts.preparing },
  ]

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl p-2 backdrop-blur-md ${t.filterWrap}`}
    >
      <div className={`flex items-center gap-2 px-2 ${t.subMuted}`}>
        <ListFilter size={15} />
      </div>

      {tabs.map((tab) => {
        const active = value === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              active ? t.filterBtnActive : t.filterBtn
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-80">{tab.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function OrderCard({
  order,
  mode,
  onPromote,
  updating,
  nowTs,
  isConnected,
  queuedAction,
  isFlushingQueue,
  canteenActionsBlocked,
  canteenOpening,
}) {
  const t = themeMap[mode]
  const s = getStatusStyle(order.priority, mode, order.status)
  const actionLabel = getActionLabel(order.status)
  const disabled =
    !getNextStatus(order.status) ||
    updating ||
    isFlushingQueue ||
    !isConnected ||
    canteenActionsBlocked
  const elapsed = formatElapsedTime(getElapsedSecondsFromPreparing(order, nowTs))

  let buttonText = actionLabel
  if (canteenOpening) buttonText = 'Unavailable Until Open'
  else if (canteenActionsBlocked) buttonText = 'Unavailable While Closed'
  else if (queuedAction && !isConnected) buttonText = 'Queued Offline'
  else if (queuedAction && isFlushingQueue) buttonText = 'Syncing...'
  else if (updating) buttonText = 'Updating...'

  return (
    <div
      className={`relative h-full overflow-hidden rounded-2xl ${t.card} ${s.border} ${
        order.priority === 'critical' || order.priority === 'warning'
          ? 'border-2'
          : ''
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${s.strip}`} />

      <div className="flex h-full min-h-[420px] flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.subMuted}`}
            >
              Order Number
            </p>
            <h3 className="text-3xl font-black">{order.orderNumber}</h3>
          </div>

          <div className="text-right">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.subMuted}`}
            >
              Elapsed Time
            </p>
            <p className="text-2xl font-black text-emerald-500">{elapsed}</p>
          </div>
        </div>

        <div className="mb-4">
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.subMuted}`}
          >
            Current Order Status
          </p>
          <p className={`mt-2 text-3xl font-black uppercase leading-none ${s.statusText}`}>
            {getDisplayStatus(order.status, order.statusLabel)}
          </p>
        </div>

        <div className={`mb-4 border-y py-4 ${t.divider}`}>
          <p className={`mb-3 text-sm font-bold uppercase tracking-tight ${t.muted}`}>
            Customer
          </p>
          <p className="mb-4 text-lg font-bold">{order.customer}</p>

          <p className={`mb-3 text-sm font-bold uppercase tracking-tight ${t.muted}`}>
            Order Items
          </p>

          <div className="flex flex-wrap gap-3">
            {order.items.map((item, idx) => (
              <div
                key={`${order.id}-${idx}`}
                className={`inline-flex items-center gap-3 rounded-xl px-3 py-2 ${t.itemBox}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/10 text-sm font-bold dark:bg-white/10">
                  {item.qty}
                </span>
                <span className="text-sm font-semibold">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`mb-4 flex items-center justify-between ${t.subMuted}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {order.type}
          </span>
          <span className="text-xs font-black text-emerald-500">
            {formatCurrency(order.amount)}
          </span>
        </div>

        <div className="mt-auto pt-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPromote(order.id, order.status)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black uppercase tracking-widest transition ${
              disabled
                ? 'cursor-not-allowed bg-slate-400 text-white opacity-60'
                : `${t.primaryBtn} active:scale-[0.98]`
            }`}
          >
            <CheckCircle2 size={18} />
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogoutModal({ open, onClose, onConfirm, theme }) {
  if (!open) return null
  const t = themeMap[theme]

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${t.modalOverlay}`}
    >
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${t.modalCard}`}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black">Confirm Logout</h3>
            <p className={`mt-1 text-sm ${t.muted}`}>
              Are you sure you want to log out of the kitchen dashboard?
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${t.secondaryBtn}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${t.secondaryBtn}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-red-500/40 bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KitchenLayout() {
  const [theme, setTheme] = useState('dark')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [nowTs, setNowTs] = useState(Date.now())
  const [queuedActions, setQueuedActions] = useState([])
  const [isFlushingQueue, setIsFlushingQueue] = useState(false)
  const [wasConnectedOnce, setWasConnectedOnce] = useState(false)

  const prevConnectedRef = useRef(false)

  const { logout } = useAuth()
  const navigate = useNavigate()
  const canteen = useCanteenStatus(true)
  const operationalActionsBlocked = canteen.isClosed || canteen.isOpening
  const t = themeMap[theme]

  const fetchKitchenOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      setError('')

      const data = await kitchenService.getOrders()
      console.log('[KITCHEN] Orders:', data)

      if (Array.isArray(data)) {
        setOrders(data.map(mapOrderFromApi))
        return
      }

      setError('Invalid kitchen orders response')
    } catch (err) {
      console.error('[KITCHEN ERROR]:', err)
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load kitchen orders'
      )
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const handleRealtimeOrderUpdate = useCallback((updatedOrderRaw) => {
    const updatedOrder = mapOrderFromApi(updatedOrderRaw)

    setOrders((prev) => {
      const exists = prev.find((o) => o.id === updatedOrder.id)

      if (exists) {
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      }

      return [updatedOrder, ...prev]
    })
  }, [])

  const { isConnected } = useWebSocket(
    'kitchen:orders',
    handleRealtimeOrderUpdate,
    true
  )

  const isReconnecting = !isConnected && wasConnectedOnce

  useEffect(() => {
    fetchKitchenOrders(true)

    const interval = setInterval(() => {
      fetchKitchenOrders(false)
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (isConnected) {
      setWasConnectedOnce(true)
    }

    const wasConnected = prevConnectedRef.current
    if (wasConnected && !isConnected) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const oscillator = ctx.createOscillator()
          const gain = ctx.createGain()

          oscillator.type = 'sine'
          oscillator.frequency.value = 880
          gain.gain.value = 0.03

          oscillator.connect(gain)
          gain.connect(ctx.destination)

          oscillator.start()
          oscillator.stop(ctx.currentTime + 0.15)
        }
      } catch {
        // ignore audio failures
      }

      toast.error('Backend disconnected. Offline actions will be queued.')
    }

    if (!wasConnected && isConnected) {
      toast.success('Backend connected.')
    }

    prevConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    const flushQueuedActions = async () => {
      if (
        !isConnected ||
        queuedActions.length === 0 ||
        isFlushingQueue ||
        operationalActionsBlocked
      ) {
        return
      }

      setIsFlushingQueue(true)
      try {
        for (const action of queuedActions) {
          const updated = await kitchenService.updateOrderStatus(
            action.orderId,
            action.status
          )

          if (updated?.id) {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === action.orderId ? mapOrderFromApi(updated) : order
              )
            )
          }
        }

        setQueuedActions([])
        toast.success('Queued actions synced successfully.')
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to sync queued actions'
        )
      } finally {
        setIsFlushingQueue(false)
      }
    }

    flushQueuedActions()
  }, [isConnected, queuedActions, isFlushingQueue, operationalActionsBlocked])

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'PENDING').length,
      preparing: orders.filter((o) => o.status === 'PREPARING').length,
    }
  }, [orders])

  const queueCount = useMemo(
    () =>
      orders.filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status))
        .length,
    [orders]
  )

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case 'PENDING':
        return orders.filter((o) => o.status === 'PENDING')
      case 'PREPARING':
        return orders.filter((o) => o.status === 'PREPARING')
      default:
        return orders
    }
  }, [orders, filter])

  const queuedActionsMap = useMemo(() => {
    return queuedActions.reduce((acc, action) => {
      acc[action.orderId] = action
      return acc
    }, {})
  }, [queuedActions])

  const handlePromoteStatus = async (orderId, currentStatus) => {
    if (operationalActionsBlocked) {
      toast.error(
        canteen.isOpening
          ? 'Canteen is opening soon. Kitchen actions stay disabled until service begins.'
          : 'Canteen is closed. Actions are disabled.'
      )
      return
    }

    const nextStatus = getNextStatus(currentStatus)
    if (!nextStatus) return

    if (!isConnected) {
      setQueuedActions((prev) => {
        const remaining = prev.filter((item) => item.orderId !== orderId)
        return [...remaining, { orderId, status: nextStatus }]
      })
      toast('Action queued. It will sync when backend reconnects.')
      return
    }

    try {
      setUpdatingOrderId(orderId)

      const updated = await kitchenService.updateOrderStatus(orderId, nextStatus)

      if (updated?.id) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? mapOrderFromApi(updated) : order
          )
        )
      } else {
        setError('Failed to update order status')
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update order status'
      )
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleWsTest = async () => {
    try {
      const result = await testService.triggerWsTest()
      console.log('[WS TEST] Result:', result)
      toast.success('Test message sent!')
    } catch (error) {
      console.error('[WS TEST] Error:', error)
      toast.error('WS test failed')
    }
  }

  return (
    <>
      <div className={`min-h-screen ${t.page}`}>
        <main className="flex min-h-screen flex-1 flex-col">
          <header
            className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 backdrop-blur-md md:px-8 ${t.header}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg shadow-emerald-500/20 ${t.brand}`}
              >
                <ChefHat size={20} />
              </div>

              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Kitchen Monitor
                </h2>
                <div
                  className={`hidden h-6 w-[2px] sm:block ${
                    theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                  }`}
                />
                <div className="hidden items-center gap-2 sm:flex">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isConnected ? 'animate-pulse bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold uppercase tracking-widest ${t.muted}`}
                  >
                    {isConnected
                      ? 'Live Feed'
                      : isReconnecting
                        ? 'Reconnecting'
                        : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="mr-2 hidden text-right sm:block">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${t.subMuted}`}
                >
                  Orders in Queue
                </p>
                <p className="text-xl font-black">{queueCount}</p>
              </div>

              <Tooltip text="Notifications" theme={theme}>
                <button
                  type="button"
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 ${t.topIconBtn} ${
                    theme === 'dark'
                      ? 'hover:shadow-slate-900/40'
                      : 'hover:shadow-slate-300/60'
                  }`}
                >
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isConnected ? 'animate-ping bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                  </span>
                  <Bell size={18} />
                </button>
              </Tooltip>

              <Tooltip text="Toggle Theme" theme={theme}>
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 ${
                    theme === 'dark'
                      ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:shadow-emerald-900/30'
                      : 'border-emerald-400 text-emerald-600 hover:bg-emerald-100 hover:shadow-emerald-200/70'
                  }`}
                >
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <Sun
                      size={18}
                      className={`absolute transition-all duration-500 ${
                        theme === 'light'
                          ? 'rotate-0 scale-100 opacity-100'
                          : 'rotate-90 scale-0 opacity-0'
                      }`}
                    />
                    <Moon
                      size={18}
                      className={`absolute transition-all duration-500 ${
                        theme === 'dark'
                          ? 'rotate-0 scale-100 opacity-100'
                          : '-rotate-90 scale-0 opacity-0'
                      }`}
                    />
                  </span>
                </button>
              </Tooltip>

              <Tooltip text="Logout" theme={theme}>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 ${
                    theme === 'dark'
                      ? 'border-red-500/40 text-red-400 hover:bg-red-500/10 hover:shadow-red-900/30'
                      : 'border-red-400 text-red-500 hover:bg-red-100 hover:shadow-red-200/70'
                  }`}
                >
                  <LogOut size={18} />
                </button>
              </Tooltip>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 md:pb-24">
            <div className="mb-6">
              <CanteenBanner />
            </div>

            {error ? (
              <div className={`mb-6 rounded-2xl p-4 ${t.errorCard}`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-red-500">{error}</p>
                  <button
                    type="button"
                    onClick={() => fetchKitchenOrders(true)}
                    className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <FilterTabs
                value={filter}
                onChange={setFilter}
                theme={theme}
                counts={counts}
              />

              <div className="flex items-center gap-4">
                <div className={`text-sm font-semibold ${t.muted}`}>
                  Showing{' '}
                  <span className="text-emerald-500">{filteredOrders.length}</span>{' '}
                  orders
                </div>

                <button
                  type="button"
                  onClick={handleWsTest}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white transition hover:opacity-80"
                >
                  Test WS
                </button>
              </div>
            </div>

            {loading ? (
              <div className={`rounded-2xl p-10 text-center ${t.emptyCard}`}>
                <h3 className="text-xl font-black">Loading kitchen orders...</h3>
                <p className={`mt-2 text-sm ${t.muted}`}>
                  Please wait while the kitchen queue is being prepared.
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className={`rounded-2xl p-10 text-center ${t.emptyCard}`}>
                <h3 className="text-xl font-black">No orders here</h3>
                <p className={`mt-2 text-sm ${t.muted}`}>
                  There are no orders in the selected filter right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    mode={theme}
                    onPromote={handlePromoteStatus}
                    updating={updatingOrderId === order.id}
                    nowTs={nowTs}
                    isConnected={isConnected}
                    queuedAction={queuedActionsMap[order.id]}
                    isFlushingQueue={isFlushingQueue}
                    canteenActionsBlocked={operationalActionsBlocked}
                    canteenOpening={canteen.isOpening}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <footer
          className={`fixed bottom-0 left-0 right-0 z-40 flex h-12 items-center justify-between px-6 md:px-8 ${t.footer}`}
        >
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isConnected
                  ? 'Connected'
                  : isReconnecting
                    ? 'Reconnecting'
                    : 'Disconnected'}
              </span>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Clock3 size={14} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Avg. Prep Time:
              </span>
              <span className="text-xs font-bold text-emerald-500">12m 40s</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                isConnected ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {isConnected
                ? 'Connected'
                : isReconnecting
                  ? 'Reconnecting'
                  : 'Disconnected'}
            </span>
            <RefreshCw
              size={14}
              className={`${
                isConnected ? 'animate-spin text-emerald-500' : 'text-red-500'
              }`}
            />
          </div>
        </footer>
      </div>

      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        theme={theme}
      />
    </>
  )
}
