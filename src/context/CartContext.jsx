/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import toast from 'react-hot-toast'
import { LS_KEYS } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'
import { useCanteen } from '@/context/CanteenContext'
import { cartService } from '@/services/cartService'
import {
  getCartMutationId,
  getCartItemIdentity,
  normaliseCartItem,
  normaliseCartItems,
} from '@/utils/cart'

const CartContext = createContext(null)

const initialState = {
  items: [],
  loading: false,
  syncing: false,
  dirty: false,
  outOfSync: false,
}
const EMPTY_CART = { id: null, items: [], total: 0, count: 0, amount: 0 }

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, ...action.value }

    case 'HYDRATE':
    case 'SET_CART':
      return { ...state, items: action.items ?? [] }

    case 'ADD_LOCAL': {
      const nextItem = normaliseCartItem({
        ...action.item,
        quantity: 1,
        qty: 1,
      })
      const nextItemId = getCartItemIdentity(nextItem)
      const exists = state.items.find(
        (item) => getCartItemIdentity(item) === nextItemId,
      )

      if (exists) {
        const nextQty = (exists.qty || exists.quantity || 0) + 1
        return {
          ...state,
          items: state.items.map((item) =>
            getCartItemIdentity(item) === nextItemId
              ? { ...item, ...nextItem, qty: nextQty, quantity: nextQty }
              : item,
          ),
        }
      }

      return {
        ...state,
        items: [...state.items, nextItem],
      }
    }

    case 'UPDATE_LOCAL':
      return {
        ...state,
        items:
          action.qty <= 0
            ? state.items.filter(
                (item) => getCartItemIdentity(item) !== String(action.id),
              )
            : state.items.map((item) =>
                getCartItemIdentity(item) === String(action.id)
                  ? { ...item, qty: action.qty, quantity: action.qty }
                  : item,
              ),
      }

    case 'CLEAR_CART':
      return { ...state, items: [] }

    default:
      return state
  }
}

