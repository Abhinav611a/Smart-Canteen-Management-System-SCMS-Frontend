import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useCart } from '@/context/CartContext'
import { useMenu } from '@/hooks/useMenu'
import { formatCurrency } from '@/utils/helpers'
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
  MENU_CATEGORY_EMOJIS,
} from '@/utils/constants'
import Button from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentMenu() {
  const { addItem, removeItem, items: cartItems } = useCart()
  const { menu, loading, error } = useMenu()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    return menu.filter((item) => {
      const matchesCat = category === 'All' || item.category === category
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(search.toLowerCase())

      return matchesCat && matchesSearch
    })
  }, [menu, search, category])

  const cartQty = (id) => cartItems.find((i) => i.id === id)?.qty || 0

  const handleAdd = (item) => {
    if (!item.available) {
      toast.error('This item is currently unavailable.')
      return
    }

    addItem(item)
    toast.success(`${item.emoji} ${item.name} added to cart!`)
  }

  const handleDecrease = (item) => {
    const qty = cartQty(item.id)

    if (qty <= 0) return

    removeItem(item.id)

    if (qty === 1) {
      toast(`${item.emoji} ${item.name} removed from cart`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Today&apos;s Menu 🍽</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {loading
              ? 'Loading…'
              : `${menu.filter((i) => i.available).length} items available`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            className="input-field pl-10"
            placeholder="Search by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {MENU_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-brand-500 text-white shadow-glow'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-400'
              }`}
            >
              {cat !== 'All' && MENU_CATEGORY_EMOJIS[cat]}{' '}
              {MENU_CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 text-center text-sm text-red-500 border border-red-200 dark:border-red-900">
          ⚠️ Failed to load menu: {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400">
            No items match your search.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setCategory('All')
            }}
            className="text-brand-500 text-sm mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 flex flex-col gap-3 group hover:shadow-glow transition-all duration-300 ${
                  !item.available ? 'opacity-60' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-full h-28 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                    {item.emoji}
                  </div>

                  {!item.available && (
                    <div className="absolute inset-0 rounded-xl bg-gray-900/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-gray-900/80 px-3 py-1 rounded-full">
                        Unavailable
                      </span>
                    </div>
                  )}

                  <span className="absolute top-2 left-2 badge badge-gray text-[10px]">
                    {MENU_CATEGORY_EMOJIS[item.category]}{' '}
                    {MENU_CATEGORY_LABELS[item.category] ?? item.category}
                  </span>

                  {item.ordersToday > 30 && (
                    <span className="absolute top-2 right-2 badge badge-green text-[10px]">
                      🔥 Popular
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-brand-600 dark:text-brand-400 font-bold text-sm shrink-0">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-amber-500 font-medium">
                      ⭐ {item.rating}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.ordersToday} ordered today
                    </span>
                  </div>
                </div>

                {cartQty(item.id) > 0 ? (
                  <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-xl px-3 py-2 gap-2">
                    <button
                      onClick={() => handleDecrease(item)}
                      className="text-brand-600 dark:text-brand-400 font-bold text-xl leading-none hover:scale-125 transition-transform"
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>

                    <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">
                      In cart: {cartQty(item.id)}
                    </span>

                    <button
                      onClick={() => handleAdd(item)}
                      className="text-brand-600 dark:text-brand-400 font-bold text-xl leading-none hover:scale-125 transition-transform"
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    disabled={!item.available}
                    onClick={() => handleAdd(item)}
                    icon="🛒"
                  >
                    Add to Cart
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}