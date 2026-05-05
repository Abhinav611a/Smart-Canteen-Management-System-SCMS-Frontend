import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useNotifications } from '@/context/NotificationContext'
import { useCanteen } from '@/context/CanteenContext'
import {
  cartService,
  cartSnapshotsMatch,
  isCartMismatchError,
} from '@/services/cartService'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  RefreshCw,
  Smartphone,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import {
  createPaymentOrder,
  openRazorpayCheckout,
  verifyPayment,
} from '@/services/paymentService'
import { formatCurrency } from '@/utils/helpers'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
]

const SERVER_SYNC_MESSAGE =
  'Your cart was updated to match the latest server state. Please review and place your order again.'

const ONLINE_PAYMENT_METHODS = new Set(['UPI', 'CARD'])

function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

function buildOnlinePaymentPayload(cartItems = [], paymentMethod) {
  return {
    paymentMethod,
    items: cartItems.map((item) => ({
      foodItemId: Number(item.foodItemId ?? item.id),
      quantity: Number(item.quantity ?? item.qty ?? 1),
    })),
  }
}

export default function StudentCart() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    loading: canteenLoading,
    isOrderingAllowed,
    orderBlockedMessage,
    checkoutActionLabel,
    orderNoticeTitle,
    orderNoticeDescription,
  } = useCanteen()

  const {
    items,
    total,
    count,
    loading: cartLoading,
    syncing,
    dirty,
    outOfSync,
    updateQty,
    removeItem,
    clearCart,
    refreshCart,
    replaceCartFromServer,
  } = useCart()
  const { addNotification } = useNotifications()

  const [placing, setPlacing] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState('')
  const [placed, setPlaced] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [lastFailedVerification, setLastFailedVerification] = useState(null)

  useEffect(() => {
    const syncOnMount = async () => {
      try {
        await refreshCart({ silent: true })
      } catch (error) {
        console.error('Failed to sync cart on page load:', error)
      }
    }

    syncOnMount()
  }, [refreshCart])

  const cartBusy = cartLoading || syncing || dirty || placing
  const checkoutBlocked = cartBusy || outOfSync

  const syncUiToServerCart = async ({
    latestCart = null,
    message = SERVER_SYNC_MESSAGE,
  } = {}) => {
    try {
      const cart = latestCart ?? (await refreshCart({ silent: true }))
      replaceCartFromServer(cart)
    } catch (syncError) {
      console.error('Failed to refresh latest cart state:', syncError)
    }

    toast.error(message)
  }

  const syncCartAfterOrder = async () => {
    try {
      await clearCart({ silent: true })
    } catch (syncError) {
      console.error('Failed to sync cart after order placement:', syncError)
      toast.error(
        'Order placed, but cart sync could not be confirmed. Please refresh your cart once.',
      )
    }
  }

  const handleDecreaseQty = async (item) => {
    try {
      await updateQty(item.cartItemId ?? item.id, item.qty - 1)
    } catch {
      // CartContext already shows the failure toast.
    }
  }

  const handleIncreaseQty = async (item) => {
    try {
      await updateQty(item.cartItemId ?? item.id, item.qty + 1)
    } catch {
      // CartContext already shows the failure toast.
    }
  }

  const handleRemoveItem = async (item) => {
    try {
      await removeItem(item.cartItemId ?? item.id)
    } catch {
      // CartContext already shows the failure toast.
    }
  }

  const completePlacedOrder = async (order, method) => {
    const placedPaymentMethod = order?.paymentMethod ?? method
    const placedOrder = {
      ...order,
      paymentMethod: placedPaymentMethod,
    }

    setPlaced(placedOrder)
    setLastFailedVerification(null)
    await syncCartAfterOrder()

    addNotification({
      type: 'order',
      title: 'Order Placed! ðŸŽ‰',
      message: `${
        placedOrder.orderNumber || `#${placedOrder.id}` || 'Your order'
      } is being prepared.`,
      icon: 'ðŸ½',
    })

    toast.success(`Order placed with ${placedPaymentMethod}`)
  }

  const verifyOnlinePayment = async (verificationPayload, method) => {
    setCheckoutStatus('Verifying payment...')

    try {
      const order = await verifyPayment(verificationPayload)
      await completePlacedOrder(order, method)
      return order
    } catch (error) {
      setLastFailedVerification({
        payload: verificationPayload,
        paymentMethod: method,
      })
      toast.error(
        'Payment verification failed. Please check My Orders or retry verification.',
      )
      toast(
        'If the payment was captured, the backend webhook may still recover the order.',
        { icon: 'âš ï¸' },
      )
      error.code = 'PAYMENT_VERIFY_FAILED'
      throw error
    }
  }

  const handleRetryVerification = async () => {
    if (!lastFailedVerification || placing) return

    setPlacing(true)
    setCheckoutStatus('Validating cart...')
    try {
      await verifyOnlinePayment(
        lastFailedVerification.payload,
        lastFailedVerification.paymentMethod,
      )
    } catch (error) {
      console.error('Payment verification retry failed:', error)
    } finally {
      setCheckoutStatus('')
      setPlacing(false)
    }
  }

  const handleOnlineCheckout = async (backendCart) => {
    const payload = buildOnlinePaymentPayload(backendCart?.items ?? [], paymentMethod)
    const invalidItem = payload.items.find(
      (item) =>
        !Number.isFinite(item.foodItemId) ||
        item.foodItemId <= 0 ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0,
    )

    if (!payload.items.length || invalidItem) {
      throw new Error('Some cart items could not be checked out. Please sync and try again.')
    }

    setCheckoutStatus('Creating payment...')
    setLastFailedVerification(null)
    const paymentData = await createPaymentOrder(payload)

    setCheckoutStatus('Opening payment...')

    await new Promise((resolve, reject) => {
      let settled = false

      const settle = (callback, value) => {
        if (settled) return
        settled = true
        callback(value)
      }

      openRazorpayCheckout(paymentData, {
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || user?.mobile || '',
        },
        onSuccess: async (response) => {
          const verificationPayload = {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }

          try {
            await verifyOnlinePayment(verificationPayload, paymentMethod)
            settle(resolve)
          } catch (error) {
            settle(reject, error)
          }
        },
        onDismiss: () => {
          const error = new Error('Payment cancelled')
          error.code = 'PAYMENT_CANCELLED'
          toast.error('Payment cancelled')
          settle(reject, error)
        },
        onError: (error) => {
          settle(reject, error)
        },
      }).catch((error) => {
        settle(reject, error)
      })
    })
  }

  const handlePlaceOrder = async () => {
    if (checkoutBlocked) {
      toast.error(
        outOfSync
          ? 'Your cart needs to be synced with the server before checkout.'
          : 'Your cart is still syncing. Please wait a moment.',
      )
      return
    }

    if (canteenLoading) {
      toast.error('Checking canteen status. Please wait a moment.')
      return
    }

    if (!isOrderingAllowed) {
      toast.error(
        orderBlockedMessage || 'Canteen is not accepting new orders right now.',
      )
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setPlacing(true)
    setCheckoutStatus('Validating cart...')

    try {
      const backendCart = await refreshCart({ apply: false, silent: true })

      if (!backendCart?.items?.length || !cartSnapshotsMatch(items, backendCart)) {
        await syncUiToServerCart({ latestCart: backendCart })
        return
      }

      replaceCartFromServer(backendCart)

      if (ONLINE_PAYMENT_METHODS.has(paymentMethod)) {
        await handleOnlineCheckout(backendCart)
        return
      }

      const order = await cartService.checkout({ paymentMethod })
      const placedPaymentMethod = order?.paymentMethod ?? paymentMethod
      const placedOrder = {
        ...order,
        paymentMethod: placedPaymentMethod,
      }

      setPlaced(placedOrder)
      await syncCartAfterOrder()

      addNotification({
        type: 'order',
        title: 'Order Placed! 🎉',
        message: `${
          placedOrder.orderNumber || `#${placedOrder.id}` || 'Your order'
        } is being prepared.`,
        icon: '🍽',
      })

      toast.success(`Order placed with ${placedPaymentMethod}`)
    } catch (error) {
      console.error('Checkout failed:', error)
      if (error?.checkoutDebug) {
        console.error('Checkout debug payload:', error.checkoutDebug)
      }
      console.error('Checkout error status:', error?.response?.status)
      console.error('Checkout error data:', error?.response?.data)
      console.error(
        'Checkout error data JSON:',
        JSON.stringify(error?.response?.data ?? null, null, 2),
      )
      console.error('Checkout error headers:', error?.response?.headers)
      console.error(
        'Checkout error headers JSON:',
        JSON.stringify(error?.response?.headers ?? null, null, 2),
      )

      const status = error?.response?.status
      const backendMessage = getErrorMessage(error, '')

      const message = String(backendMessage || '').toLowerCase()

      if (
        error?.code === 'INVALID_CART_ITEMS' ||
        isCartMismatchError(error) ||
        error?.code === 'CART_EMPTY' ||
        message.includes('cart not found') ||
        message.includes('cart is empty') ||
        message.includes('empty cart')
      ) {
        await syncUiToServerCart({
          latestCart: error?.latestCart,
          message: error?.message || SERVER_SYNC_MESSAGE,
        })
      } else if (
        error?.code === 'PAYMENT_CANCELLED' ||
        error?.code === 'PAYMENT_VERIFY_FAILED'
      ) {
        // The payment callbacks already showed a specific message.
      } else if (status === 400) {
        toast.error(backendMessage || 'Checkout request is invalid.')
      } else if (ONLINE_PAYMENT_METHODS.has(paymentMethod)) {
        toast.error(backendMessage || 'Failed to process payment. Please try again.')
      } else {
        toast.error(backendMessage || 'Failed to place order. Please try again.')
      }
    } finally {
      setCheckoutStatus('')
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
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
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
              <span className="inline-flex items-center justify-center gap-2">
                Browse Menu
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              onClick={() => navigate('/student/orders')}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Track Order
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </span>
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
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-gray-900 dark:text-slate-600"
        >
          <ShoppingCart className="h-12 w-12" aria-hidden="true" />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            <span className="inline-flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              My Cart
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {count} item{count !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshCart()}
            disabled={cartBusy}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-gray-800"
            title="Sync cart with server"
            type="button"
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${cartBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
              {cartBusy ? 'Syncing...' : 'Sync'}
            </span>
          </button>
          <button
            onClick={() => clearCart()}
            disabled={cartBusy}
            className="text-xs font-medium text-red-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
          >
            Clear all
          </button>
        </div>
      </div>

      {!canteenLoading && !isOrderingAllowed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {orderNoticeTitle}
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            {orderNoticeDescription}
          </p>
        </div>
      )}

      {outOfSync && items.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
          <p className="font-semibold text-red-900 dark:text-red-200">
            Cart Sync Warning
          </p>
          <p className="mt-1 text-red-700 dark:text-red-300">
            Your cart could not be confirmed with the server. Click Sync above
            before placing your order.
          </p>
        </div>
      )}

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
                  onClick={() => handleDecreaseQty(item)}
                  type="button"
                  disabled={cartBusy}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
                >
                <Minus className="h-4 w-4" aria-hidden="true" />
                </button>

                <span className="w-5 text-center text-sm font-semibold text-slate-900 dark:text-white">
                  {item.qty}
                </span>

                <button
                  onClick={() => handleIncreaseQty(item)}
                  type="button"
                  disabled={cartBusy || !isOrderingAllowed}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <p className="w-16 shrink-0 text-right text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(item.price * item.qty)}
              </p>

              <button
                onClick={() => handleRemoveItem(item)}
                type="button"
                disabled={cartBusy}
                className="ml-1 shrink-0 text-sm text-slate-300 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-600"
                title="Remove item"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
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
              const PaymentIcon = method.icon

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  disabled={cartBusy}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <PaymentIcon className="h-5 w-5" aria-hidden="true" />
                  <span>{method.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {lastFailedVerification && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Payment verification needs attention
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              Payment verification failed. Please check My Orders or retry verification.
            </p>
            <button
              type="button"
              onClick={handleRetryVerification}
              disabled={cartBusy}
              className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing ? 'Verifying payment...' : 'Retry Verification'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={checkoutBlocked || !isOrderingAllowed}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {canteenLoading
            ? 'Checking Status...'
            : !isOrderingAllowed
              ? checkoutActionLabel
              : placing
                ? checkoutStatus || 'Processing...'
                : `Place Order (${paymentMethod})`}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          {ONLINE_PAYMENT_METHODS.has(paymentMethod)
            ? 'Online payments are verified by Razorpay before the order is created'
            : 'Checked out through your backend cart flow'}
        </p>
      </div>
    </div>
  )
}
