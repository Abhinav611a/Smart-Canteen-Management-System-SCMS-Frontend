import api from './api'
import { ENDPOINTS } from '@/utils/constants'

export const CANTEEN_STATUS = {
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
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

export function normaliseCanteenState(raw) {
  const source = raw ?? {}

  const status = String(source.status || CANTEEN_STATUS.CLOSED)
    .trim()
    .toUpperCase()

  return {
    status,
    closingSoonUntil: source.closingSoonUntil ?? null,
    kitchenReady: Boolean(source.kitchenReady),
    managerReady: Boolean(source.managerReady),
  }
}

export function getCanteenView(state) {
  const isOpen = state.status === CANTEEN_STATUS.OPEN
  const isOpening = state.status === CANTEEN_STATUS.OPENING
  const isClosed = state.status === CANTEEN_STATUS.CLOSED
  const isClosing = state.status === CANTEEN_STATUS.CLOSING
  const isClosingSoon =
    isOpen && Boolean(state.closingSoonUntil) && new Date(state.closingSoonUntil) > new Date()
  const orderingCopy = getOrderingCopy(state.status)

  // Override for closing-soon phase
  const closingSoonCopy = isClosingSoon ? {
    statusLabel: 'Closing Soon',
    orderBlockedMessage: '',
    orderActionLabel: 'Add to Cart',
    checkoutActionLabel: 'Place Order',
    orderNoticeTitle: 'Canteen is closing soon',
    orderNoticeDescription: 'Place your order before time runs out.',
  } : {}

  return {
    ...state,
    canOrder: isOpen,
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
  async getState() {
    const raw = await api.get(ENDPOINTS.CANTEEN)
    const canteen = raw?.data?.data ?? raw?.data ?? raw ?? {}
    return normaliseCanteenState(canteen)
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
