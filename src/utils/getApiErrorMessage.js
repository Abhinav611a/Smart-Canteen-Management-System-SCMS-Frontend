import axios from 'axios'

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}

const LOGIN_ERROR_MESSAGES = {
  canteenClosed:
    "Canteen is currently closed. Manager and kitchen login is unavailable while it is closed. Please follow your application's canteen-opening process or contact an administrator for assistance.",
  credentials:
    'Invalid email or password. Please check your details and try again.',
  verification:
    'Verify this email before signing in. Use the verification flow to request or resend an OTP.',
  network:
    'Unable to connect to the server. Please check your internet connection and try again.',
  server:
    'Something went wrong while signing you in. Please try again later.',
  badRequest: 'Please check your email and password and try again.',
  forbidden:
    'You cannot sign in with this account right now. Please contact an administrator for assistance.',
  fallback: 'Unable to sign in. Please try again later.',
}

function getResponseMessages(body) {
  if (typeof body === 'string') {
    const text = body.trim()

    if (text.startsWith('{')) {
      try {
        return getResponseMessages(JSON.parse(text))
      } catch {
        return text ? [text] : []
      }
    }

    return text ? [text] : []
  }

  if (!body || typeof body !== 'object') return []

  return [body.message, body.error].filter(
    (message) => typeof message === 'string' && message.trim(),
  ).map((message) => message.trim())
}

function isSafeLoginMessage(message) {
  return (
    message.length <= 180 &&
    !/[<>]/.test(message) &&
    !/\b(exception|stack trace|sqlstate|hibernate|org\.springframework)\b/i.test(message) &&
    !/\bat\s+[\w.$]+\s*\(|\.java:\d+/.test(message)
  )
}

export function getLoginErrorMessage(error) {
  const response = error?.response
  const status = response?.status
  const messages = getResponseMessages(response?.data)
  const normalizedMessages = messages.map((message) => message.toLowerCase())

  if (normalizedMessages.some((message) => /canteen.{0,80}closed|closed.{0,80}canteen/.test(message))) {
    return LOGIN_ERROR_MESSAGES.canteenClosed
  }

  if (normalizedMessages.some((message) => /verify.{0,40}email|email.{0,40}(not verified|verification required)/.test(message))) {
    return LOGIN_ERROR_MESSAGES.verification
  }

  if (normalizedMessages.some((message) => /invalid (email or )?password|incorrect (email|password)|bad credentials|user not found/.test(message))) {
    return LOGIN_ERROR_MESSAGES.credentials
  }

  if (!response && (axios.isAxiosError(error) || error?.request || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED')) {
    return LOGIN_ERROR_MESSAGES.network
  }

  if (status === 401 || status === 404) return LOGIN_ERROR_MESSAGES.credentials
  if (status === 400) return LOGIN_ERROR_MESSAGES.badRequest
  if (status === 403) return LOGIN_ERROR_MESSAGES.forbidden
  if (typeof status === 'number' && status >= 500) return LOGIN_ERROR_MESSAGES.server

  const safeMessage = messages.find(isSafeLoginMessage)
  return safeMessage || LOGIN_ERROR_MESSAGES.fallback
}