import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'
import PosQrModal from '@/components/pos/PosQrModal'
import Button from '@/components/ui/Button'
import { useMenu } from '@/hooks/useMenu'
import {
  buildPosOrderPayload,
  placePosOrder,
  validatePosOrder,
} from '@/services/posOrders'
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_EMOJIS,
  MENU_CATEGORY_LABELS,
} from '@/utils/constants'
import { formatCurrency } from '@/utils/helpers'
import { getApiErrorMessage } from '@/utils/getApiErrorMessage'

const POS_PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
]

function createNotice(kind, title, message) {
  return { kind, title, message }
}

function getNoticeClasses(kind = 'info') {
  if (kind === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (kind === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  }

  return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
}

export default function PosScreen() {
  const { menu, loading, error, refetch } = useMenu()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [posItems, setPosItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(
    createNotice(
      'info',
      'Admin POS',
      'Build a walk-in order locally, then submit it directly to the POS order endpoint.',
    ),
  )
  const [qrOrder, setQrOrder] = useState(null)

  const availableMenu = menu.filter((item) => item.available)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredMenu = availableMenu.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category
    const matchesSearch = !normalizedSearch
      ? true
      : item.name.toLowerCase().includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })

  const totalItems = posItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = posItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  )
  const validationIssues = validatePosOrder(posItems, paymentMethod)
  const submitDisabled = submitting || validationIssues.length > 0

  const addItemToPos = (menuItem) => {
    setPosItems((current) => {
      const foodItemId = Number(menuItem.id)
      const existingItem = current.find((item) => item.foodItemId === foodItemId)

      if (existingItem) {
        return current.map((item) =>
          item.foodItemId === foodItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...current,
        {
          foodItemId,
          name: menuItem.name,
          price: Number(menuItem.price || 0),
          category: menuItem.category,
          emoji: menuItem.emoji || MENU_CATEGORY_EMOJIS[menuItem.category] || '🍴',
          quantity: 1,
        },
      ]
    })
  }

  const updateItemQuantity = (foodItemId, nextQuantity) => {
    setPosItems((current) => {
      if (nextQuantity <= 0) {
        return current.filter((item) => item.foodItemId !== foodItemId)
      }

      return current.map((item) =>
        item.foodItemId === foodItemId
          ? { ...item, quantity: nextQuantity }
          : item,
      )
    })
  }

  const clearLocalPosDraft = () => {
    setPosItems([])
    setPaymentMethod('')
  }

  const handleSubmitOrder = async () => {
    const issues = validatePosOrder(posItems, paymentMethod)
    if (issues.length) {
      toast.error(issues[0])
      return
    }

    setSubmitting(true)

    try {
      const payload = buildPosOrderPayload(posItems, paymentMethod)
      const order = await placePosOrder(payload)
      const orderLabel =
        order.orderNumber || (order.id != null ? `#${order.id}` : 'POS Order')
      const shouldShowQr =
        order.status === 'READY' && order.showQr === true && Boolean(order.pickupCode)

      clearLocalPosDraft()

      if (shouldShowQr) {
        setQrOrder(order)
        setNotice(
          createNotice(
            'success',
            'Pickup QR ready',
            `${orderLabel} is ready now. Show the QR code at pickup.`,
          ),
        )
        toast.success(`${orderLabel} is ready for pickup.`)
        return
      }

      if (order.status === 'PENDING') {
        setQrOrder(null)
        setNotice(
          createNotice(
            'warning',
            'Order sent to kitchen',
            `${orderLabel} is pending preparation. No pickup QR is available yet.`,
          ),
        )
        toast.success(`${orderLabel} is pending preparation.`)
        return
      }

      setQrOrder(null)
      setNotice(
        createNotice(
          'success',
          'POS order placed',
          `${orderLabel} was placed successfully with status ${order.statusLabel || order.status}.`,
        ),
      )
      toast.success(`${orderLabel} placed successfully.`)
    } catch (submitError) {
      toast.error(
        getApiErrorMessage(submitError, 'Unable to place the POS order right now.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Admin POS</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Walk-in orders stay in local page state until you submit them to the
              dedicated POS endpoint.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Draft Total
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {formatCurrency(totalAmount)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${getNoticeClasses(notice.kind)}`}
        >
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1">{notice.message}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Menu
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {availableMenu.length} available item{availableMenu.length !== 1 ? 's' : ''}
                </p>
              </div>

              <Button variant="secondary" onClick={() => refetch()}>
                Refresh Menu
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  className="input-field pl-10"
                  placeholder="Search menu items..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {MENU_CATEGORIES.map((menuCategory) => (
                  <button
                    key={menuCategory}
                    type="button"
                    onClick={() => setCategory(menuCategory)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      category === menuCategory
                        ? 'bg-emerald-500 text-white'
                        : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                    }`}
                  >
                    {MENU_CATEGORY_LABELS[menuCategory] ?? menuCategory}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-gray-800"
                  />
                ))}
              </div>
            ) : filteredMenu.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMenu.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addItemToPos(item)}
                    className="flex h-full flex-col items-start rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/5"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className="text-3xl">
                        {item.emoji || MENU_CATEGORY_EMOJIS[item.category] || '🍴'}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-gray-900 dark:text-slate-300">
                        {MENU_CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <span>+</span>
                      <span>Add to POS</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-gray-700 dark:text-slate-400">
                No menu items match this filter.
              </div>
            )}
          </section>

          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Walk-in Order
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Local draft only. No cart sync is used here.
                </p>
              </div>

              <Button
                variant="ghost"
                onClick={clearLocalPosDraft}
                disabled={!posItems.length && !paymentMethod}
              >
                Clear Draft
              </Button>
            </div>

            {posItems.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800">
                <AnimatePresence initial={false}>
                  {posItems.map((item) => (
                    <motion.div
                      key={item.foodItemId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
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

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.foodItemId, item.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-gray-800"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.foodItemId, item.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-gray-800"
                        >
                          +
                        </button>
                      </div>

                      <p className="w-16 text-right text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-gray-700 dark:text-slate-400">
                Add menu items to start a walk-in order.
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Payment Method
              </p>

              <div className="grid grid-cols-2 gap-3">
                {POS_PAYMENT_OPTIONS.map((method) => {
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

            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Items ({totalItems})</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900 dark:border-gray-800 dark:text-white">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {validationIssues.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                {validationIssues[0]}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={submitDisabled}
              onClick={handleSubmitOrder}
            >
              {submitting
                ? 'Placing POS Order...'
                : paymentMethod
                  ? `Place Walk-in Order (${paymentMethod})`
                  : 'Place Walk-in Order'}
            </Button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Submits directly to `POST /admin/pos/orders` and clears only this
              page&apos;s local POS draft on success.
            </p>
          </section>
        </div>
      </div>

      <PosQrModal
        open={Boolean(qrOrder)}
        order={qrOrder}
        onClose={() => setQrOrder(null)}
      />
    </>
  )
}
