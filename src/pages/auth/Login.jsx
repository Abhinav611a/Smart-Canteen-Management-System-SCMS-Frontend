import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { getRoleHome } from '@/utils/helpers'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { BACKEND_URL } from '@/utils/constants'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.5 2.4-7.3 2.4-5.2 0-9.6-3.3-11.1-8l-6.5 5C9.7 39.6 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.4-6 6.8l.1-.1 6.2 5.2C35.2 40.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const GOOGLE_LOGIN_URL = `${BACKEND_URL}/oauth2/authorization/google`

  const validate = () => {
    const nextErrors = {}

    if (!form.email) nextErrors.email = 'Email is required'
    if (!form.password) nextErrors.password = 'Password is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const user = await login(form)
      navigate(getRoleHome(user.role), { replace: true })
    } catch (error) {
      toast.error(error.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_LOGIN_URL
  }

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-glow">
            🍽
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            CanteenDAO
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Smart Canteen Management
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              error={errors.email}
              icon="✉️"
              autoComplete="email"
            />

            <Input
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              error={errors.password}
              icon="🔒"
              autoComplete="current-password"
              showPasswordToggle
            />

            <div className="flex justify-end -mt-2">
              <Link
                to="/forgot-password"
                className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              loading={loading}
              disabled={loading}
              size="lg"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="relative flex items-center my-5">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="mx-3 text-xs text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-full py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            No account?{' '}
            <Link
              to="/register"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Connected to{' '}
          <span className="font-mono">
            smart-canteen-backend-k235.onrender.com
          </span>
        </p>
      </motion.div>
    </div>
  )
}