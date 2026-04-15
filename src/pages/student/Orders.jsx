/**
 * StudentOrders.jsx
 * ──────────────────
 * Student order history with live updates, reorder, and invoice download.
 */

import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { RefreshCw, ChevronDown, ChevronUp, Clock3 } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCanteen } from '@/context/CanteenContext'
import { ordersService } from '@/services/orders'
import { ratingService } from '@/services/ratingService'
import RatingModal from '@/components/ui/RatingModal'
import {
  ORDER_STATUS,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS,
  MENU_CATEGORY_EMOJIS,
} from '@/utils/constants'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { SkeletonTable } from '@/components/ui/Skeleton'

const STEPS = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.COMPLETED,
]

function getStatusBadgeClass(status) {
  switch (status) {
    case ORDER_STATUS.READY:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
    case ORDER_STATUS.PREPARING:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
    case ORDER_STATUS.PENDING:
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400'
    case ORDER_STATUS.COMPLETED:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
    case ORDER_STATUS.CANCELLED:
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
  }
}

function OrderProgress({ status }) {
  if (status === ORDER_STATUS.CANCELLED) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-red-500">
        <span>❌</span>
        <span>Order was cancelled</span>
      </div>
    )
  }

  const currentIdx = STEPS.indexOf(status)

  return (
    <div className="mt-2 flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx
        const current = i === currentIdx

        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1">
              <div
                className={[
                  'flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all',
                  current
                    ? 'scale-110 border-emerald-500 bg-emerald-500 text-white'
                    : done
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-slate-200 text-slate-400 dark:border-gray-700',
                ].join(' ')}
              >
                {done && !current ? '✓' : i + 1}
              </div>

              <span
                className={[
                  'hidden text-[10px] capitalize sm:block',
                  done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400',
                ].join(' ')}
              >
                {step.toLowerCase()}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={[
                  'h-px flex-1',
                  i < currentIdx
                    ? 'bg-emerald-400'
                    : 'bg-slate-200 dark:bg-gray-700',
                ].join(' ')}
              />
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
  const normalizedStatus = String(timeStatus || '').toLowerCase()
  const isLate =
    normalizedStatus.includes('late') || normalizedStatus.includes('over')

  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-xs font-semibold',
        isLate
          ? 'text-red-500'
          : 'text-amber-600 dark:text-amber-400',
      ].join(' ')}
    >
      <Clock3 size={12} />
      <span className="font-mono">
        {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
      </span>
      {timeStatus ? <span className="font-normal">· {timeStatus}</span> : null}
    </span>
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

export default function StudentOrders() {
  const { orders, loading, error, refetch, applyRealtimeUpdate } =
    useOrders('my')
  const { isOrderingAllowed, orderBlockedMessage } = useCanteen()

  const [expandedId, setExpandedId] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
  const [invoiceId, setInvoiceId] = useState(null)
  const [ratingModal, setRatingModal] = useState({ open: false, item: null })

  const { isConnected } = useWebSocket(
    'user:orders',
    useCallback(
      (updatedOrder) => {
        applyRealtimeUpdate(updatedOrder)

        const activeStatuses = [
          ORDER_STATUS.PENDING,
          ORDER_STATUS.PREPARING,
          ORDER_STATUS.READY,
        ]

        if (activeStatuses.includes(updatedOrder.status)) {
          toast(
            `Your order ${
              updatedOrder.orderNumber || `#${updatedOrder.id}`
            } is now ${
              updatedOrder.statusLabel || updatedOrder.status
            }!`,
            {
              icon: ORDER_STATUS_ICONS[updatedOrder.status],
              duration: 5000,
            }
          )
        }
      },
      [applyRealtimeUpdate]
    )
  )

  const handleReorder = async (order) => {
    if (!isOrderingAllowed) {
      toast.error(
        orderBlockedMessage || 'Canteen is not accepting new orders right now.'
      )
      return
    }

    setReorderingId(order.id)

    try {
      await ordersService.reorder(order.id)
      toast.success('Items added to cart! Go to cart to checkout.')
    } catch (err) {
      toast.error(`Reorder failed: ${err.message}`)
    } finally {
      setReorderingId(null)
    }
  }

  const handleInvoice = async (order) => {
    setInvoiceId(order.id)

    try {
      const lines = await ordersService.getInvoice(order.id)
      const content = Array.isArray(lines) ? lines.join('\n') : String(lines)
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `invoice-${order.orderNumber || order.id}.txt`
      a.click()

      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded!')
    } catch (err) {
      toast.error(`Invoice download failed: ${err.message}`)
    } finally {
      setInvoiceId(null)
    }
  }

  const handleRatingSubmit = async ({ rating, review }) => {
    if (!ratingModal.item) return

    try {
      await ratingService.submitRating({
        foodItemId: ratingModal.item.foodItemId,
        rating,
        review,
      })
      toast.success('Rating submitted successfully!')
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Cannot rate this item'
      toast.error(message)
      throw err // Re-throw to prevent modal from closing
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          My Orders 📦
        </h2>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <SkeletonTable rows={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            My Orders 📦
          </h2>

          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </p>

            {isConnected && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live updates
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={refetch}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {orders.length === 0 && !error && (
        <div className="py-20 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4 text-5xl"
          >
            📦
          </motion.div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No orders yet
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Start by ordering your favorite meal
          </p>

          <Link
            to="/student/menu"
            className="mt-4 inline-flex rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Browse Menu
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedId === order.id
          const isActive = [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.PREPARING,
            ORDER_STATUS.READY,
          ].includes(order.status)

          return (
            <motion.div
              key={order.id}
              layout
              className={[
                'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow dark:border-gray-800 dark:bg-gray-900',
                isActive
                  ? 'ring-1 ring-emerald-200 dark:ring-emerald-500/20'
                  : '',
              ].join(' ')}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {order.orderNumber || `#${order.id}`}
                    </p>

                    <span
                      className={[
                        'rounded-full px-2.5 py-1 text-xs font-semibold',
                        getStatusBadgeClass(order.status),
                      ].join(' ')}
                    >
                      {ORDER_STATUS_ICONS[order.status]}{' '}
                      {order.statusLabel ||
                        ORDER_STATUS_LABELS[order.status] ||
                        order.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {order.formattedDate || formatDateTime(order.createdAt)}
                  </p>

                  {order.shortDescription ? (
                    <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                      {order.shortDescription}
                    </p>
                  ) : null}

                  <OrderProgress status={order.status} />

                  {isActive && order.elapsedSeconds > 0 ? (
                    <div className="mt-2">
                      <ElapsedTimer
                        seconds={order.elapsedSeconds}
                        timeStatus={order.timeStatus}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-emerald-600">
                    {formatCurrency(order.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {order.totalItems} item{order.totalItems !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    {isExpanded ? (
                      <>
                        <ChevronUp size={12} />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        Details
                      </>
                    )}
                  </p>
                </div>
              </button>

              <AnimatedDetail open={isExpanded}>
                <div className="space-y-3 px-4 pb-4">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-800">
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span>
                              {MENU_CATEGORY_EMOJIS[item.category] || '🍴'}
                            </span>
                            <span className="truncate">{item.name}</span>
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-medium">
                              {formatCurrency(item.price)}
                            </span>
                            {order.status === ORDER_STATUS.COMPLETED && (
                              <button
                                type="button"
                                onClick={() => setRatingModal({ open: true, item })}
                                className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25 transition-colors"
                              >
                                Rate
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900 dark:border-gray-700 dark:text-white">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.canReorder && (
                      <button
                        type="button"
                        disabled={reorderingId === order.id || !isOrderingAllowed}
                        onClick={() => handleReorder(order)}
                        className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                      >
                        {reorderingId === order.id
                          ? 'Reordering...'
                          : !isOrderingAllowed
                            ? 'Reorder Unavailable'
                            : 'Reorder'}
                      </button>
                    )}

                    {order.canDownloadInvoice && (
                      <button
                        type="button"
                        disabled={invoiceId === order.id}
                        onClick={() => handleInvoice(order)}
                        className="rounded-2xl px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500/10"
                      >
                        {invoiceId === order.id
                          ? 'Downloading...'
                          : 'Download Invoice'}
                      </button>
                    )}
                  </div>
                </div>
              </AnimatedDetail>
            </motion.div>
          )
        })}
      </div>

      <RatingModal
        open={ratingModal.open}
        onClose={() => setRatingModal({ open: false, item: null })}
        itemName={ratingModal.item?.name || ''}
        onSubmit={handleRatingSubmit}
      />
    </div>
  )
}
