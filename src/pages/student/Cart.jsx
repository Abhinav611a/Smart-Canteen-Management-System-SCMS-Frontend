import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useCart } from '@/context/CartContext'
import { useNotifications } from '@/context/NotificationContext'
import { cartService } from '@/services/cartService'
import { formatCurrency } from '@/utils/helpers'
import Button from '@/components/ui/Button'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
]

export default function StudentCart() {
  const navigate = useNavigate()
  const { items, total, count, updateQty, removeItem, clearCart, syncing } = useCart()
  const { addNotification } = useNotifications()
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  const tryCheckout = async () => {
    const attempts = [
      () => cartService.checkout({ paymentMethod }),
      () => cartService.checkout(paymentMethod),
      () => cartService.checkout({ method: paymentMethod }),
      () => cartService.checkout(),
    ]

    let lastError = null

    for (const attempt of attempts) {
      try {
        const result = await attempt()
        return result
      } catch (error) {
        lastError = error

        const status = error?.response?.status
        if (status !== 400) {
          throw error
        }
      }
    }

    throw lastError || new Error('Checkout failed.')
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setPlacing(true)

    try {
      const order = await tryCheckout()

      resetCart()
      setPlaced({
        ...order,
        paymentMethod,
      })

      addNotification({
        type: 'order',
        title: 'Order Placed! 🎉',
        message: `${order?.orderNumber || `#${order?.id}` || 'Your order'} is being prepared.`,
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

      if (status === 400) {
        toast.error(backendMessage || 'Checkout request is invalid.')
      } else {
        toast.error('Failed to place order. Please try again.')
      }
    } finally {
      setPlacing(false)
    }
  }

  if (placed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
        <div className="glass-card p-8 text-center space-y-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-7xl"
          >
            🎉
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Placed!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {placed.orderNumber || `Order #${placed.id}`} has been sent to the kitchen.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order Number</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {placed.orderNumber || `#${placed.id}`}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(placed.total ?? placed.totalAmount ?? total)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Method</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {placed.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="badge badge-yellow">{placed.statusLabel || placed.status}</span>
            </div>

            {placed.shortDescription && (
              <p className="text-xs text-gray-400 italic">{placed.shortDescription}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/student/menu')}
            >
              Browse Menu
            </Button>
            <Button className="flex-1" onClick={() => navigate('/student/orders')}>
              Track Order
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl mb-4"
        >
          🛒
        </motion.div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Your cart is empty
        </h3>
        <p className="text-gray-400 text-sm mb-8">Add some delicious items from the menu!</p>
        <Button icon="🍽" onClick={() => navigate('/student/menu')}>
          Browse Menu
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">My Cart 🛒</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {count} item{count !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => clearCart()}
          className="text-xs text-red-400 hover:text-red-500 transition-colors font-medium"
          type="button"
        >
          Clear all
        </button>
      </div>

      <div className="glass-card divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-4 p-4"
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {item.emoji || '🍴'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  type="button"
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors flex items-center justify-center text-sm"
                >
                  −
                </button>

                <span className="w-5 text-center text-sm font-bold text-gray-900 dark:text-white">
                  {item.qty}
                </span>

                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  type="button"
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 font-bold hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>

              <p className="text-sm font-bold text-gray-900 dark:text-white w-16 text-right shrink-0">
                {formatCurrency(item.price * item.qty)}
              </p>

              <button
                onClick={() => removeItem(item.id)}
                type="button"
                className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0 ml-1 text-sm"
                title="Remove item"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="glass-card p-5 space-y-5">
        <h3 className="font-semibold text-gray-900 dark:text-white">Order Summary</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal ({count} item{count !== 1 ? 's' : ''})</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Delivery</span>
            <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between font-bold text-base text-gray-900 dark:text-white">
            <span>Total</span>
            <span className="text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Method</p>

          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method.value

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span>{method.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          loading={placing || syncing}
          onClick={handlePlaceOrder}
          icon="🍽"
        >
          {placing ? 'Placing Order…' : `Place Order (${paymentMethod})`}
        </Button>

        <p className="text-xs text-center text-gray-400">
          Checked out through your backend cart flow
        </p>
      </div>
    </div>
  )
}