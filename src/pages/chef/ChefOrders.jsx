/**
 * ChefOrders.jsx  (MANAGER role)
 * ────────────────────────────────
 * Manager view: Monitor all active orders + mark ready orders as complete.
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useOrders } from '@/hooks/useOrders'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useNotifications } from '@/context/NotificationContext'
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
  { key: 'monitor', label: '📡 Monitor', scope: 'monitor', desc: 'All active orders' },
  { key: 'ready', label: '✅ Ready', scope: 'ready', desc: 'Awaiting pickup' },
]

function ElapsedBadge({ seconds, timeStatus }) {
  if (!seconds && seconds !== 0) return null
  const mins = Math.floor(seconds / 60)
  const isLate =
    timeStatus?.toLowerCase().includes('late') ||
    timeStatus?.toLowerCase().includes('over')

  return (
    <span
      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
        isLate
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}
    >
      ⏱ {mins > 0 ? `${mins}m` : `${seconds}s`}
    </span>
  )
}

export default function ChefOrders() {
  const [activeTab, setActiveTab] = useState('monitor')
  const currentScope = TAB_CONFIG.find((t) => t.key === activeTab)?.scope ?? 'monitor'

  const {
    orders,
    loading,
    error,
    refetch,
    completeOrder,
    applyRealtimeUpdate,
  } = useOrders(currentScope)

  const { addNotification } = useNotifications()
  const [completingId, setCompletingId] = useState(null)

  const visibleOrders = orders.filter((o) =>
    [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY].includes(o.status)
  )

  const { isConnected } = useWebSocket({
    onOrderUpdate: useCallback(
      (order) => {
        const activeStatuses = [
          ORDER_STATUS.PENDING,
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.READY,
        ]

        if (currentScope === 'ready' && order.status !== ORDER_STATUS.READY) return
        if (currentScope === 'monitor' && !activeStatuses.includes(order.status)) return

        applyRealtimeUpdate(order)
      },
      [applyRealtimeUpdate, currentScope]
    ),
  })

  const handleComplete = async (order) => {
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
      toast.error('Failed to complete order: ' + err.message)
    } finally {
      setCompletingId(null)
    }
  }

  const pendingCount = visibleOrders.filter((o) => o.status === ORDER_STATUS.PENDING).length
  const preparingCount = visibleOrders.filter((o) => o.status === ORDER_STATUS.PREPARING).length
  const readyCount = visibleOrders.filter((o) => o.status === ORDER_STATUS.READY).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Manager Dashboard 📊</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {pendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                ⏳ {pendingCount} pending
              </span>
            )}
            {preparingCount > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                👨‍🍳 {preparingCount} cooking
              </span>
            )}
            {readyCount > 0 && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✅ {readyCount} ready
              </span>
            )}
            <span
              className={`flex items-center gap-1 font-medium ${
                isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={refetch} icon="🔄" disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card p-4 text-sm text-red-500 border border-red-200 dark:border-red-900">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">{activeTab === 'ready' ? '✅' : '📡'}</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {activeTab === 'ready' ? 'No orders awaiting pickup' : 'No active orders to monitor'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {order.orderNumber || `#${order.id}`}
                      </p>
                      <span
                        className={`badge ${ORDER_STATUS_COLORS[order.status] ?? 'badge-gray'}`}
                      >
                        {ORDER_STATUS_ICONS[order.status]}{' '}
                        {order.statusLabel || ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.studentName} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <ElapsedBadge seconds={order.elapsedSeconds} timeStatus={order.timeStatus} />
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-3 space-y-1">
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{MENU_CATEGORY_EMOJIS[item.category] || '🍴'}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="text-xs text-gray-400">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {order.shortDescription && (
                  <p className="text-xs text-gray-400 italic mb-3">{order.shortDescription}</p>
                )}

                {activeTab === 'ready' && order.status === ORDER_STATUS.READY && (
                  <Button
                    className="w-full"
                    onClick={() => handleComplete(order)}
                    loading={completingId === order.id}
                    icon="📦"
                  >
                    Mark as Completed
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