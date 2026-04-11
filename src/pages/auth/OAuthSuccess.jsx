import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/auth'
import { apiClient } from '@/services/api'
import { getRoleHome } from '@/utils/helpers'

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
      const error = params.get('error')

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
        // IMPORTANT: set token before fetching current user
        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`

        let user = null

        for (let i = 0; i < 2; i++) {
          try {
            user = await authService.getCurrentUser()
            if (user) break
          } catch (err) {
            if (i === 1) throw err
            await new Promise((resolve) => setTimeout(resolve, 300))
          }
        }

        if (!user) {
          throw new Error('Failed to fetch user profile')
        }

        const authenticatedUser = completeOAuthLogin(token, user)

        toast.success(`Welcome, ${authenticatedUser.name || 'User'}!`)

        const redirectPath = getRoleHome(authenticatedUser.role) || '/'
        window.location.replace(redirectPath)
      } catch (error) {
        console.error('OAuth success handling failed:', error)

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