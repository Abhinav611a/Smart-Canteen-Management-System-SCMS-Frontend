import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/services/api'
import { getRoleHome } from '@/utils/helpers'
import { LS_KEYS } from '@/utils/constants'

export default function OAuthSuccess() {
  const navigate = useNavigate()
  const hasRun = useRef(false)
  const { completeOAuthLogin } = useAuth()

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const handleOAuthSuccess = async () => {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const refreshToken = params.get('refreshToken')
      const error = params.get('error')

      console.log('[OAUTH] URL', window.location.href)
      console.log('[OAUTH] token exists:', !!token)
      console.log('[OAUTH] refreshToken exists:', !!refreshToken)

      if (error) {
        toast.error('Google sign-in failed')
        navigate('/login', { replace: true })
        return
      }

      if (!token || token.trim().length < 20) {
        toast.error('Invalid authentication token')
        navigate('/login', { replace: true })
        return
      }

      try {
        sessionStorage.setItem(LS_KEYS.JWT, token)

        if (refreshToken && refreshToken.trim().length > 10) {
          sessionStorage.setItem(LS_KEYS.REFRESH_TOKEN, refreshToken)
        } else {
          sessionStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
        }

        const user = await apiClient.get('/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!user) {
          throw new Error('Failed to fetch user profile')
        }

        const authenticatedUser = await completeOAuthLogin(
          token,
          user,
          refreshToken || null,
        )

        window.history.replaceState({}, document.title, '/oauth-success')

        const redirectPath = getRoleHome(authenticatedUser?.role) || '/'
        window.location.replace(redirectPath)
      } catch (error) {
        console.error('OAuth success handling failed:', error)

        sessionStorage.removeItem(LS_KEYS.JWT)
        sessionStorage.removeItem(LS_KEYS.USER)
        sessionStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
        sessionStorage.removeItem(LS_KEYS.TOKEN_EXPIRY)
        delete apiClient.defaults.headers.common.Authorization

        toast.error(error?.message || 'Google sign-in failed')
        navigate('/login', { replace: true })
      }
    }

    handleOAuthSuccess()
  }, [navigate, completeOAuthLogin])

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh-light dark:bg-mesh-dark">
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3 animate-spin">🔄</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Completing Google Sign-In
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Please wait...
        </p>
      </div>
    </div>
  )
}