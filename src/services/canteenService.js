import api from './api'
import { ENDPOINTS } from '@/utils/constants'

export const CANTEEN_STATUS = {
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
}

const CANTEEN_STATE_KEYS = [
  'status',
  'closingSoonUntil',
  'kitchenReady',
  'managerReady',
]

const CANTEEN_TIMESTAMP_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?([zZ]|[+-]\d{2}:\d{2})?$/

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isCanteenStateLike(value) {
  return (
    isRecord(value) &&
    CANTEEN_STATE_KEYS.some((key) =>
      Object.prototype.hasOwnProperty.call(value, key)
    )
  )
}

export function extractCanteenPayload(raw) {
  if (!isRecord(raw)) return {}
  if (isCanteenStateLike(raw)) return raw

  const nestedData = raw.data
  if (isCanteenStateLike(nestedData)) {
    return nestedData
  }

  if (isRecord(nestedData?.data)) {
    return extractCanteenPayload(nestedData.data)
  }

  return raw
}

function getOrderingCopy(status) {
  switch (status) {
    case CANTEEN_STATUS.OPEN:
      return {
        statusLabel: 'Open',
        orderBlockedMessage: '',
        orderActionLabel: 'Add to Cart',
        checkoutActionLabel: 'Place Order',
        orderNoticeTitle: '',
        orderNoticeDescription: '',
      }

    case CANTEEN_STATUS.OPENING:
      return {
        statusLabel: 'Opening Soon',
        orderBlockedMessage:
          'Canteen is opening soon. Please wait for service to begin.',
        orderActionLabel: 'Opening Soon',
        checkoutActionLabel: 'Opening Soon',
        orderNoticeTitle: 'Opening soon',
        orderNoticeDescription:
          'Browse the menu while the team prepares service.',
      }

    case CANTEEN_STATUS.CLOSING:
      return {
        statusLabel: 'Closing',
        orderBlockedMessage:
          'Not accepting new orders. Completing existing orders...',
        orderActionLabel: 'Not Accepting New Orders',
        checkoutActionLabel: 'Not Accepting New Orders',
        orderNoticeTitle: 'Not accepting new orders',
        orderNoticeDescription: 'Completing existing orders...',
      }

    case CANTEEN_STATUS.CLOSED:
    default:
      return {
        statusLabel: 'Closed',
        orderBlockedMessage: 'Canteen is closed.',
        orderActionLabel: 'Canteen Closed',
        checkoutActionLabel: 'Canteen Closed',
        orderNoticeTitle: 'Canteen is closed',
        orderNoticeDescription:
          'Browse the menu and come back when service resumes.',
      }
  }
}

export function parseCanteenTimestamp(value) {
  if (value == null) return null

  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isNaN(timestamp) ? null : timestamp
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const rawValue = String(value).trim()
  if (!rawValue) return null

  const match = rawValue.match(CANTEEN_TIMESTAMP_RE)
  if (!match) return null

  const [, base, fraction = '', timezone = ''] = match
  const millisecondsValue = Number(fraction.slice(0, 3).padEnd(3, '0') || '0')

  if (timezone) {
    const millisecondsText = fraction
      ? `.${fraction.slice(0, 3).padEnd(3, '0')}`
      : ''
    const normalizedValue = `${base}${millisecondsText}${timezone.toUpperCase()}`
    const timestamp = Date.parse(normalizedValue)

    return Number.isNaN(timestamp) ? null : timestamp
  }

  const [datePart, timePart] = base.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes, seconds] = timePart.split(':').map(Number)
  const timestamp = Date.UTC(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
    millisecondsValue
  )

  if (Number.isNaN(timestamp)) return null

  const utcDate = new Date(timestamp)

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day ||
    utcDate.getUTCHours() !== hours ||
    utcDate.getUTCMinutes() !== minutes ||
    utcDate.getUTCSeconds() !== seconds ||
    utcDate.getUTCMilliseconds() !== millisecondsValue
  ) {
    return null
  }

  return timestamp
}

function isFutureTime(timestamp) {
  if (timestamp == null) return false

  return timestamp > Date.now()
}

export function normaliseCanteenState(raw) {
  const source = extractCanteenPayload(raw)
  const closingSoonUntil = source.closingSoonUntil ?? null
  const closingSoonUntilMs = parseCanteenTimestamp(closingSoonUntil)

  const status = String(source.status || CANTEEN_STATUS.CLOSED)
    .trim()
    .toUpperCase()

  return {
    status,
    closingSoonUntil,
    closingSoonUntilMs,
    kitchenReady: Boolean(source.kitchenReady),
    managerReady: Boolean(source.managerReady),
  }
}

export function getCanteenView(state) {
  const canOrder = state.status === CANTEEN_STATUS.OPEN
  const canOperate =
    state.status === CANTEEN_STATUS.OPEN ||
    state.status === CANTEEN_STATUS.CLOSING
  const isOpen = canOrder
  const isOpening = state.status === CANTEEN_STATUS.OPENING
  const isClosed = state.status === CANTEEN_STATUS.CLOSED
  const isClosing = state.status === CANTEEN_STATUS.CLOSING
  const closingSoonUntilMs =
    state.closingSoonUntilMs ?? parseCanteenTimestamp(state.closingSoonUntil)
  const isClosingSoon = canOrder && isFutureTime(closingSoonUntilMs)
  const orderingCopy = getOrderingCopy(state.status)

  const closingSoonCopy = isClosingSoon
    ? {
        orderBlockedMessage: '',
        orderActionLabel: 'Add to Cart',
        checkoutActionLabel: 'Place Order',
        orderNoticeTitle: 'Canteen is closing soon',
        orderNoticeDescription: 'Place your order before time runs out.',
      }
    : {}

  return {
    ...state,
    closingSoonUntilMs,
    canOrder,
    canOperate,
    isOpen,
    isOpening,
    isClosed,
    isClosing,
    isClosingSoon,
    ...orderingCopy,
    ...closingSoonCopy,
  }
}

export const canteenService = {
  async getState(config) {
    const raw = await api.get(ENDPOINTS.CANTEEN, config)
    return normaliseCanteenState(raw)
  },

  async setOpening() {
    return api.post(ENDPOINTS.CANTEEN_OPENING)
  },

  async setOpen() {
    return api.post(ENDPOINTS.CANTEEN_OPEN)
  },

  async setClosingSoon() {
    return api.post(ENDPOINTS.CANTEEN_CLOSING_SOON)
  },

  async setClosing() {
    return api.post(ENDPOINTS.CANTEEN_CLOSING)
  },

  async setClosed() {
    return api.post(ENDPOINTS.CANTEEN_CLOSED)
  },
}
