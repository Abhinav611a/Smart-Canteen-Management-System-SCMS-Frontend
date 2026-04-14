import React, { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useNotifications } from '@/context/NotificationContext'
import { CANTEEN_STATUS } from '@/services/canteenService'
import { cartService } from '@/services/cartService'
import { formatCurrency } from '@/utils/helpers'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
]

export default function StudentCart() {
  const navigate = useNavigate()

  const outletContext = useOutletContext() || {}

  const fallbackCanteenStatus = {
    status: CANTEEN_STATUS.CLOSED,
    closingSoonUntil: null,
    kitchenReady: false,
    managerReady: false,
    isOpen: false,
    isOpening: false,
    isClosing: false,
    isClosed: true,
    isOrderingAllowed: false,
    hasClosingWarning: false,
    loading: false,
    error: '',
    refresh: () => {},
    remainingMs: 0,
    countdown: '0:00',
  }

  const canteenStatus = outletContext.canteenStatus || fallbackCanteenStatus

  const {
    isOpen,
    isOpening,
    isClosing,
    isClosed,
    isOrderingAllowed,
    hasClosingWarning,
    countdown,
  } = canteenStatus

  const { items, total, count, updateQty, removeItem, clearCart, syncing } =
    useCart()
  const { addNotification } = useNotifications()

  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  const handlePlaceOrder = async () => {
    if (!isOrderingAllowed) {
      toast.error('Canteen is not accepting new orders right now.')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setPlacing(true)

    try {
      const backendCart = await cartService.getCart()

      if (!backendCart?.items?.length) {
        toast.error(
          'Your backend cart is empty. Please add items again from the menu.'
        )
        return
      }

      const order = await cartService.checkout({ paymentMethod })

      await clearCart()

      setPlaced({
        ...order,
        paymentMethod,
      })

      addNotification({
        type: 'order',
        title: 'Order Placed! 🎉',
        message: `${
          order?.orderNumber || `#${order?.id}` || 'Your order'
        } is being prepared.`,
        icon: '🍽',
      })

      toast.success(`Order placed with ${paymentMethod}`)
    } catch (error) {
      console.error('Checkout failed:', error)

      const status = error?.response?.status
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message

      const message = String(backendMessage || '').toLowerCase()

      if (
        error?.code === 'CART_EMPTY' ||
        message.includes('cart not found') ||
        message.includes('cart is empty') ||
        message.includes('empty cart')
      ) {
        toast.error(
          'Cart not found on server. Please add items again from the menu.'
        )
      } else if (status === 400) {
        toast.error(backendMessage || 'Checkout request is invalid.')
      } else {
        toast.error(backendMessage || 'Failed to place order. Please try again.')
      }
    } finally {
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-lg"
      >
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-7xl"
          >
            🎉
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Order Placed!
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {placed.orderNumber || `Order #${placed.id}`} has been sent to the
              kitchen.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-left dark:bg-gray-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Order Number
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {placed.orderNumber || `#${placed.id}`}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Total Paid
              </span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(placed.total ?? placed.totalAmount ?? total)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Payment Method
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {placed.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                {placed.statusLabel || placed.status}
              </span>
            </div>

            {placed.shortDescription && (
              <p className="text-xs italic text-slate-400 dark:text-slate-500">
                {placed.shortDescription}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
              onClick={() => navigate('/student/menu')}
            >
              Browse Menu
            </button>
            <button
              type="button"
              className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              onClick={() => navigate('/student/orders')}
            >
              Track Order
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 text-6xl"
        >
          🛒
        </motion.div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          Your cart is empty
        </h3>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          Add some delicious items from the menu!
        </p>
        <button
          type="button"
          onClick={() => navigate('/student/menu')}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-5">
      {isOpening && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Ordering not open yet</p>
            <p className="mt-1 text-xs">
              The canteen is still opening. Checkout is disabled for now.
            </p>
          </div>
        </div>
      )}

      {isClosing && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Checkout is unavailable</p>
            <p className="mt-1 text-xs">
              The canteen is closing and not accepting new orders.
            </p>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Canteen is closed</p>
            <p className="mt-1 text-xs">
              New orders cannot be placed right now.
            </p>
          </div>
        </div>
      )}

      {isOpen && hasClosingWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="text-sm font-semibold">Place your order soon</p>
          <p className="mt-1 text-xs">
            Orders are still open. Closing in{' '}
            <span className="font-bold">{countdown}</span>.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            My Cart 🛒
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {count} item{count !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => clearCart()}
          className="text-xs font-medium text-red-400 transition-colors hover:text-red-500"
          type="button"
        >
          Clear all
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-gray-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-gray-800">
                {item.emoji || '🍴'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {item.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatCurrency(item.price)} each
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold transition active:scale-95 dark:bg-gray-800"
                >
                  −
                </button>

                <span className="w-5 text-center text-sm font-semibold text-slate-900 dark:text-white">
                  {item.qty}
                </span>

                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold transition active:scale-95 dark:bg-gray-800"
                >
                  +
                </button>
              </div>

              <p className="w-16 shrink-0 text-right text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(item.price * item.qty)}
              </p>

              <button
                onClick={() => removeItem(item.id)}
                type="button"
                className="ml-1 shrink-0 text-sm text-slate-300 transition-colors hover:text-red-500 dark:text-gray-600"
                title="Remove item"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Order Summary
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>
              Subtotal ({count} item{count !== 1 ? 's' : ''})
            </span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Delivery</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              Free
            </span>
          </div>

          <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900 dark:border-gray-800 dark:text-white">
            <span>Total</span>
            <span className="text-emerald-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Payment Method
          </p>

          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method.value

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span>{method.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placing || syncing || !isOrderingAllowed}
          className="w-full rounded-2xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!isOrderingAllowed
            ? 'Ordering Unavailable'
            : placing
              ? 'Placing Order…'
              : `Place Order (${paymentMethod})`}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Checked out through your backend cart flow
        </p>
      </div>
    </div>
  )
}