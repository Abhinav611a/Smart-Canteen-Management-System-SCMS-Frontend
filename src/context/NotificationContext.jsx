import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { ...state, notifications: [action.notification, ...state.notifications].slice(0, 50) }
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      }
    case 'MARK_ALL_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) }
    case 'REMOVE':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) }
    case 'CLEAR':
      return { ...state, notifications: [] }
    default:
      return state
  }
}

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'order',   title: 'New Order Received',    message: 'ORD-003 is waiting for your confirmation', read: false, time: new Date(Date.now() - 60000).toISOString(),   icon: '🎫' },
  { id: 3, type: 'status',  title: 'Order Ready',           message: 'Your order ORD-002 is ready for pickup!',  read: true,  time: new Date(Date.now() - 900000).toISOString(),  icon: '✅' },
  { id: 4, type: 'system',  title: 'Welcome to CanteenDAO', message: 'Your account is set up and ready to use.', read: true,  time: new Date(Date.now() - 3600000).toISOString(), icon: '🍽' },
]

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [state, dispatch] = useReducer(reducer, { notifications: INITIAL_NOTIFICATIONS })

  const unreadCount = state.notifications.filter(n => !n.read).length

  const addNotification = useCallback((notification) => {
    dispatch({
      type: 'ADD',
      notification: {
        id: Date.now(),
        read: false,
        time: new Date().toISOString(),
        ...notification,
      },
    })
  }, [])

  const markRead    = useCallback((id)  => dispatch({ type: 'MARK_READ',     id }), [])
  const markAllRead = useCallback(()    => dispatch({ type: 'MARK_ALL_READ'       }), [])
  const remove      = useCallback((id)  => dispatch({ type: 'REMOVE',         id }), [])
  const clear       = useCallback(()    => dispatch({ type: 'CLEAR'               }), [])

  // Simulate incoming notifications in dev mode
  useEffect(() => {
    if (!isAuthenticated || !import.meta.env.DEV) return
    const timer = setInterval(() => {
      const samples = [
        { type: 'order',   title: 'New Order!',          message: `ORD-${Math.floor(Math.random()*9000+1000)} just came in`, icon: '🎫' },
        { type: 'status',  title: 'Order Status Updated', message: 'An order moved to READY',                               icon: '✅' },
      ]
      const sample = samples[Math.floor(Math.random() * samples.length)]
      addNotification(sample)
    }, 45000) // every 45s in dev
    return () => clearInterval(timer)
  }, [isAuthenticated, addNotification])

  return (
    <NotificationContext.Provider value={{
      notifications: state.notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      remove,
      clear,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be within NotificationProvider')
  return ctx
}
