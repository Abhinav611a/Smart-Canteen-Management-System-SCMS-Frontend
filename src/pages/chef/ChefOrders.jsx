/**
 * ChefOrders.jsx  (MANAGER role)
 * ────────────────────────────────
 * Manager view: Monitor all active orders + mark ready orders as complete.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useOrders } from '@/hooks/useOrders'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useNotifications } from '@/context/NotificationContext'
import { useCanteen } from '@/context/CanteenContext'
import {
  ORDER_STATUS,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  MENU_CATEGORY_EMOJIS,
} from '@/utils/constants'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import Button from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

const TAB_CONFIG = [
  {
    key: 'monitor',
    label: '📡 Monitor',
    scope: 'monitor',
    desc: 'All active orders',
  },
  {
    key: 'ready',
    label: '✅ Ready',
    scope: 'ready',
    desc: 'Awaiting pickup',
  },
]

function ElapsedBadge({ seconds, timeStatus }) {
  if (!seconds && seconds !== 0) return null

  const mins = Math.floor(seconds / 60)
  const isLate =
    String(timeStatus || '').toLowerCase().includes('late') ||
    String(timeStatus || '').toLowerCase().includes('over')

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold ${
        isLate
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      ⏱ {mins > 0 ? `${mins}m` : `${seconds}s`}
    </span>
  )
}

function getEmptyStateText(activeTab, canteen) {
  if (activeTab === 'ready') {
    if (canteen.isClosed) return 'Canteen is closed. No pickup queue right now.'
    if (canteen.isOpening) return 'Opening soon. Pickup queue will appear once orders begin.'
    return 'No orders awaiting pickup'
  }

  if (canteen.isOpening) {
    return 'Canteen is opening soon. No active manager orders yet.'
  }

  if (canteen.isClosing) {
    return 'No active orders left. Existing orders are being wrapped up.'
  }

  if (canteen.isClosed) {
    return 'Canteen is closed. Operations are inactive.'
  }

  return 'No active orders to monitor'
}

export default function ChefOrders() {
  const [activeTab, setActiveTab] = useState('monitor')
  const canteen = useCanteen()

  const currentScope =
    TAB_CONFIG.find((t) => t.key === activeTab)?.scope ?? 'monitor'

  const {
    orders = [],
    loading,
    error,
    refetch,
    completeOrder,
    applyRealtimeUpdate,
  } = useOrders(currentScope)

  const { addNotification } = useNotifications()
  const [completingId, setCompletingId] = useState(null)

  const visibleOrders = orders.filter((o) =>
    [
      ORDER_STATUS.PAYMENT_PENDING,
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY,
    ].includes(o.status)
  )

  const { isConnected } = useWebSocket(
    'manager:orders',
    useCallback(
      (order) => {
        applyRealtimeUpdate(order)
      },
      [applyRealtimeUpdate]
    )
  )

  const handleComplete = async (order) => {
    if (canteen.isClosed) {
      toast.error('Canteen is closed. Completion actions are disabled.')
      return
    }

    setCompletingId(order.id)

    try {
      await completeOrder(order.id)

      toast.success(`Order ${order.orderNumber || `#${order.id}`} completed ✓`)

      addNotification({
        type: 'complete',
        title: 'Order Completed',
        message: `${order.orderNumber || order.id} marked complete`,
        icon: '📦',
      })
    } catch (err) {
      toast.error(`Failed to complete order: ${err.message}`)
    } finally {
      setCompletingId(null)
    }
  }

  const pendingCount = visibleOrders.filter(
    (o) => o.status === ORDER_STATUS.PENDING
  ).length
  const preparingCount = visibleOrders.filter(
    (o) => o.status === ORDER_STATUS.PREPARING
  ).length
  const readyCount = visibleOrders.filter(
    (o) => o.status === ORDER_STATUS.READY
  ).length

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Manager Dashboard 📊</h2>

          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {pendingCount > 0 && (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                ⏳ {pendingCount} pending
              </span>
            )}

            {preparingCount > 0 && (
              <span className="font-medium text-blue-600 dark:text-blue-400">
                👨‍🍳 {preparingCount} cooking
              </span>
            )}

            {readyCount > 0 && (
              <span className="font-medium text-green-600 dark:text-green-400">
                ✅ {readyCount} ready
              </span>
            )}

            <span
              className={`flex items-center gap-1 font-medium ${
                isConnected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'animate-pulse bg-green-500' : 'bg-gray-400'
                }`}
              />
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {(canteen.isOpening || canteen.isClosing || canteen.isClosed) && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {canteen.isOpening && 'Opening soon — manager can prepare for operations.'}
              {canteen.isClosing && 'No new orders are expected. Existing orders may still continue.'}
              {canteen.isClosed && 'Canteen closed — operational actions are limited.'}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          icon="🔄"
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <div className="w-fit rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card border border-red-200 p-4 text-sm text-red-500 dark:border-red-900">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mb-3 text-5xl">
            {activeTab === 'ready' ? '✅' : '📡'}
          </div>
          <p className="font-medium text-gray-500 dark:text-gray-400">
            {getEmptyStateText(activeTab, canteen)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visibleOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="glass-card p-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {order.orderNumber || `#${order.id}`}
                      </p>

                      <span
                        className={`badge ${
                          ORDER_STATUS_COLORS[order.status] ?? 'badge-gray'
                        }`}
                      >
                        {ORDER_STATUS_ICONS[order.status]}{' '}
                        {order.statusLabel ||
                          ORDER_STATUS_LABELS[order.status] ||
                          order.status}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-gray-400">
                      {order.studentName} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  <ElapsedBadge
                    seconds={order.elapsedSeconds}
                    timeStatus={order.timeStatus}
                  />
                </div>

                <div className="mb-3 space-y-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  {Array.isArray(order.items) &&
                    order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{MENU_CATEGORY_EMOJIS[item.category] || '🍴'}</span>
                          <span>{item.name}</span>
                        </span>

                        <span className="text-xs text-gray-400">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}

                  <div className="flex justify-between border-t border-gray-200 pt-1.5 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {order.shortDescription && (
                  <p className="mb-3 text-xs italic text-gray-400">
                    {order.shortDescription}
                  </p>
                )}

                {activeTab === 'ready' &&
                  order.status === ORDER_STATUS.READY && (
                    <Button
                      className="w-full"
                      onClick={() => handleComplete(order)}
                      loading={completingId === order.id}
                      disabled={canteen.isClosed}
                      icon="📦"
                    >
                      {canteen.isClosed ? 'Unavailable While Closed' : 'Mark as Completed'}
                    </Button>
                  )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
} 