import { useMemo, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { forgotPassword } = useAuth()

  const initialEmail = useMemo(
    () => location.state?.email?.trim?.() || '',
    [location.state]
  )

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const validateEmailStep = () => {
    const nextErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Email is required'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()
    if (!validateEmailStep()) return

    setLoading(true)

    try {
      const normalizedEmail = email.trim()

      await forgotPassword(normalizedEmail)
      toast.success('OTP sent successfully')

      navigate('/reset-password', {
        replace: false,
        state: { email: normalizedEmail },
      })
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
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
            🔐
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Forgot Password
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Enter your email to receive an OTP
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              id="forgot-email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              icon="✉️"
              autoComplete="email"
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
              size="lg"
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Back to{' '}
            <Link
              to="/login"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
