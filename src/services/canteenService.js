import api from './api'
import { ENDPOINTS } from '@/utils/constants'

export const CANTEEN_STATUS = {
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
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
  const isClosingSoon =
    state.status === CANTEEN_STATUS.OPEN && Boolean(state.closingSoonUntil)

  return {
    ...state,
    canOrder: state.status === CANTEEN_STATUS.OPEN,
    isOpening: state.status === CANTEEN_STATUS.OPENING,
    isClosed: state.status === CANTEEN_STATUS.CLOSED,
    isClosing: state.status === CANTEEN_STATUS.CLOSING,
    isClosingSoon,
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