function buildCartSummary(items = []) {
  const safeItems = normaliseCartItems(items)
  const total = safeItems.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (item.qty || item.quantity || 0),
    0,
  )

  return {
    id: null,
    items: safeItems,
    total,
    count: safeItems.reduce(
      (sum, item) => sum + (item.qty || item.quantity || 0),
      0,
    ),
    amount: total,
  }
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const {
    loading: canteenLoading,
    isOrderingAllowed,
    orderBlockedMessage,
  } = useCanteen()
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const role = String(user?.role || '').trim().toUpperCase()
  const isCartRole = role === 'USER'

  const itemsRef = useRef(state.items)
  const hydratedRef = useRef(false)
  const fetchCountRef = useRef(0)
  const mutationCountRef = useRef(0)
  const removedCartItemIdsRef = useRef(new Set())

  useEffect(() => {
    itemsRef.current = state.items
  }, [state.items])

  const persistLocalCart = useCallback((items) => {
    localStorage.setItem(LS_KEYS.CART, JSON.stringify(items))
  }, [])

  const clearPersistedLocalCart = useCallback(() => {
    localStorage.removeItem(LS_KEYS.CART)
  }, [])

  const rememberRemovedCartItems = useCallback((cartItemIds = []) => {
    cartItemIds.forEach((id) => {
      const parsed = Number(id)
      if (Number.isFinite(parsed) && parsed > 0) {
        removedCartItemIdsRef.current.add(parsed)
      }
    })
  }, [])

  const clearCartState = useCallback((removedCartItemIds = []) => {
    rememberRemovedCartItems(removedCartItemIds)
    dispatch({ type: 'CLEAR_CART' })
    dispatch({
      type: 'SET_STATUS',
      value: { outOfSync: false },
    })
    clearPersistedLocalCart()
    return EMPTY_CART
  }, [clearPersistedLocalCart, rememberRemovedCartItems])

  const syncActivityFlags = useCallback(() => {
    dispatch({
      type: 'SET_STATUS',
      value: {
        loading: fetchCountRef.current > 0,
        syncing: fetchCountRef.current > 0 || mutationCountRef.current > 0,
        dirty: mutationCountRef.current > 0,
      },
    })
  }, [])

  const beginFetch = useCallback(() => {
    fetchCountRef.current += 1
    syncActivityFlags()
  }, [syncActivityFlags])

  const endFetch = useCallback(() => {
    fetchCountRef.current = Math.max(0, fetchCountRef.current - 1)
    syncActivityFlags()
  }, [syncActivityFlags])

  const beginMutation = useCallback(() => {
    mutationCountRef.current += 1
    syncActivityFlags()
  }, [syncActivityFlags])

  const endMutation = useCallback(() => {
    mutationCountRef.current = Math.max(0, mutationCountRef.current - 1)
    syncActivityFlags()
  }, [syncActivityFlags])

  const applyCart = useCallback(
    (cart, { outOfSync = false } = {}) => {
      rememberRemovedCartItems(cart?.removedCartItemIds ?? [])

      const normalizedItems = normaliseCartItems(cart?.items ?? [], {
        previousItems: itemsRef.current,
      })
      const backendCartItemIds = new Set(
        normalizedItems
          .map((item) => Number(getCartMutationId(item)))
          .filter((id) => Number.isFinite(id) && id > 0),
      )
      const staleDeletedCartItemIds = []

      removedCartItemIdsRef.current.forEach((id) => {
        if (backendCartItemIds.has(id)) {
          staleDeletedCartItemIds.push(id)
        } else {
          removedCartItemIdsRef.current.delete(id)
        }
      })

      if (staleDeletedCartItemIds.length > 0) {
        console.warn('[CartContext] ignoring stale deleted cart item(s) from GET /cart', {
          staleDeletedCartItemIds,
        })
      }

      const nextItems = staleDeletedCartItemIds.length
        ? normalizedItems.filter(
            (item) => !removedCartItemIdsRef.current.has(Number(getCartMutationId(item))),
          )
        : normalizedItems
      const total = nextItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (item.qty || item.quantity || 0),
        0,
      )
      const nextCart = {
        ...(cart ?? {}),
        items: nextItems,
        total,
        count: nextItems.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0),
        staleDeletedCartItemIds,
      }

      dispatch({ type: 'SET_CART', items: nextItems })
      dispatch({
        type: 'SET_STATUS',
        value: { outOfSync: outOfSync || staleDeletedCartItemIds.length > 0 },
      })
      persistLocalCart(nextItems)
      return nextCart
    },
    [persistLocalCart, rememberRemovedCartItems],
  )

  const syncFromBackend = useCallback(
    async ({ apply = true, silent = false } = {}) => {
      if (!cartService.isBackendEnabled() || !isCartRole) {
        const fallbackCart = buildCartSummary(itemsRef.current)

        if (apply) {
          dispatch({
            type: 'SET_STATUS',
            value: { outOfSync: false },
          })
        }

        return fallbackCart
      }

      beginFetch()

      try {
        const cart = await cartService.getCart()
        return apply ? applyCart(cart) : cart
      } catch (error) {
        console.warn('Failed to load backend cart:', error.message)

        const message = error?.message?.toLowerCase?.() || ''
        const status = error?.response?.status

        const isCartMissing =
          message.includes('cart not found') ||
          message.includes('404') ||
          status === 404

        const isBackend500 = status === 500

        if (isCartMissing || isBackend500) {
          const emptyCart = { id: null, items: [], total: 0, count: 0, amount: 0 }
          return apply ? applyCart(emptyCart) : emptyCart
        }

        if (apply) {
          dispatch({
            type: 'SET_STATUS',
            value: { outOfSync: true },
          })
        }

        if (!silent) {
          toast.error(error.message || 'Failed to load cart.')
        }

        throw error
      } finally {
        endFetch()
      }
    },
    [applyCart, beginFetch, endFetch, isCartRole],
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS.CART)
      if (saved) {
        dispatch({
          type: 'HYDRATE',
          items: normaliseCartItems(JSON.parse(saved)),
        })
      }
    } catch {
      clearPersistedLocalCart()
    } finally {
      hydratedRef.current = true
    }
  }, [clearPersistedLocalCart])

  useEffect(() => {
    if (!hydratedRef.current) return
    persistLocalCart(state.items)
  }, [state.items, persistLocalCart])

  useEffect(() => {
    if (!hydratedRef.current) return

    if (isAuthenticated && isCartRole) {
      syncFromBackend({ silent: true }).catch(() => null)
    } else {
      clearCartState()
    }
  }, [clearCartState, isAuthenticated, isCartRole, syncFromBackend])

  const runCartMutation = useCallback(
    async (operation, fallbackOperation, failureMessage) => {
      if (!cartService.isBackendEnabled() || !isCartRole) {
        const result = fallbackOperation?.()
        const nextItems = itemsRef.current

        dispatch({
          type: 'SET_STATUS',
          value: { outOfSync: false },
        })
        persistLocalCart(nextItems)
        return result ?? buildCartSummary(nextItems)
      }

      if (mutationCountRef.current > 0 || fetchCountRef.current > 0) {
        return null
      }

      beginMutation()

      try {
        const updatedCart = await operation()
        return applyCart(updatedCart)
      } catch (error) {
        if (error?.latestCart) {
          applyCart(error.latestCart, { outOfSync: true })
        } else {
          dispatch({
            type: 'SET_STATUS',
            value: { outOfSync: true },
          })
        }

        toast.error(error.message || failureMessage)
        throw error
      } finally {
        endMutation()
      }
    },
    [applyCart, beginMutation, endMutation, isCartRole, persistLocalCart],
  )

  const addItem = useCallback(
    async (item) => {
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

      return runCartMutation(
        () => cartService.addItem(item, 1),
        () => dispatch({ type: 'ADD_LOCAL', item }),
        'Failed to add item to cart.',
      )
    },
    [
      canteenLoading,
      isOrderingAllowed,
      orderBlockedMessage,
      runCartMutation,
    ],
  )

  const removeItem = useCallback(
    async (id) => {
      const current = itemsRef.current.find(
        (item) => getCartItemIdentity(item) === String(id),
      )
      const currentQty = current?.qty || current?.quantity || 0

      if (currentQty <= 0) return

      const nextQty = currentQty - 1

      return runCartMutation(
        () =>
          nextQty <= 0
            ? cartService.removeItem(current)
            : cartService.updateItem(current, nextQty),
        () => dispatch({ type: 'UPDATE_LOCAL', id, qty: nextQty }),
        'Failed to remove item from cart.',
      )
    },
    [runCartMutation],
  )

  const updateQty = useCallback(
    async (id, qty) => {
      const current = itemsRef.current.find(
        (item) => getCartItemIdentity(item) === String(id),
      )
      if (!current) return

      const currentQty = current?.qty || current?.quantity || 0
      const isIncrease = qty > currentQty

      if (isIncrease && canteenLoading) {
        toast.error('Checking canteen status. Please wait a moment.')
        return
      }

      if (isIncrease && !isOrderingAllowed) {
        toast.error(
          orderBlockedMessage || 'Canteen is not accepting new orders right now.',
        )
        return
      }

      return runCartMutation(
        () =>
          qty <= 0
            ? cartService.removeItem(current)
            : cartService.updateItem(current, qty),
        () => dispatch({ type: 'UPDATE_LOCAL', id, qty }),
        'Failed to update cart.',
      )
    },
    [
      canteenLoading,
      isOrderingAllowed,
      orderBlockedMessage,
      runCartMutation,
    ],
  )

  const clearCart = useCallback(
    async ({ refetch = true, silent = false } = {}) => {
      const clearLocalOnly = refetch === false

      if (
        !clearLocalOnly &&
        (mutationCountRef.current > 0 || fetchCountRef.current > 0)
      ) {
        return null
      }

      const currentItems = normaliseCartItems(itemsRef.current)
      const currentCartItemIds = currentItems
        .map((item) => getCartMutationId(item))
        .filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)

      if (!currentItems.length) {
        return clearCartState()
      }

      if (clearLocalOnly) {
        clearCartState(currentCartItemIds)
        return EMPTY_CART
      }

      if (!cartService.isBackendEnabled() || !isCartRole) {
        clearCartState(currentCartItemIds)
        return EMPTY_CART
      }

      const previousCart = buildCartSummary(currentItems)

      clearCartState(currentCartItemIds)
      beginMutation()

      try {
        const updatedCart = await cartService.clearCart(currentItems, { refetch })
        return applyCart(updatedCart)
      } catch (error) {
        if (error?.latestCart) {
          applyCart(error.latestCart, { outOfSync: true })
        } else {
          applyCart(previousCart, { outOfSync: true })
        }

        if (!silent) {
          toast.error(error.message || 'Failed to clear cart.')
        }

        throw error
      } finally {
        endMutation()
      }
    },
    [applyCart, beginMutation, clearCartState, endMutation, isCartRole],
  )

  const total = state.items.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (item.qty || item.quantity || 0),
    0,
  )

  const count = state.items.reduce(
    (sum, item) => sum + (item.qty || item.quantity || 0),
    0,
  )

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total,
        count,
        loading: state.loading,
        syncing: state.syncing,
        dirty: state.dirty,
        outOfSync: state.outOfSync,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        refreshCart: syncFromBackend,
        replaceCartFromServer: applyCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
