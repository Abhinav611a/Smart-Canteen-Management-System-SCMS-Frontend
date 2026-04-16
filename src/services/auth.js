import api from './api'
import { ENDPOINTS } from '@/utils/constants'

export function normaliseRole(backendRole) {
  return backendRole ? String(backendRole).toUpperCase() : 'USER'
}

export function normaliseUser(rawUser = {}) {
  return {
    id: rawUser.id,
    name:
      rawUser.name ||
      rawUser.fullName ||
      rawUser.username ||
      rawUser.email ||
      'User',
    email: rawUser.email,
    role: normaliseRole(rawUser.role),
    walletAddress: rawUser.walletAddress ?? null,
    active: rawUser.active ?? true,
  }
}

export const OTP_TYPES = {
  VERIFY_EMAIL: 'VERIFY_EMAIL',
  RESET_PASSWORD: 'RESET_PASSWORD',
}

export const authService = {
  async login({ email, password }) {
    const data = await api.post(ENDPOINTS.LOGIN, { email, password })

    return {
      token: data?.accessToken || null,
      refreshToken: data?.refreshToken || null,
      user: data?.user ? normaliseUser(data.user) : { email },
    }
  },

  async register({ name, email, password }) {
    const data = await api.post(ENDPOINTS.REGISTER, {
      name,
      email,
      password,
    })

    return {
      ...data,
      email,
      user: data ? normaliseUser(data) : null,
    }
  },

  async verifyEmail({ email, otp }) {
    return await api.post(
      `${ENDPOINTS.VERIFY_EMAIL}?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      {},
      {
        headers: {
          Authorization: undefined,
        },
      }
    )
  },

  async getCurrentUser() {
    const data = await api.get(ENDPOINTS.ME)
    return normaliseUser(data)
  },

  async logout() {
    try {
      return await api.post(ENDPOINTS.LOGOUT)
    } catch {
      return null
    }
  },

  async forgotPassword(email) {
    const data = await api.post(ENDPOINTS.FORGOT_PASSWORD, { email })

    return {
      ...data,
      email,
    }
  },

  async resendOtp({ email, type = OTP_TYPES.VERIFY_EMAIL }) {
    return await api.post(
      `${ENDPOINTS.RESEND_OTP}?email=${encodeURIComponent(email)}&type=${encodeURIComponent(type)}`,
      {},
      {
        headers: {
          Authorization: undefined,
        },
      }
    )
  },

  async resetPassword({ email, otp, newPassword }) {
    return await api.post(ENDPOINTS.RESET_PASSWORD, {
      email,
      otp,
      newPassword,
    })
  },
}
