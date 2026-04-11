import { Client } from '@stomp/stompjs'
import { BACKEND_URL, ENDPOINTS } from '@/utils/constants'
import { normaliseOrder } from './orders'

let client = null
let connected = false
let connectionAttempted = false
let connectionInProgress = false
let subscription = null
let activeUser = null

const subscribers = new Set()

function sanitizeRole(role) {
  return String(role || '').trim().toUpperCase()
}

// ✅ NEW: role-based destination
function getDestination(user) {
  const role = sanitizeRole(user?.role)

  if (role === 'USER') {
    return '/user/queue/orders'
  }

  if (role === 'ADMIN' || role === 'MANAGER' || role === 'KITCHEN') {
    return ENDPOINTS.WS_TOPIC_ORDERS
  }

  return null
}

async function createSockJSFactory() {
  if (typeof globalThis.global === 'undefined') {
    globalThis.global = globalThis
  }

  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: {} }
  } else if (!globalThis.process.env) {
    globalThis.process.env = {}
  }

  const module = await import('sockjs-client/dist/sockjs')
  const SockJS = module.default ?? module
  const wsUrl = `${BACKEND_URL}${ENDPOINTS.WS_ENDPOINT}`

  console.log('[WS] Using endpoint:', wsUrl)

  return () => new SockJS(wsUrl)
}

// ✅ UPDATED: now takes user
async function buildClient(token, user) {
  const webSocketFactory = await createSockJSFactory()

  const stompClient = new Client({
    webSocketFactory,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

    reconnectDelay: 0,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,

    onConnect: () => {
      console.log('[WS] STOMP CONNECTED', { role: user?.role })

      connected = true
      connectionAttempted = true
      connectionInProgress = false

      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch {
          console.warn('[WS] Failed to clean previous subscription')
        }
        subscription = null
      }

      const destination = getDestination(user)

      if (!destination) {
        console.warn('[WS] No destination for role:', user?.role)
        return
      }

      console.log('[WS] Subscribing to:', destination)

      subscription = stompClient.subscribe(destination, (message) => {
        console.log('🔥 RECEIVED:', message.body)

        try {
          const raw = JSON.parse(message.body)
          const order = normaliseOrder(raw)

          subscribers.forEach((callback) => {
            try {
              callback(order)
            } catch (error) {
              console.warn('[WS] Subscriber error:', error)
            }
          })
        } catch {
          console.log('[WS] Non-JSON message:', message.body)
        }
      })

      console.log('[WS] Subscribed to:', destination)
    },

    onDisconnect: () => {
      console.log('[WS] STOMP DISCONNECTED')
      connected = false
      connectionInProgress = false
      subscription = null
    },

    onStompError: (frame) => {
      console.warn('[WS] STOMP ERROR:', frame?.headers?.message ?? frame)
      connected = false
      connectionInProgress = false
    },

    onWebSocketError: (event) => {
      console.warn('[WS] WebSocket error — real-time updates unavailable', event)
      connected = false
      connectionInProgress = false
    },

    onWebSocketClose: (event) => {
      console.warn('[WS] WebSocket closed:', event)
      connected = false
      connectionInProgress = false
    },
  })

  stompClient.debug = (str) => {
    console.log('[STOMP]', str)
  }

  return stompClient
}

export const websocketService = {
  // ✅ UPDATED: now accepts user
  async connect(token, user) {
    if (!token || !user) {
      console.log('[WS] Skipping connect: missing token/user')
      return
    }

    if (connected) {
      console.log('[WS] Already connected — skipping')
      return
    }

    if (client?.active) {
      console.log('[WS] Client already active — skipping')
      return
    }

    if (connectionInProgress) {
      console.log('[WS] Connection already in progress — skipping')
      return
    }

    connectionAttempted = true
    connectionInProgress = true
    activeUser = user

    try {
      client = await buildClient(token, user)
      console.log('[WS] Activating client...')
      client.activate()
    } catch (error) {
      console.warn('[WS] Failed to connect:', error?.message || error)
      client = null
      connected = false
      connectionInProgress = false
    }
  },

  disconnect() {
    console.log('[WS] Disconnect requested')

    if (subscription) {
      try {
        subscription.unsubscribe()
      } catch {
        console.warn('[WS] Failed to unsubscribe cleanly')
      }
      subscription = null
    }

    if (client) {
      try {
        client.deactivate()
      } catch {
        console.warn('[WS] Failed to deactivate cleanly')
      }
      client = null
    }

    connected = false
    connectionAttempted = false
    connectionInProgress = false
    activeUser = null
    subscribers.clear()
  },

  subscribeToOrders(callback) {
    subscribers.add(callback)
    console.log('[WS] Subscriber added. Count:', subscribers.size)

    return () => {
      subscribers.delete(callback)
      console.log('[WS] Subscriber removed. Count:', subscribers.size)
    }
  },

  get isConnected() {
    return connected
  },

  get hasAttemptedConnection() {
    return connectionAttempted
  },
}