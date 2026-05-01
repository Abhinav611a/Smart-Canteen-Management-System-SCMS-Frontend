import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Minus, Plus, Trash2, ShoppingCart, QrCode } from 'lucide-react'
import { menuService } from '@/services/menu'
import { placePosOrder, buildPosOrderPayload, validatePosOrder } from '@/services/posOrders'
import { getApiErrorMessage } from '@/utils/getApiErrorMessage'
import PosQrModal from '@/components/pos/PosQrModal'

function getItemTypeMeta(isPreparedItem) {
  if (isPreparedItem === true) {
    return {
      label: 'Prepared',
      className: 'bg-amber-100 text-amber-700',
    }
  }

  if (isPreparedItem === false) {
    return {
      label: 'Readymade',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  return {
    label: 'Item Type Unknown',
    className: 'bg-gray-100 text-gray-700',
  }
}

export default function PosScreen({ menuItems: initialMenuItems } = {}) {
  const hasMenuItemsProp = Array.isArray(initialMenuItems)
  const [menuItems, setMenuItems] = useState(hasMenuItemsProp ? initialMenuItems : [])
  const [menuLoading, setMenuLoading] = useState(!hasMenuItemsProp)
  const [posItems, setPosItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
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
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">Walk-in POS</h1>
        </div>

        {menuLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Loading menu...
          </div>
        ) : availableMenuItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No menu items available
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableMenuItems.map((food) => {
              const itemType = getItemTypeMeta(food.isPreparedItem)

              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addItem(food)}
                  className="rounded-2xl border border-gray-200 p-4 text-left transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{food.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {food.category ?? food.foodCategory ?? 'MAIN'}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      ₹{Number(food.price ?? 0)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${itemType.className}`}>
                      {itemType.label}
                    </span>

                    <span className="text-sm font-medium text-gray-700">Add</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Current POS Order</h2>
        </div>

        <div className="space-y-3">
          {posItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No items added yet
            </div>
          ) : (
            posItems.map((item) => (
              <div
                key={item.foodItemId}
                className="rounded-2xl border border-gray-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">₹{item.price} each</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.foodItemId)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItemId, item.quantity - 1)}
                      className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="min-w-8 text-center font-semibold text-gray-900">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItemId, item.quantity + 1)}
                      className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="font-semibold text-gray-900">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Payment Method</p>

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
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {method}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-2xl font-bold text-gray-900">₹{totalAmount}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetPos}
              disabled={submitting || posItems.length === 0}
              className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handlePlacePosOrder}
              disabled={submitting || posItems.length === 0}
              className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
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
