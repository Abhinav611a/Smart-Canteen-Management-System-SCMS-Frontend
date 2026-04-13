import { Client } from '@stomp/stompjs'
import { BACKEND_URL, ENDPOINTS } from '@/utils/constants'
import { normaliseOrder } from './orders'

let client = null
let connected = false
let connectionAttempted = false
let connectionInProgress = false
let activeToken = null
let activeUser = null

const topicSubscriptions = new Map()
const eventListeners = new Map()

function sanitizeRole(role) {
  return String(role || '').trim().toUpperCase()
}

function parseOrderMessage(message) {
  try {
    const raw = JSON.parse(message.body)
    return normaliseOrder(raw)
  } catch (error) {
    console.warn('[WS] Failed to parse order payload:', message.body, error)
    return null
  }
}

function emit(eventName, payload) {
  const handlers = eventListeners.get(eventName)
  if (!handlers) return

  handlers.forEach((handler) => {
    try {
      handler(payload)
    } catch (error) {
      console.warn(`[WS] Listener error for ${eventName}:`, error)
    }
  })
}

function addEventListener(eventName, callback) {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set())
  }

  eventListeners.get(eventName).add(callback)

  return () => {
    const handlers = eventListeners.get(eventName)
    if (!handlers) return

    handlers.delete(callback)

    if (handlers.size === 0) {
      eventListeners.delete(eventName)
    }
  }
}

function getRoleTopics(user) {
  const role = sanitizeRole(user?.role)
  const userId = user?.id
  const topics = []

  if (role === 'ADMIN') {
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_ADMIN_ORDERS,
      eventName: 'admin:orders',
    })
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_ADMIN_ORDERS,
      eventName: 'orders:update',
    })
  }

  if (role === 'MANAGER') {
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_ADMIN_ORDERS,
      eventName: 'manager:orders',
    })
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_ADMIN_ORDERS,
      eventName: 'orders:update',
    })
  }

  if (role === 'KITCHEN') {
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_KITCHEN_ORDERS,
      eventName: 'kitchen:orders',
    })
    topics.push({
      topic: ENDPOINTS.WS_TOPIC_KITCHEN_ORDERS,
      eventName: 'orders:update',
    })
  }

  if (userId) {
    const userTopic = `${ENDPOINTS.WS_TOPIC_USER_PREFIX}/${userId}`

    topics.push({
      topic: userTopic,
      eventName: 'user:orders',
    })
    topics.push({
      topic: userTopic,
      eventName: 'orders:update',
    })
  }

  return topics
}

function clearSubscriptions() {
  topicSubscriptions.forEach((entry, topicKey) => {
    try {
      entry.subscription.unsubscribe()
      console.log('[WS] Unsubscribed from:', topicKey)
    } catch (error) {
      console.warn('[WS] Failed to unsubscribe from:', topicKey, error)
    }
  })

  topicSubscriptions.clear()
}

function subscribeToTopic(topic, eventName) {
  if (!client || !connected || !topic || !eventName) return

  const key = `${topic}__${eventName}`

  if (topicSubscriptions.has(key)) return

  console.log('[WS] Subscribing to:', topic, 'as', eventName)

  const subscription = client.subscribe(topic, (message) => {
    console.log('[WS] Message received from:', topic, message.body)

    const order = parseOrderMessage(message)
    if (!order) return

    emit(eventName, order)
  })

  topicSubscriptions.set(key, {
    topic,
    eventName,
    subscription,
  })
}

function applyRoleSubscriptions(user) {
  const topics = getRoleTopics(user)

  if (!topics.length) {
    console.warn('[WS] No websocket topics found for role:', user?.role)
    return
  }

  topics.forEach(({ topic, eventName }) => {
    subscribeToTopic(topic, eventName)
  })
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

async function buildClient(token) {
  const webSocketFactory = await createSockJSFactory()

  const stompClient = new Client({
    webSocketFactory,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log('[WS] STOMP CONNECTED', {
        role: activeUser?.role,
        userId: activeUser?.id,
      })

      connected = true
      connectionAttempted = true
      connectionInProgress = false

      clearSubscriptions()
      applyRoleSubscriptions(activeUser)
      emit('connection:change', true)
    },

    onDisconnect: () => {
      console.log('[WS] STOMP DISCONNECTED')
      connected = false
      connectionInProgress = false
      emit('connection:change', false)
    },

    onStompError: (frame) => {
      console.warn('[WS] STOMP ERROR:', frame?.headers?.message ?? frame)
      console.warn('[WS] STOMP ERROR DETAILS:', frame?.body)
      connected = false
      connectionInProgress = false
      emit('connection:change', false)
    },

    onWebSocketError: (event) => {
      console.warn('[WS] WebSocket error:', event)
      connected = false
      connectionInProgress = false
      emit('connection:change', false)
    },

    onWebSocketClose: () => {
      console.warn('[WS] WebSocket closed')
      connected = false
      connectionInProgress = false
      emit('connection:change', false)
    },
  })

  stompClient.debug = (str) => {
    console.log('[STOMP]', str)
  }

  return stompClient
}

export const websocketService = {
  async connect(token, user) {
    if (!token || !user) {
      console.log('[WS] Skipping connect: missing token or user')
      return
    }

    const sameUser =
      activeToken === token &&
      String(activeUser?.id || '') === String(user?.id || '')

    if (connected && sameUser) {
      console.log('[WS] Already connected for same user')
      return
    }

    if (client?.active && sameUser) {
      console.log('[WS] Client already active for same user')
      return
    }

    if (connectionInProgress) {
      console.log('[WS] Connection already in progress')
      return
    }

    if (client) {
      this.disconnect()
    }

    connectionAttempted = true
    connectionInProgress = true
    activeToken = token
    activeUser = user

    try {
      client = await buildClient(token)
      console.log('[WS] Activating client...')
      client.activate()
    } catch (error) {
      console.warn('[WS] Failed to connect:', error?.message || error)
      client = null
      connected = false
      connectionInProgress = false
      activeToken = null
      activeUser = null
      emit('connection:change', false)
    }
  },

  disconnect() {
    console.log('[WS] Disconnect requested')

    clearSubscriptions()

    if (client) {
      try {
        client.deactivate()
      } catch (error) {
        console.warn('[WS] Failed to deactivate cleanly', error)
      }
      client = null
    }

    connected = false
    connectionAttempted = false
    connectionInProgress = false
    activeToken = null
    activeUser = null

    emit('connection:change', false)
  },

  subscribe(eventName, callback) {
    return addEventListener(eventName, callback)
  },

  get isConnected() {
    return connected
  },

  get hasAttemptedConnection() {
    return connectionAttempted
  },
}