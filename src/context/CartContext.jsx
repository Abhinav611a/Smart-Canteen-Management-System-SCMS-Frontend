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

const CartContext = createContext(null)

const initialState = {
  items: [],
  loading: false,
  syncing: false,
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.value }

    case 'SET_SYNCING':
      return { ...state, syncing: action.value }

    case 'HYDRATE':
    case 'SET_CART':
      return { ...state, items: action.items ?? [] }

    case 'ADD_LOCAL': {
      const exists = state.items.find((item) => item.id === action.item.id)

      if (exists) {
        const nextQty = (exists.qty || exists.quantity || 0) + 1
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.item.id
              ? { ...item, qty: nextQty, quantity: nextQty }
              : item
          ),
        }
      }

      return {
        ...state,
        items: [...state.items, { ...action.item, qty: 1, quantity: 1 }],
      }
    }

    case 'REMOVE_LOCAL':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      }

    case 'UPDATE_LOCAL':
      return {
        ...state,
        items:
          action.qty <= 0
            ? state.items.filter((item) => item.id !== action.id)
            : state.items.map((item) =>
                item.id === action.id
                  ? { ...item, qty: action.qty, quantity: action.qty }
                  : item
              ),
      }

    case 'CLEAR':
      return { ...state, items: [] }

    default:
      return state
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

  useEffect(() => {
    itemsRef.current = state.items
  }, [state.items])

  const persistLocalCart = useCallback((items) => {
    localStorage.setItem(LS_KEYS.CART, JSON.stringify(items))
  }, [])

  const syncFromBackend = useCallback(async () => {
    if (!cartService.isBackendEnabled() || !isCartRole) return

    dispatch({ type: 'SET_LOADING', value: true })

    try {
      const cart = await cartService.getCart()
      const backendItems = cart?.items ?? []

      // Always sync local state to backend state - backend is source of truth
      dispatch({ type: 'SET_CART', items: backendItems })
      persistLocalCart(backendItems)
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
        // Backend says cart is empty - clear all local state
        dispatch({ type: 'SET_CART', items: [] })
        persistLocalCart([])
        return
      }

      toast.error(error.message || 'Failed to load cart.')
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [isCartRole, persistLocalCart])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS.CART)
      if (saved) {
        dispatch({ type: 'HYDRATE', items: JSON.parse(saved) })
      }
    } catch {
      localStorage.removeItem(LS_KEYS.CART)
    } finally {
      hydratedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    persistLocalCart(state.items)
  }, [state.items, persistLocalCart])

  useEffect(() => {
    if (!hydratedRef.current) return

    if (isAuthenticated && isCartRole) {
      syncFromBackend()
    } else {
      dispatch({ type: 'CLEAR' })
      localStorage.removeItem(LS_KEYS.CART)
    }
  }, [isAuthenticated, isCartRole, syncFromBackend])

  const addItem = useCallback(
    async (item) => {
      if (canteenLoading) {
        toast.error('Checking canteen status. Please wait a moment.')
        return
      }

      if (!isOrderingAllowed) {
        toast.error(orderBlockedMessage || 'Canteen is not accepting new orders right now.')
        return
      }

      if (!cartService.isBackendEnabled() || !isCartRole) {
        dispatch({ type: 'ADD_LOCAL', item })
        return
      }

      dispatch({ type: 'SET_SYNCING', value: true })

      try {
        // Add item to backend
        await cartService.addItem(item, 1)
        // Refetch cart from backend after mutation to ensure state is in sync
        const updatedCart = await cartService.getCart()
        dispatch({ type: 'SET_CART', items: updatedCart?.items ?? [] })
      } catch (error) {
        toast.error(error.message || 'Failed to add item to cart.')
        throw error
      } finally {
        dispatch({ type: 'SET_SYNCING', value: false })
      }
    },
    [canteenLoading, isCartRole, isOrderingAllowed, orderBlockedMessage]
  )

  const removeItem = useCallback(
    async (id) => {
      const current = itemsRef.current.find((item) => item.id === id)
      const currentQty = current?.qty || current?.quantity || 0

      if (currentQty <= 0) return

      if (
        !cartService.isBackendEnabled() ||
        !isCartRole ||
        !current?.cartItemId
      ) {
        const newQty = currentQty - 1
        dispatch({ type: 'UPDATE_LOCAL', id, qty: newQty })
        return
      }

      dispatch({ type: 'SET_SYNCING', value: true })

      try {
        const newQty = currentQty - 1

        // Make backend request and always refetch to ensure frontend matches backend
        if (newQty <= 0) {
          await cartService.removeItem(current)
        } else {
          await cartService.updateItem(current, newQty)
        }

        // Refetch cart from backend after mutation to ensure state is in sync
        const updatedCart = await cartService.getCart()
        dispatch({ type: 'SET_CART', items: updatedCart?.items ?? [] })
      } catch (error) {
        toast.error(error.message || 'Failed to remove item from cart.')
        throw error
      } finally {
        dispatch({ type: 'SET_SYNCING', value: false })
      }
    },
    [isCartRole]
  )

  const updateQty = useCallback(
    async (id, qty) => {
      const current = itemsRef.current.find((item) => item.id === id)
      if (!current) return

      const currentQty = current?.qty || current?.quantity || 0
      const isIncrease = qty > currentQty

      if (isIncrease && canteenLoading) {
        toast.error('Checking canteen status. Please wait a moment.')
        return
      }

      if (isIncrease && !isOrderingAllowed) {
        toast.error(orderBlockedMessage || 'Canteen is not accepting new orders right now.')
        return
      }

      if (
        !cartService.isBackendEnabled() ||
        !isCartRole ||
        !current?.cartItemId
      ) {
        dispatch({ type: 'UPDATE_LOCAL', id, qty })
        return
      }

      dispatch({ type: 'SET_SYNCING', value: true })

      try {
        // Make backend request
        if (qty <= 0) {
          await cartService.removeItem(current)
        } else {
          await cartService.updateItem(current, qty)
        }

        // Refetch cart from backend after mutation to ensure state is in sync
        const updatedCart = await cartService.getCart()
        dispatch({ type: 'SET_CART', items: updatedCart?.items ?? [] })
      } catch (error) {
        toast.error(error.message || 'Failed to update cart.')
        throw error
      } finally {
        dispatch({ type: 'SET_SYNCING', value: false })
      }
    },
    [canteenLoading, isCartRole, isOrderingAllowed, orderBlockedMessage]
  )

  const clearCart = useCallback(async () => {
    dispatch({ type: 'CLEAR' })
    localStorage.removeItem(LS_KEYS.CART)
  }, [])

  const total = state.items.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (item.qty || item.quantity || 0),
    0
  )

  const count = state.items.reduce(
    (sum, item) => sum + (item.qty || item.quantity || 0),
    0
  )

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total,
        count,
        loading: state.loading,
        syncing: state.syncing,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        refreshCart: syncFromBackend,
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
