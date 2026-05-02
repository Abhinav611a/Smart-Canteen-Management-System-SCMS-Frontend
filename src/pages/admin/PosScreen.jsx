import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Minus, Plus, Trash2, ShoppingCart, QrCode } from 'lucide-react'
import { menuService } from '@/services/menu'
import { placePosOrder, buildPosOrderPayload, validatePosOrder } from '@/services/posOrders'
import { getApiErrorMessage } from '@/utils/getApiErrorMessage'
import { MENU_CATEGORIES, MENU_CATEGORY_LABELS } from '@/utils/constants'
import PosQrModal from '@/components/pos/PosQrModal'

const itemGridVariants = {
  visible: {
    transition: {
      staggerChildren: 0.025,
    },
  },
}

const itemCardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
}

function getItemTypeMeta(isPreparedItem) {
  if (isPreparedItem === true) {
    return {
      label: 'Prepared',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    }
  }

  if (isPreparedItem === false) {
    return {
      label: 'Readymade',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    }
  }

  return {
    label: 'Item Type Unknown',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
}

export default function PosScreen({ menuItems: initialMenuItems } = {}) {
  const hasMenuItemsProp = Array.isArray(initialMenuItems)
  const [menuItems, setMenuItems] = useState(hasMenuItemsProp ? initialMenuItems : [])
  const [menuLoading, setMenuLoading] = useState(!hasMenuItemsProp)
  const [posItems, setPosItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    if (hasMenuItemsProp) {
      setMenuItems(initialMenuItems)
      setMenuLoading(false)
      return undefined
    }

    let cancelled = false

    async function loadMenuItems() {
      setMenuLoading(true)

      try {
        const items = await menuService.getAll()

        if (!cancelled) {
          setMenuItems(Array.isArray(items) ? items : [])
        }
      } catch (error) {
        if (!cancelled) {
          setMenuItems([])
          toast.error(getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) {
          setMenuLoading(false)
        }
      }
    }

    loadMenuItems()

    return () => {
      cancelled = true
    }
  }, [hasMenuItemsProp, initialMenuItems])

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.available !== false),
    [menuItems],
  )

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return availableMenuItems.filter((item) => {
      const itemCategory = item.category ?? item.foodCategory
      const matchesCategory =
        selectedCategory === 'ALL' ||
        itemCategory === selectedCategory

      const matchesSearch =
        !query ||
        String(item.name ?? '').toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [availableMenuItems, searchQuery, selectedCategory])

  const totalAmount = useMemo(() => {
    return posItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
  }, [posItems])

  const addItem = (food) => {
    setPosItems((current) => {
      const existing = current.find((item) => item.foodItemId === food.id)
      if (existing) {
        return current.map((item) =>
          item.foodItemId === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [
        ...current,
        {
          foodItemId: food.id,
          name: food.name,
          price: Number(food.price ?? 0),
          quantity: 1,
          isPreparedItem: food.isPreparedItem,
          category: food.category ?? food.foodCategory ?? 'MAIN',
        },
      ]
    })
  }

  const updateQuantity = (foodItemId, nextQuantity) => {
    if (nextQuantity <= 0) {
      setPosItems((current) => current.filter((item) => item.foodItemId !== foodItemId))
      return
    }

    setPosItems((current) =>
      current.map((item) =>
        item.foodItemId === foodItemId
          ? { ...item, quantity: nextQuantity }
          : item
      )
    )
  }

  const removeItem = (foodItemId) => {
    setPosItems((current) => current.filter((item) => item.foodItemId !== foodItemId))
  }

  const resetPos = () => {
    setPosItems([])
    setPaymentMethod('CASH')
  }

  const handlePlacePosOrder = async () => {
    try {
      validatePosOrder(posItems, paymentMethod)
      setSubmitting(true)

      const payload = buildPosOrderPayload(posItems, paymentMethod)
      const order = await placePosOrder(payload)

      setLastOrder(order)
      toast.success(order?.message || 'POS order placed successfully')

      if (order.status === 'READY' && order.showQr && order.pickupCode) {
        setShowQrModal(true)
      } else if (order.status === 'PENDING') {
        toast.success('Order sent to kitchen queue')
      }

      resetPos()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Walk-in POS</h1>
        </div>

        <div className="mb-4 space-y-3">
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {MENU_CATEGORIES.map((category) => {
              const value = category === 'All' ? 'ALL' : category
              const active = selectedCategory === value

              return (
                <motion.button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  whileTap={{ scale: 0.96 }}
                  animate={{ scale: active ? 1.03 : 1 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-1 dark:ring-slate-800 dark:hover:bg-slate-900'
                  }`}
                >
                  {value === 'ALL' ? 'All' : MENU_CATEGORY_LABELS[value] ?? value}
                </motion.button>
              )
            })}
          </div>
        </div>

        {menuLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Loading menu...
          </div>
        ) : availableMenuItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No menu items available
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No items found
          </div>
        ) : (
          <motion.div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            variants={itemGridVariants}
            initial={false}
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
            {filteredItems.map((food) => {
              const itemType = getItemTypeMeta(food.isPreparedItem)

              return (
                <motion.button
                  key={food.id}
                  type="button"
                  layout
                  variants={itemCardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={() => addItem(food)}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{food.name}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {food.category ?? food.foodCategory ?? 'MAIN'}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      ₹{Number(food.price ?? 0)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${itemType.className}`}>
                      {itemType.label}
                    </span>

                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add</span>
                  </div>
                </motion.button>
              )
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Current POS Order</h2>
        </div>

        <div className="space-y-3">
          {posItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No items added yet
            </div>
          ) : (
            posItems.map((item) => (
              <div
                key={item.foodItemId}
                className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">₹{item.price} each</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.foodItemId)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItemId, item.quantity - 1)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="min-w-8 text-center font-semibold text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItemId, item.quantity + 1)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-slate-950/70">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</p>

          <div className="grid grid-cols-2 gap-3">
            {['CASH', 'UPI'].map((method) => {
              const active = paymentMethod === method
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-900'
                  }`}
                >
                  {method}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalAmount}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetPos}
              disabled={submitting || posItems.length === 0}
              className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handlePlacePosOrder}
              disabled={submitting || posItems.length === 0}
              className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {submitting ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </div>
      </aside>

      <PosQrModal
        open={showQrModal}
        order={lastOrder}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  )
}
