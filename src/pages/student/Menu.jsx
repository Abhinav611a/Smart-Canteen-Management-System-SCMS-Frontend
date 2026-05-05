import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Search,
  Plus,
  Minus,
  ArrowRight,
  Star,
  Clock,
  PackageCheck,
  Flame,
  SearchX,
  ShoppingCart,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCanteen } from '@/context/CanteenContext'
import { useMenu } from '@/hooks/useMenu'
import { formatCurrency } from '@/utils/helpers'
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  MENU_CATEGORY_EMOJIS,
} from '@/utils/constants'
import { SkeletonCard } from '@/components/ui/Skeleton'

function getPrepBadge(item) {
  if (item.itemType === 'READY_MADE') {
    return {
      label: 'Instant',
      icon: PackageCheck,
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    }
  }

  return {
    label: `Takes ${item.prepTimeMinutes ?? 10} min`,
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  }
}

export default function StudentMenu() {
  const { addItem, removeItem, items: cartItems, syncing: cartSyncing } = useCart()
  const { menu, loading, error } = useMenu()
  const {
    loading: canteenLoading,
    isOrderingAllowed,
    orderBlockedMessage,
    orderActionLabel,
    orderNoticeTitle,
    orderNoticeDescription,
  } = useCanteen()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [brokenImages, setBrokenImages] = useState({})

  const filtered = useMemo(() => {
    return menu.filter((item) => {
      const matchesCat = category === 'All' || item.category === category
      const searchText = search.toLowerCase()

      const matchesSearch =
        item.name.toLowerCase().includes(searchText) ||
        (item.description ?? '').toLowerCase().includes(searchText)

      return matchesCat && matchesSearch
    })
  }, [menu, search, category])

  const cartEntriesByMenuItemId = useMemo(
    () =>
      cartItems.reduce((map, cartItem) => {
        const menuItemId = Number(cartItem.foodItemId ?? cartItem.id)

        if (!Number.isFinite(menuItemId) || menuItemId <= 0) {
          return map
        }

        const quantity = cartItem.qty || cartItem.quantity || 0
        const existing = map.get(menuItemId)

        if (existing) {
          existing.qty += quantity
          return map
        }

        map.set(menuItemId, {
          qty: quantity,
          cartItemId: cartItem.cartItemId ?? cartItem.id,
        })

        return map
      }, new Map()),
    [cartItems]
  )

  const getCartEntry = (id) => cartEntriesByMenuItemId.get(Number(id)) ?? null

  const cartQty = (id) => getCartEntry(id)?.qty || 0

  const hasUsableImage = (item) => Boolean(item.imageUrl && !brokenImages[item.id])

  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.qty || 0), 0),
    [cartItems]
  )

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.qty || 0),
        0
      ),
    [cartItems]
  )

  const availableCount = useMemo(
    () => menu.filter((item) => item.available).length,
    [menu]
  )

  const handleAdd = async (item) => {
    if (canteenLoading) {
      toast.error('Checking canteen status. Please wait a moment.')
      return
    }

    if (!isOrderingAllowed) {
      toast.error(
        orderBlockedMessage || 'Canteen is not accepting new orders right now.'
      )
      return
    }

    if (!item.available) {
      toast.error('This item is currently unavailable.')
      return
    }

    try {
      const updatedCart = await addItem(item)
      if (!updatedCart) return

      toast.success(`${item.emoji} ${item.name} added to cart!`, {
        id: `add-${item.id}`,
      })
    } catch {
      // CartContext already shows the failure toast.
    }
  }

  const handleDecrease = async (item) => {
    const cartEntry = getCartEntry(item.id)
    const qty = cartEntry?.qty || 0
    if (qty <= 0) return

    try {
      const updatedCart = await removeItem(cartEntry?.cartItemId ?? item.id)
      if (!updatedCart) return

      if (qty === 1) {
        toast(`${item.emoji} ${item.name} removed from cart`, {
          id: `remove-${item.id}`,
        })
      }
    } catch {
      // CartContext already shows the failure toast.
    }
  }

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden pb-24 lg:space-y-6 lg:pb-6">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-2xl">
              <span className="inline-flex items-center gap-2">
                <Utensils className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                Today&apos;s Menu
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {loading ? 'Loading menu…' : `${availableCount} items available`}
            </p>
          </div>
        </div>

        {!canteenLoading && !isOrderingAllowed && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {orderNoticeTitle}
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {orderNoticeDescription}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full max-w-full rounded-2xl border border-slate-200 bg-slate-100 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-900 dark:focus:ring-emerald-500/10"
              placeholder="Search delicious meals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div
            className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            data-swipe-ignore="true"
          >
            <div className="flex w-max gap-2">
              {MENU_CATEGORIES.map((cat) => {
                const isActive = category === cat

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={[
                      'whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {cat !== 'All' ? `${MENU_CATEGORY_EMOJIS[cat]} ` : ''}
                    {MENU_CATEGORY_LABELS[cat] ?? cat}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          Failed to load menu: {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <SearchX className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No items match your search.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setCategory('All')
            }}
            className="mt-3 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <motion.div
          layout
          className="grid w-full max-w-full grid-cols-1 gap-5 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence>
            {filtered.map((item, i) => {
              const qty = cartQty(item.id)
              const canInteract = item.available && isOrderingAllowed && !cartSyncing
              const showImage = hasUsableImage(item)
              const prepBadge = getPrepBadge(item)
              const PrepIcon = prepBadge.icon

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.03 }}
                  className={[
                    'w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 sm:p-4',
                    item.available
                      ? 'hover:-translate-y-0.5 hover:shadow-md'
                      : 'opacity-70',
                    'dark:border-gray-800 dark:bg-gray-900',
                  ].join(' ')}
                >
                  <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-gray-800 dark:to-gray-950">
                    <div className="absolute left-3 top-3 z-10">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                          item.available
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-400 text-white',
                        ].join(' ')}
                      >
                        {item.available ? 'In Stock' : 'Sold Out'}
                      </span>
                    </div>

                    {item.ordersToday > 30 && item.available && (
                      <div className="absolute right-3 top-3 z-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                          <Flame className="h-3 w-3" aria-hidden="true" />
                          Popular
                        </span>
                      </div>
                    )}

                    {showImage ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-36 w-full object-cover transition-transform duration-200 hover:scale-105"
                        onError={() => setBrokenImages((current) => ({ ...current, [item.id]: true }))}
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center text-6xl transition-transform duration-200 hover:scale-105">
                        {item.emoji}
                      </div>
                    )}

                    {!item.available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">
                          Currently unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {MENU_CATEGORY_EMOJIS[item.category]}{' '}
                          {MENU_CATEGORY_LABELS[item.category] ?? item.category}
                        </p>
                        <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </h3>
                      </div>

                      <p className="shrink-0 text-lg font-extrabold text-emerald-600">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {item.description || 'Freshly prepared and ready to order.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${prepBadge.className}`}>
                        {PrepIcon && <PrepIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        <span className="min-w-0 truncate leading-tight">
                          {prepBadge.label}
                        </span>
                      </span>
                      {item.rating == null ? (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-500 dark:bg-gray-800/80 dark:text-slate-400">
                          <Star className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate leading-tight">No ratings</span>
                        </span>
                      ) : (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true" />
                          <span className="truncate leading-tight">{item.rating}</span>
                        </span>
                      )}
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-500 dark:bg-gray-800/80 dark:text-slate-400">
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate leading-tight">
                          {item.ordersToday ?? 0} ordered
                        </span>
                      </span>
                    </div>

                    {qty > 0 ? (
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          disabled={cartSyncing}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus size={16} />
                        </button>

                        <div className="text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            In Cart • {qty}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAdd(item)}
                          disabled={!canInteract}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-gray-700"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        disabled={!canInteract}
                        className="flex w-full max-w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-gray-700 dark:disabled:text-slate-400"
                      >
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        {canteenLoading
                          ? 'Checking Status...'
                          : isOrderingAllowed
                            ? 'Add to Cart'
                            : orderActionLabel}
                      </button>
                    )}
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 lg:hidden">
          <Link
            to="/student/cart"
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-3xl bg-emerald-500 px-4 py-3 text-white shadow-lg shadow-emerald-500/25"
          >
            <div>
              <p className="text-xs font-medium text-emerald-50">View cart</p>
              <p className="text-sm font-bold">
                {cartItemCount} item{cartItemCount > 1 ? 's' : ''} ·{' '}
                {formatCurrency(cartTotal)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold">
              Open
              <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
