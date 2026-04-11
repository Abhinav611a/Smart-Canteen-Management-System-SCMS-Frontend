/**
 * StudentOrders.jsx
 * ──────────────────
 * Student order history with live updates, reorder, and invoice download.
 *
 * New features from deployed backend:
 *   - orderNumber, statusLabel, formattedDate, shortDescription
 *   - canReorder  → show Reorder button  (POST /orders/{id}/reorder)
 *   - canDownloadInvoice → show Invoice button (GET /orders/{id}/invoice)
 *   - elapsedSeconds + timeStatus → show live timer for active orders
 *   - Real-time status updates via WebSocket
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useOrders }    from '@/hooks/useOrders'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ordersService } from '@/services/orders'
import { ORDER_STATUS, ORDER_STATUS_ICONS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, MENU_CATEGORY_EMOJIS } from '@/utils/constants'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { SkeletonTable } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'

const STEPS = [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED]

function OrderProgress({ status }) {
  if (status === ORDER_STATUS.CANCELLED) {
    return <div className="flex items-center gap-2 text-xs text-red-500 font-medium"><span>❌</span> Order was cancelled</div>
  }
  const currentIdx = STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1 mt-1">
      {STEPS.map((step, i) => {
        const done    = i <= currentIdx
        const current = i === currentIdx
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                current ? 'border-brand-500 bg-brand-500 text-white scale-110 shadow-glow' :
                done    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/30 text-brand-600' :
                          'border-gray-200 dark:border-gray-700 text-gray-400'
              }`}>
                {done && !current ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] capitalize hidden sm:block ${done ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                {step.toLowerCase()}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < currentIdx ? 'bg-brand-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ElapsedTimer({ seconds, timeStatus }) {
  if (!seconds || seconds <= 0) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isLate = timeStatus?.toLowerCase().includes('late') || timeStatus?.toLowerCase().includes('over')
  return (
    <span className={`text-xs font-mono font-semibold ${isLate ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
      ⏱ {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
      {timeStatus && <span className="ml-1 font-normal">· {timeStatus}</span>}
    </span>
  )
}

export default function StudentOrders() {
  const { orders, loading, error, refetch, applyRealtimeUpdate } = useOrders('my')
  const [expandedId, setExpandedId] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
  const [invoiceId, setInvoiceId] = useState(null)

  // Live updates for in-progress orders
  const { isConnected } = useWebSocket({
    onOrderUpdate: useCallback((updatedOrder) => {
      applyRealtimeUpdate(updatedOrder)
      const activeStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY]
      if (activeStatuses.includes(updatedOrder.status)) {
        toast(`Your order ${updatedOrder.orderNumber || `#${updatedOrder.id}`} is now ${updatedOrder.statusLabel || updatedOrder.status}!`, {
          icon: ORDER_STATUS_ICONS[updatedOrder.status],
          duration: 5000,
        })
      }
    }, [applyRealtimeUpdate]),
  })

  const handleReorder = async (order) => {
    setReorderingId(order.id)
    try {
      await ordersService.reorder(order.id)
      toast.success('Items added to cart! Go to cart to checkout.')
    } catch (err) {
      toast.error('Reorder failed: ' + err.message)
    } finally {
      setReorderingId(null)
    }
  }

  const handleInvoice = async (order) => {
    setInvoiceId(order.id)
    try {
      const lines = await ordersService.getInvoice(order.id)
      // Format invoice lines as downloadable text
      const content = Array.isArray(lines) ? lines.join('\n') : String(lines)
      const blob = new Blob([content], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `invoice-${order.orderNumber || order.id}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch (err) {
      toast.error('Invoice download failed: ' + err.message)
    } finally {
      setInvoiceId(null)
    }
  }

  if (loading) return (
    <div className="space-y-4">
      <h2 className="section-title">My Orders 📋</h2>
      <div className="glass-card p-4"><SkeletonTable rows={5} /></div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">My Orders 📋</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live updates
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={refetch} icon="🔄">Refresh</Button>
      </div>

      {error && (
        <div className="glass-card p-4 text-sm text-red-500 border border-red-200 dark:border-red-900">⚠️ {error}</div>
      )}

      {orders.length === 0 && !error && (
        <div className="text-center py-24">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl mb-4">📋</motion.div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No orders yet</h3>
          <p className="text-gray-400 text-sm">Place your first order from the menu!</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const isExpanded = expandedId === order.id
          const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'badge-gray'
          const isActive    = [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING, ORDER_STATUS.READY].includes(order.status)

          return (
            <motion.div
              key={order.id}
              layout
              className={`glass-card overflow-hidden transition-shadow ${isActive ? 'ring-1 ring-brand-200 dark:ring-brand-900' : ''}`}
            >
              {/* Summary row */}
              <button
                className="w-full flex items-start justify-between gap-3 p-5 text-left"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {order.orderNumber || `#${order.id}`}
                    </p>
                    <span className={`badge ${statusColor}`}>
                      {ORDER_STATUS_ICONS[order.status]} {order.statusLabel || ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                    
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{order.formattedDate || formatDateTime(order.createdAt)}</p>
                  {order.shortDescription && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{order.shortDescription}</p>
                  )}
                  <div className="mt-2">
                    <OrderProgress status={order.status} />
                  </div>
                  {isActive && order.elapsedSeconds > 0 && (
                    <div className="mt-1">
                      <ElapsedTimer seconds={order.elapsedSeconds} timeStatus={order.timeStatus} />
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.totalItems} item{order.totalItems !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400">{isExpanded ? '▲ Less' : '▼ Details'}</p>
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatedDetail open={isExpanded}>
                <div className="px-5 pb-5 space-y-3">
                  {/* Items breakdown */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span>{MENU_CATEGORY_EMOJIS[item.category] || '🍴'}</span>
                          <span>{item.name}</span>
                        </span>
                        <span className="font-medium">{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Tx hash */}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {order.canReorder && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="🔁"
                        loading={reorderingId === order.id}
                        onClick={() => handleReorder(order)}
                      >
                        Reorder
                      </Button>
                    )}
                    {order.canDownloadInvoice && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="🧾"
                        loading={invoiceId === order.id}
                        onClick={() => handleInvoice(order)}
                      >
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </AnimatedDetail>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function AnimatedDetail({ open, children }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  )
}
