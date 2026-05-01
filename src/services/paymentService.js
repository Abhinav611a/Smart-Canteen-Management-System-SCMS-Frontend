import api from './api'
import { normaliseOrder } from './orders'
import { ENDPOINTS } from '@/utils/constants'

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js'
const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

export async function createPaymentOrder(payload) {
  return api.post(ENDPOINTS.PAYMENTS_CREATE_ORDER, payload)
}

export async function verifyPayment(payload) {
  const raw = await api.post(ENDPOINTS.PAYMENTS_VERIFY, payload)
  return normaliseOrder(raw)
}

export function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout is unavailable.'))
  }

  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID)
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(true), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Razorpay checkout.')),
        { once: true },
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = RAZORPAY_SCRIPT_ID
    script.src = RAZORPAY_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'))
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout(paymentData, callbacks = {}) {
  await loadRazorpayScript()

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout did not load.')
  }

  const options = {
    key: paymentData.keyId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    order_id: paymentData.razorpayOrderId,
    name: 'Smart Canteen',
    description: 'Canteen order payment',
    prefill: callbacks.prefill,
    handler: async (response) => {
      try {
        await callbacks.onSuccess?.(response)
      } catch (error) {
        callbacks.onError?.(error)
      }
    },
    modal: {
      ondismiss: () => {
        callbacks.onDismiss?.()
      },
    },
  }

  const checkout = new window.Razorpay(options)
  checkout.open()
  return checkout
}
